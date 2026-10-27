/**
 * Will each kind of reminder actually reach the user, and if not, why? The
 * one answer Settings, the setup guide, onboarding and Today all read
 * (docs/05 §2). Pure, like `plan.ts`: the caller supplies the Meno switch,
 * the iOS permission, the app state the planner looks at, and what iOS
 * really has scheduled.
 *
 * Three things a user thinks of, though only two kinds are ever scheduled:
 * the daily practice reminder, pop quizzes, and the streak reminder, which is
 * the next practice reminder carrying the streak count.
 *
 * What iOS holds back on its own (a Focus, Scheduled Summary) is invisible
 * to apps, so nothing here claims to know about it; the help text says so.
 */
import { locale, t } from '@/i18n';
import {
  POP_QUIZ_PREFIX,
  PRACTICE_PREFIX,
  WINDOW_END_HOUR,
  WINDOW_START_HOUR,
} from '@/services/notifications/plan';

export type ReminderKind = 'practice' | 'popQuiz' | 'streak';

export const REMINDER_KINDS: ReminderKind[] = ['practice', 'popQuiz', 'streak'];

/** iOS's answer for Meno: allowed, declined, or never asked. */
export type ReminderPermission = 'granted' | 'denied' | 'undetermined';

export type WaitingReason =
  /** No passage in progress and no review due. */
  | 'nothingToPractice'
  /** Pop quizzes need a memorized verse. */
  | 'nothingMemorized'
  /** The streak reminder needs a streak. */
  | 'noStreak'
  /** Should be scheduled, but iOS holds nothing of this kind right now. */
  | 'notScheduled';

export type ReminderState =
  /** Reminders are switched off in Meno. */
  | { state: 'off' }
  /** On in Meno, but iOS will not deliver. `canAsk`: iOS has never been
   * asked, so Meno can still show the system prompt. */
  | { state: 'blocked'; canAsk: boolean }
  /** On and permitted, but nothing will arrive yet. */
  | { state: 'waiting'; reason: WaitingReason }
  /** On, with the next one scheduled. */
  | { state: 'scheduled'; at: Date };

export type ReminderOverall = 'off' | 'blocked' | 'on';

export type ReminderStatus = {
  overall: ReminderOverall;
  /** Blocked only: Meno can still show the system prompt. */
  canAsk: boolean;
  practice: ReminderState;
  popQuiz: ReminderState;
  streak: ReminderState;
  streakCount: number;
  practicedToday: boolean;
};

/** A pending notification as iOS reports it: its identifier and fire time. */
export type ScheduledReminder = { id: string; at: Date };

export type StatusInput = {
  now: Date;
  /** The Reminders switch in Meno. */
  enabled: boolean;
  permission: ReminderPermission;
  /** Same meanings as `PlanInput`. */
  hasPractice: boolean;
  practicedToday: boolean;
  streak: number;
  hasMemorized: boolean;
  /** What iOS has pending (`getAllScheduledNotificationsAsync`). */
  scheduled: ScheduledReminder[];
};

function nextOf(prefix: string, input: StatusInput): Date | null {
  let next: Date | null = null;
  for (const item of input.scheduled) {
    if (!item.id.startsWith(`${prefix}-`)) continue;
    if (item.at.getTime() <= input.now.getTime()) continue;
    if (!next || item.at.getTime() < next.getTime()) next = item.at;
  }
  return next;
}

export function reminderStatus(input: StatusInput): ReminderStatus {
  const base = { streakCount: input.streak, practicedToday: input.practicedToday };

  if (!input.enabled) {
    const off: ReminderState = { state: 'off' };
    return { overall: 'off', canAsk: false, practice: off, popQuiz: off, streak: off, ...base };
  }
  if (input.permission !== 'granted') {
    const canAsk = input.permission === 'undetermined';
    const blocked: ReminderState = { state: 'blocked', canAsk };
    return {
      overall: 'blocked',
      canAsk,
      practice: blocked,
      popQuiz: blocked,
      streak: blocked,
      ...base,
    };
  }

  const scheduledOr = (at: Date | null): ReminderState =>
    at ? { state: 'scheduled', at } : { state: 'waiting', reason: 'notScheduled' };
  const nextPractice = nextOf(PRACTICE_PREFIX, input);

  const practice: ReminderState = input.hasPractice
    ? scheduledOr(nextPractice)
    : { state: 'waiting', reason: 'nothingToPractice' };

  const popQuiz: ReminderState = input.hasMemorized
    ? scheduledOr(nextOf(POP_QUIZ_PREFIX, input))
    : { state: 'waiting', reason: 'nothingMemorized' };

  // The streak count rides on the next practice reminder (plan.ts).
  const streak: ReminderState =
    input.streak <= 0
      ? { state: 'waiting', reason: 'noStreak' }
      : input.hasPractice
        ? scheduledOr(nextPractice)
        : { state: 'waiting', reason: 'nothingToPractice' };

  return { overall: 'on', canAsk: false, practice, popQuiz, streak, ...base };
}

/** How a line reads at a glance; always paired with words, never color alone. */
export type ReminderTone = 'ok' | 'muted' | 'problem';

export type ReminderLine = {
  kind: ReminderKind;
  title: string;
  /** Plain words: when the next one comes, or why none will and what to do. */
  detail: string;
  tone: ReminderTone;
};

export type DescribeOptions = {
  now: Date;
  /** Clock formatter; defaults to the device's own (12 or 24 hour). */
  formatTime?: (at: Date) => string;
};

function titleOf(kind: ReminderKind): string {
  switch (kind) {
    case 'practice':
      return t('notifications:status.titlePractice');
    case 'popQuiz':
      return t('notifications:status.titlePopQuiz');
    case 'streak':
      return t('notifications:status.titleStreak');
  }
}

function deviceTime(at: Date): string {
  return at.toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' });
}

function hourLabel(hour: number, formatTime: (at: Date) => string): string {
  const at = new Date(2026, 0, 1, hour, 0, 0, 0);
  return formatTime(at);
}

/** "today", "tomorrow", or "on Thursday" (the plan reaches a week ahead). */
export function dayPhrase(at: Date, now: Date): string {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(at) - startOf(now)) / (24 * 60 * 60 * 1000));
  if (days <= 0) return t('notifications:status.dayToday');
  if (days === 1) return t('notifications:status.dayTomorrow');
  const weekday = new Intl.DateTimeFormat(locale(), { weekday: 'long' }).format(at);
  return t('notifications:status.dayOn', { weekday });
}

function waitingDetail(kind: ReminderKind, reason: WaitingReason): string {
  switch (reason) {
    case 'nothingMemorized':
      return t('notifications:status.waitingNothingMemorized');
    case 'noStreak':
      return t('notifications:status.waitingNoStreak');
    case 'nothingToPractice':
      return kind === 'streak'
        ? t('notifications:status.waitingNothingToPracticeStreak')
        : t('notifications:status.waitingNothingToPractice');
    case 'notScheduled':
      return t('notifications:status.waitingNotScheduled');
  }
}

export function describeReminder(
  kind: ReminderKind,
  status: ReminderStatus,
  options: DescribeOptions,
): ReminderLine {
  const formatTime = options.formatTime ?? deviceTime;
  const entry = status[kind];
  const title = titleOf(kind);

  switch (entry.state) {
    case 'off':
      return { kind, title, detail: t('notifications:status.off'), tone: 'muted' };
    case 'blocked':
      return {
        kind,
        title,
        detail: entry.canAsk
          ? t('notifications:status.blockedCanAsk')
          : t('notifications:status.blocked'),
        tone: 'problem',
      };
    case 'waiting':
      return { kind, title, detail: waitingDetail(kind, entry.reason), tone: 'muted' };
    case 'scheduled': {
      const day = dayPhrase(entry.at, options.now);
      if (kind === 'popQuiz') {
        // The time stays a surprise; the day and the window do not.
        const from = hourLabel(WINDOW_START_HOUR, formatTime);
        const to = hourLabel(WINDOW_END_HOUR, formatTime);
        return {
          kind,
          title,
          detail: t('notifications:status.nextQuiz', { day, from, to }),
          tone: 'ok',
        };
      }
      const time = formatTime(entry.at);
      if (kind === 'streak') {
        const vars = { count: status.streakCount, day, time };
        return {
          kind,
          title,
          detail: status.practicedToday
            ? t('notifications:status.streakSafe', vars)
            : t('notifications:status.streakNext', vars),
          tone: 'ok',
        };
      }
      return { kind, title, detail: t('notifications:status.nextReminder', { day, time }), tone: 'ok' };
    }
  }
}

/**
 * The lines to show: one per kind, except when iOS blocks all three for the
 * same reason, which is said once rather than three times over.
 */
export function describeReminders(status: ReminderStatus, options: DescribeOptions): ReminderLine[] {
  if (status.overall === 'blocked') {
    return [
      {
        kind: 'practice',
        title: t('notifications:status.allBlockedTitle'),
        detail: status.canAsk
          ? t('notifications:status.allBlockedCanAsk')
          : t('notifications:status.allBlocked'),
        tone: 'problem',
      },
    ];
  }
  return REMINDER_KINDS.map((kind) => describeReminder(kind, status, options));
}

/** One line for the whole feature, for the guide's checklist. */
export function reminderSummary(status: ReminderStatus, options: DescribeOptions): string {
  if (status.overall === 'off') return t('notifications:status.summaryOff');
  if (status.overall === 'blocked') {
    return status.canAsk
      ? t('notifications:status.summaryNeedsPermission')
      : t('notifications:status.summaryNeedsSettings');
  }
  const formatTime = options.formatTime ?? deviceTime;
  const next = [status.practice, status.popQuiz]
    .flatMap((s) => (s.state === 'scheduled' ? [s.at] : []))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  if (!next) return t('notifications:status.summaryNothing');
  // A quiz's exact time stays a surprise.
  const isPractice = status.practice.state === 'scheduled' && status.practice.at === next;
  const day = dayPhrase(next, options.now);
  return isPractice
    ? t('notifications:status.summaryNextAt', { day, time: formatTime(next) })
    : t('notifications:status.summaryNext', { day });
}
