/**
 * Local notification strategy (docs/03 §7, 05): random pop-quiz review
 * prompts within allowed windows (default 9am–9pm, max 2/day), plus a
 * streak-guard nudge in the evening. Copy is encouraging, never guilt
 * (docs/06 §6). All scheduling is local; reschedule on every app
 * foreground / session completion.
 */
import * as Notifications from 'expo-notifications';
import { eq } from 'drizzle-orm';

import { db, tables } from '@/services/db';
import { countDueReviews } from '@/services/db/repos/reviews';
import { loadStreak, localToday } from '@/services/db/repos/streaks';
import { streakDisplay } from '@/services/streaks';

const ENABLED_KEY = 'notificationsEnabled';
export const POP_QUIZ_PREFIX = 'popquiz';
export const STREAK_GUARD_ID = 'streak-guard';

/** Allowed window (quiet hours outside): 9:00–21:00, max 2/day (03 §7). */
const WINDOW_START_HOUR = 9;
const WINDOW_END_HOUR = 21;
const MAX_PER_DAY = 2;
const DAYS_AHEAD = 3;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function notificationsEnabled(): Promise<boolean> {
  const rows = await db
    .select()
    .from(tables.settings)
    .where(eq(tables.settings.key, ENABLED_KEY))
    .limit(1);
  return rows[0]?.value === 'true';
}

export async function setNotificationsEnabled(enabled: boolean): Promise<boolean> {
  if (enabled) {
    const perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return false;
  }
  await db
    .insert(tables.settings)
    .values({ key: ENABLED_KEY, value: String(enabled) })
    .onConflictDoUpdate({ target: tables.settings.key, set: { value: String(enabled) } });
  if (enabled) await rescheduleAll();
  else await Notifications.cancelAllScheduledNotificationsAsync();
  return true;
}

/**
 * Cancels and re-plans everything. Cheap enough to call on every app
 * foreground and after each practice/review session.
 */
export async function rescheduleAll(): Promise<void> {
  if (!(await notificationsEnabled())) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  await schedulePopQuizzes();
  await scheduleStreakGuard();
}

/** Deterministic-enough random times inside the allowed window. */
function randomTimeInWindow(dayOffset: number, slot: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  // Split the window into MAX_PER_DAY slots so quizzes spread out.
  const windowHours = WINDOW_END_HOUR - WINDOW_START_HOUR;
  const slotHours = windowHours / MAX_PER_DAY;
  const hour = WINDOW_START_HOUR + slot * slotHours + Math.random() * slotHours;
  date.setHours(Math.floor(hour), Math.floor(Math.random() * 60), 0, 0);
  return date;
}

async function schedulePopQuizzes(): Promise<void> {
  const memorizedCount = await db
    .select({ id: tables.reviewItems.id })
    .from(tables.reviewItems);
  if (memorizedCount.length === 0) return; // nothing to quiz yet

  const now = Date.now();
  for (let day = 0; day < DAYS_AHEAD; day++) {
    for (let slot = 0; slot < MAX_PER_DAY; slot++) {
      const when = randomTimeInWindow(day, slot);
      if (when.getTime() <= now + 60_000) continue; // skip past times today
      await Notifications.scheduleNotificationAsync({
        identifier: `${POP_QUIZ_PREFIX}-${day}-${slot}`,
        content: {
          title: 'Pop quiz',
          body: 'A verse you’ve hidden is ready to shine. 30 seconds?',
          data: { url: '/review', source: 'popquiz' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
      });
    }
  }
}

async function scheduleStreakGuard(): Promise<void> {
  const streak = streakDisplay(await loadStreak(), localToday());
  if (streak.current === 0) return;

  const today = new Date();
  const guardTime = new Date(today);
  guardTime.setHours(20, 0, 0, 0);

  // If today is already secured, guard tomorrow evening instead.
  if (streak.activeToday || guardTime.getTime() <= Date.now()) {
    guardTime.setDate(guardTime.getDate() + 1);
  }

  const dueCount = await countDueReviews();
  await Notifications.scheduleNotificationAsync({
    identifier: STREAK_GUARD_ID,
    content: {
      title: `${streak.current}-day streak`,
      body:
        dueCount > 0
          ? `A quick review keeps it going — ${dueCount} ${dueCount === 1 ? 'verse is' : 'verses are'} ready.`
          : 'A minute of practice keeps it going.',
      data: { url: '/review', source: 'streakGuard' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: guardTime },
  });
}
