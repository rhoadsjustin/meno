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
import { AndroidImportance } from 'expo-notifications';
import { asc, eq } from 'drizzle-orm';
import { Platform } from 'react-native';

import { t } from '@/i18n';

import { db, tables } from '@/services/db';
import { adventFor, adventNoticeDays } from '@/services/advent';
import {
  adventDismissed,
  recapNoticeAt,
  recapSeen,
  setRecapNoticeAt,
} from '@/services/db/repos/appFlags';
import { goalByChallengeId, listActiveGoals } from '@/services/db/repos/goals';
import { countDueReviews } from '@/services/db/repos/reviews';
import { loadStreak, localToday } from '@/services/db/repos/streaks';
import { activeDaysIn } from '@/services/db/repos/wrapped';
import type { RefRange } from '@/services/bible/types';
import {
  CHANNEL_IDS,
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
import { RECAP_MIN_DAYS, recapYearFor } from '@/services/wrapped';

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
  // Android 13+ only shows the permission prompt once a channel exists.
  if (enabled) await ensureChannels();
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
  const today = localToday();
  const streak = streakDisplay(streakState, today);
  return {
    nextReview: await nextReviewState(),
    recapNotice: await recapNoticeState(today),
    adventNotices: await adventNoticeState(today),
    reminderTime: time,
    hasPractice: goals.length > 0 || dueCount > 0,
    practicedToday: streak.activeToday,
    streak: streak.current,
    dueCount,
    hasMemorized: reviewItems.length > 0,
  };
}

type PlanState = Awaited<ReturnType<typeof readPlanState>>;

/** The review due longest — the verse `/review` opens on — for the quiz title. */
async function nextReviewState(): Promise<{ range: RefRange; dueAt: Date } | null> {
  const items = await db
    .select()
    .from(tables.reviewItems)
    .orderBy(asc(tables.reviewItems.dueAt))
    .limit(1);
  const item = items[0];
  if (!item) return null;
  const chunks = await db
    .select()
    .from(tables.chunks)
    .where(eq(tables.chunks.id, item.chunkId))
    .limit(1);
  const c = chunks[0];
  if (!c) return null;
  return {
    dueAt: item.dueAt,
    range: {
      start: { bookId: c.startBookId, chapter: c.startChapter, verse: c.startVerse },
      end: { bookId: c.endBookId, chapter: c.endChapter, verse: c.endVerse },
    },
  };
}

/**
 * The December Year in the Word notice (docs/10 §5.5): only in December,
 * only once the recap is ready, and never after it has been opened.
 */
async function recapNoticeState(today: string): Promise<{ year: number; plannedFor: Date | null } | null> {
  const year = recapYearFor(today);
  if (year === null || !today.startsWith(`${year}-12-`)) return null;
  if (await recapSeen(year)) return null;
  if ((await activeDaysIn(year)) < RECAP_MIN_DAYS) return null;
  return { year, plannedFor: await recapNoticeAt(year) };
}

/**
 * Advent notices (docs/11 §3.2), in season only: each Sunday's line names
 * that week's verses on the full plan, and the whole passage on the short one.
 */
async function adventNoticeState(today: string) {
  const plan = adventFor(today);
  if (!plan) return [];
  const [main, short, dismissed] = await Promise.all([
    goalByChallengeId(plan.main.code),
    goalByChallengeId(plan.short.code),
    adventDismissed(plan.year),
  ]);
  const goal = main ?? short;
  const joined = goal?.status === 'active';
  // A finished or stopped Advent goal needs neither a weekly line nor an invitation.
  if (goal && !joined) return [];
  return adventNoticeDays(plan, { joined, dismissed }).map(({ date, week }) => ({
    year: plan.year,
    date,
    week,
    range: week === 0 ? plan.main.range : main ? plan.weeks[week - 1] : plan.short.range,
  }));
}

/**
 * Android files every notification under a channel the user can mute or
 * tune on its own in Settings: one for the daily reminder, one for pop
 * quizzes, one for the seasonal notices (Year in the Word, Advent). All pop
 * up on screen, as iOS banners do. Named in the UI language; recreating a
 * channel only renames it, so this runs before each plan and keeps the names
 * current.
 */
const CHANNELS = CHANNEL_IDS;

async function ensureChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Promise.all([
    Notifications.setNotificationChannelAsync(CHANNELS.practice, {
      name: t('notifications:status.titlePractice'),
      importance: AndroidImportance.HIGH,
    }),
    Notifications.setNotificationChannelAsync(CHANNELS.popQuiz, {
      name: t('notifications:status.titlePopQuiz'),
      importance: AndroidImportance.HIGH,
    }),
    Notifications.setNotificationChannelAsync(CHANNELS.recap, {
      name: t('notifications:channel.seasonal'),
      importance: AndroidImportance.HIGH,
    }),
  ]);
}

/** Hands iOS a fresh plan, or clears it when nothing may be delivered. */
async function applyPlan(state?: PlanState): Promise<void> {
  if (!(await notificationsEnabled()) || (await permission()) !== 'granted') {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return;
  }
  const input = state ?? (await readPlanState());
  const plan = planNotifications({ now: new Date(), ...input });
  // The recap notice is planned once; later plans reuse its time.
  const recap = plan.find((p) => p.kind === 'recap');
  if (recap && input.recapNotice && !input.recapNotice.plannedFor) {
    await setRecapNoticeAt(input.recapNotice.year, recap.at);
  }
  await ensureChannels();

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
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: item.at,
        channelId: CHANNELS[item.kind],
      },
    });
  }
}

/**
 * Cancels and re-plans everything. Cheap enough to call on every app
 * foreground and after each practice/review session. Pending notifications
 * carry their text baked in, so re-planning from scratch is also what moves
 * them to a new UI language: iOS relaunches Meno on a language change and
 * the root layout calls this on launch.
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
