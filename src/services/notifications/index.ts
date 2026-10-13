/**
 * Local notification strategy (docs/03 §7, 05): a daily practice reminder at
 * the user's chosen time plus random pop-quiz review prompts, max 2/day in
 * all. What gets planned is decided in `plan.ts` (pure, unit-tested); this
 * file reads the app state and hands the plan to iOS. All scheduling is
 * local; reschedule on every app foreground / session completion.
 *
 * Whether any of it will reach the user is answered in one place:
 * `loadReminderStatus` (rules in `status.ts`, also pure). Screens read that
 * rather than checking the switch or the permission themselves.
 */
import * as Notifications from 'expo-notifications';
import { eq } from 'drizzle-orm';

import { db, tables } from '@/services/db';
import { listActiveGoals } from '@/services/db/repos/goals';
import { countDueReviews } from '@/services/db/repos/reviews';
import { loadStreak, localToday } from '@/services/db/repos/streaks';
import {
  formatReminderTime,
  parseReminderTime,
  planNotifications,
  type ReminderTime,
} from '@/services/notifications/plan';
import {
  reminderStatus,
  type ReminderPermission,
  type ReminderStatus,
  type ScheduledReminder,
} from '@/services/notifications/status';
import { streakDisplay } from '@/services/streaks';

export { DEFAULT_REMINDER_TIME, type ReminderTime } from '@/services/notifications/plan';
export {
  describeReminders,
  reminderSummary,
  type ReminderLine,
  type ReminderStatus,
} from '@/services/notifications/status';

const ENABLED_KEY = 'notificationsEnabled';
const REMINDER_TIME_KEY = 'reminderTime';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function readSetting(key: string): Promise<string | undefined> {
  const rows = await db.select().from(tables.settings).where(eq(tables.settings.key, key)).limit(1);
  return rows[0]?.value;
}

async function writeSetting(key: string, value: string): Promise<void> {
  await db
    .insert(tables.settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: tables.settings.key, set: { value } });
}

export async function notificationsEnabled(): Promise<boolean> {
  return (await readSetting(ENABLED_KEY)) === 'true';
}

const listeners = new Set<() => void>();

/** Runs `listener` whenever the switch, the time or the schedule changes. */
export function onRemindersChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyChanged(): void {
  for (const listener of listeners) listener();
}

async function permission(): Promise<ReminderPermission> {
  const perm = await Notifications.getPermissionsAsync();
  if (perm.granted) return 'granted';
  return perm.canAskAgain ? 'undetermined' : 'denied';
}

/**
 * Flips the Reminders switch. Turning it on asks iOS for permission (the
 * system prompt shows only the first time) and resolves to whether iOS will
 * deliver. The switch stays on either way: a user who said yes in Meno and
 * no to iOS is "blocked", which every screen spells out, and reminders start
 * by themselves once notifications are allowed in iPhone Settings.
 */
export async function setNotificationsEnabled(enabled: boolean): Promise<boolean> {
  const granted = enabled ? (await Notifications.requestPermissionsAsync()).granted : true;
  await writeSetting(ENABLED_KEY, String(enabled));
  await rescheduleAll();
  return granted;
}

/**
 * True when reminders are switched on in Meno but iOS will not deliver them
 * (permission declined or later revoked in iPhone Settings).
 */
export async function notificationsBlocked(): Promise<boolean> {
  if (!(await notificationsEnabled())) return false;
  return !(await Notifications.getPermissionsAsync()).granted;
}

/** When the daily practice reminder arrives. */
export async function reminderTime(): Promise<ReminderTime> {
  return parseReminderTime(await readSetting(REMINDER_TIME_KEY));
}

export async function setReminderTime(time: ReminderTime): Promise<void> {
  await writeSetting(REMINDER_TIME_KEY, formatReminderTime(time));
  await rescheduleAll();
}

/** The app state the planner and the status both look at. */
async function readPlanState() {
  const [time, goals, dueCount, streakState, reviewItems] = await Promise.all([
    reminderTime(),
    listActiveGoals(),
    countDueReviews(),
    loadStreak(),
    db.select({ id: tables.reviewItems.id }).from(tables.reviewItems).limit(1),
  ]);
  const streak = streakDisplay(streakState, localToday());
  return {
    reminderTime: time,
    hasPractice: goals.length > 0 || dueCount > 0,
    practicedToday: streak.activeToday,
    streak: streak.current,
    dueCount,
    hasMemorized: reviewItems.length > 0,
  };
}

type PlanState = Awaited<ReturnType<typeof readPlanState>>;

/** Hands iOS a fresh plan, or clears it when nothing may be delivered. */
async function applyPlan(state?: PlanState): Promise<void> {
  if (!(await notificationsEnabled()) || (await permission()) !== 'granted') {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return;
  }
  const plan = planNotifications({ now: new Date(), ...(state ?? (await readPlanState())) });

  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const item of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: item.id,
      content: {
        title: item.title,
        body: item.body,
        // `at` lets the status read back when each one fires without
        // depending on how iOS reports its trigger.
        data: { url: item.url, source: item.kind, at: item.at.getTime() },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.at },
    });
  }
}

/**
 * Cancels and re-plans everything. Cheap enough to call on every app
 * foreground and after each practice/review session.
 */
export async function rescheduleAll(): Promise<void> {
  try {
    await applyPlan();
  } catch {
    // iOS refused (it can still report "denied" for a moment after the user
    // allows notifications). The status reads what is really pending, so a
    // failed plan shows up there instead of as an unhandled rejection.
  } finally {
    notifyChanged();
  }
}

async function readScheduled(): Promise<ScheduledReminder[]> {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  return pending.flatMap((request) => {
    const at = request.content.data?.at;
    return typeof at === 'number' ? [{ id: request.identifier, at: new Date(at) }] : [];
  });
}

/**
 * Whether each kind of reminder will reach the user (`status.ts`), judged
 * against what iOS actually has pending rather than what should be there.
 */
export async function loadReminderStatus(): Promise<ReminderStatus> {
  const [enabled, perm, state] = await Promise.all([
    notificationsEnabled(),
    permission(),
    readPlanState(),
  ]);
  let scheduled = await readScheduled();
  // Nothing pending although something should be (first read after a
  // restore, or iOS dropped them): plan now rather than report a gap.
  if (
    enabled &&
    perm === 'granted' &&
    scheduled.length === 0 &&
    (state.hasPractice || state.hasMemorized)
  ) {
    try {
      await applyPlan(state);
    } catch {
      // Reported below as nothing scheduled.
    }
    scheduled = await readScheduled();
  }
  return reminderStatus({ now: new Date(), enabled, permission: perm, ...state, scheduled });
}
