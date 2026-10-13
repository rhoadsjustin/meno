/**
 * Local notification strategy (docs/03 §7, 05): a daily practice reminder at
 * the user's chosen time plus random pop-quiz review prompts, max 2/day in
 * all. What gets planned is decided in `plan.ts` (pure, unit-tested); this
 * file reads the app state and hands the plan to iOS. All scheduling is
 * local; reschedule on every app foreground / session completion.
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
import { streakDisplay } from '@/services/streaks';

export { DEFAULT_REMINDER_TIME, type ReminderTime } from '@/services/notifications/plan';

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

export async function setNotificationsEnabled(enabled: boolean): Promise<boolean> {
  if (enabled) {
    const perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return false;
  }
  await writeSetting(ENABLED_KEY, String(enabled));
  if (enabled) await rescheduleAll();
  else await Notifications.cancelAllScheduledNotificationsAsync();
  return true;
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

/**
 * Cancels and re-plans everything. Cheap enough to call on every app
 * foreground and after each practice/review session.
 */
export async function rescheduleAll(): Promise<void> {
  if (!(await notificationsEnabled())) return;
  const [time, goals, dueCount, streakState, reviewItems] = await Promise.all([
    reminderTime(),
    listActiveGoals(),
    countDueReviews(),
    loadStreak(),
    db.select({ id: tables.reviewItems.id }).from(tables.reviewItems).limit(1),
  ]);
  const streak = streakDisplay(streakState, localToday());
  const plan = planNotifications({
    now: new Date(),
    reminderTime: time,
    hasPractice: goals.length > 0 || dueCount > 0,
    practicedToday: streak.activeToday,
    streak: streak.current,
    dueCount,
    hasMemorized: reviewItems.length > 0,
  });

  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const item of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: item.id,
      content: {
        title: item.title,
        body: item.body,
        data: { url: item.url, source: item.kind },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.at },
    });
  }
}
