/**
 * What to schedule and when — the pure half of services/notifications
 * (docs/03 §7, 05 §2). No expo imports, so the rules are unit-tested:
 *
 * - A daily practice reminder at the user's chosen time, planned a week
 *   ahead so it keeps arriving when the app is not opened, and dropped for
 *   today once today is practiced.
 * - Pop quizzes at random times inside the 9am–9pm window, once there is a
 *   memorized verse to quiz.
 * - Never more than MAX_PER_DAY a day, the reminder included, and never two
 *   within three hours of each other.
 */

export type ReminderTime = { hour: number; minute: number };

export const DEFAULT_REMINDER_TIME: ReminderTime = { hour: 19, minute: 0 };

/** Allowed window for random quizzes (quiet hours outside). The reminder is
 * exempt: its time is the user's own pick. */
export const WINDOW_START_HOUR = 9;
export const WINDOW_END_HOUR = 21;
export const MAX_PER_DAY = 2;
export const DAYS_AHEAD = 7;
export const MIN_GAP_MS = 3 * 60 * 60 * 1000;

export const PRACTICE_PREFIX = 'practice';
export const POP_QUIZ_PREFIX = 'popquiz';

/** Anything due sooner than this is skipped rather than fired mid-tap. */
const LEAD_MS = 60_000;
const QUIZ_TRIES = 8;

export type PlannedNotification = {
  id: string;
  kind: 'practice' | 'popQuiz';
  at: Date;
  title: string;
  body: string;
  url: string;
};

export type PlanInput = {
  now: Date;
  reminderTime: ReminderTime;
  /** A passage is in progress or a review is due: there is something to
   * be reminded of. */
  hasPractice: boolean;
  practicedToday: boolean;
  /** Current streak, 0 when there is none to keep. */
  streak: number;
  dueCount: number;
  /** At least one memorized verse exists to quiz. */
  hasMemorized: boolean;
  random?: () => number;
};

export function parseReminderTime(raw: string | null | undefined): ReminderTime {
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw ?? '');
  if (!match) return DEFAULT_REMINDER_TIME;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return DEFAULT_REMINDER_TIME;
  return { hour, minute };
}

export function formatReminderTime(time: ReminderTime): string {
  return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
}

function atTime(now: Date, dayOffset: number, hour: number, minute: number): Date {
  const date = new Date(now);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function clearOf(at: Date, others: PlannedNotification[]): boolean {
  return others.every((o) => Math.abs(o.at.getTime() - at.getTime()) >= MIN_GAP_MS);
}

/** Copy is encouraging, never guilt (docs/06 §6). Only the next reminder can
 * speak for the streak — later ones cannot know whether it survived. */
function reminderCopy(input: PlanInput, isNext: boolean): { title: string; body: string } {
  if (isNext && input.streak > 0) {
    return {
      title: `${input.streak}-day streak`,
      body:
        input.dueCount > 0
          ? `A quick review keeps it going — ${input.dueCount} ${input.dueCount === 1 ? 'verse is' : 'verses are'} ready.`
          : 'A minute of practice keeps it going.',
    };
  }
  return {
    title: 'Time to practice',
    body: 'Your verse is waiting. A few minutes is plenty.',
  };
}

export function planNotifications(input: PlanInput): PlannedNotification[] {
  const random = input.random ?? Math.random;
  const earliest = input.now.getTime() + LEAD_MS;
  const planned: PlannedNotification[] = [];

  for (let day = 0; day < DAYS_AHEAD; day++) {
    let today = 0;

    if (input.hasPractice && !(day === 0 && input.practicedToday)) {
      const at = atTime(input.now, day, input.reminderTime.hour, input.reminderTime.minute);
      if (at.getTime() > earliest) {
        const isNext = !planned.some((p) => p.kind === 'practice');
        planned.push({
          id: `${PRACTICE_PREFIX}-${day}`,
          kind: 'practice',
          at,
          ...reminderCopy(input, isNext),
          url: '/',
        });
        today++;
      }
    }

    if (!input.hasMemorized) continue;
    const windowMinutes = (WINDOW_END_HOUR - WINDOW_START_HOUR) * 60;
    for (let slot = 0; today < MAX_PER_DAY; slot++) {
      let at: Date | null = null;
      for (let attempt = 0; attempt < QUIZ_TRIES && !at; attempt++) {
        const minutes = Math.floor(random() * windowMinutes);
        const candidate = atTime(input.now, day, WINDOW_START_HOUR, minutes);
        if (candidate.getTime() > earliest && clearOf(candidate, planned)) at = candidate;
      }
      if (!at) break; // no room left today
      planned.push({
        id: `${POP_QUIZ_PREFIX}-${day}-${slot}`,
        kind: 'popQuiz',
        at,
        title: 'Pop quiz',
        body: 'A verse you’ve hidden is ready to shine. 30 seconds?',
        url: '/review',
      });
      today++;
    }
  }

  return planned.sort((a, b) => a.at.getTime() - b.at.getTime());
}
