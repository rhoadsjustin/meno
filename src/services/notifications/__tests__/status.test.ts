import { describe, expect, it } from 'vitest';

import { mulberry32 } from '@/services/practice/prng';
import { planNotifications } from '@/services/notifications/plan';
import {
  dayPhrase,
  describeReminder,
  describeReminders,
  reminderStatus,
  reminderSummary,
  type StatusInput,
} from '@/services/notifications/status';

/** Tuesday 13 Oct 2026, 10:00 local. */
const NOW = new Date(2026, 9, 13, 10, 0, 0);

/** Deterministic clock text, whatever locale the tests run in. */
function formatTime(at: Date): string {
  const hour = at.getHours() % 12 || 12;
  return `${hour}:${String(at.getMinutes()).padStart(2, '0')} ${at.getHours() < 12 ? 'AM' : 'PM'}`;
}
const options = { now: NOW, formatTime };

type Overrides = Partial<StatusInput> & { reminderHour?: number };

/** Status input whose `scheduled` is what the planner would hand iOS. */
function input(overrides: Overrides = {}): StatusInput {
  const { reminderHour = 19, ...rest } = overrides;
  const state = {
    now: NOW,
    enabled: true,
    permission: 'granted' as const,
    hasPractice: true,
    practicedToday: false,
    streak: 0,
    hasMemorized: false,
    ...rest,
  };
  const scheduled =
    rest.scheduled ??
    planNotifications({
      ...state,
      reminderTime: { hour: reminderHour, minute: 0 },
      dueCount: 0,
      random: mulberry32(7),
    }).map((p) => ({ id: p.id, at: p.at }));
  return { ...state, scheduled };
}

describe('reminderStatus', () => {
  it('is off for all three when reminders were never switched on', () => {
    const status = reminderStatus(input({ enabled: false, permission: 'undetermined' }));
    expect(status.overall).toBe('off');
    expect(status.practice).toEqual({ state: 'off' });
    expect(status.popQuiz).toEqual({ state: 'off' });
    expect(status.streak).toEqual({ state: 'off' });
  });

  it('is off even when iOS would allow them', () => {
    expect(reminderStatus(input({ enabled: false })).overall).toBe('off');
  });

  it('is blocked when on in Meno but declined in iOS', () => {
    // "Yes, quiz me" in onboarding, then "Don't Allow" on the system prompt.
    const status = reminderStatus(input({ permission: 'denied', scheduled: [] }));
    expect(status.overall).toBe('blocked');
    expect(status.canAsk).toBe(false);
    for (const kind of ['practice', 'popQuiz', 'streak'] as const) {
      expect(status[kind]).toEqual({ state: 'blocked', canAsk: false });
    }
  });

  it('knows when iOS has not been asked yet, so Meno still can', () => {
    const status = reminderStatus(input({ permission: 'undetermined', scheduled: [] }));
    expect(status.overall).toBe('blocked');
    expect(status.canAsk).toBe(true);
  });

  it('never reports blocked reminders as scheduled, whatever iOS still holds', () => {
    const status = reminderStatus(input({ permission: 'denied', streak: 3, hasMemorized: true }));
    expect(status.practice.state).toBe('blocked');
    expect(status.popQuiz.state).toBe('blocked');
  });

  it('says when the next daily reminder comes', () => {
    const status = reminderStatus(input());
    expect(status.overall).toBe('on');
    expect(status.practice).toEqual({ state: 'scheduled', at: new Date(2026, 9, 13, 19, 0, 0) });
  });

  it('waits on pop quizzes until a verse is memorized', () => {
    expect(reminderStatus(input()).popQuiz).toEqual({
      state: 'waiting',
      reason: 'nothingMemorized',
    });
  });

  it('schedules pop quizzes once a verse is memorized', () => {
    const status = reminderStatus(input({ hasMemorized: true }));
    expect(status.popQuiz.state).toBe('scheduled');
  });

  it('waits on the streak reminder until there is a streak', () => {
    expect(reminderStatus(input()).streak).toEqual({ state: 'waiting', reason: 'noStreak' });
  });

  it('puts the streak on the next daily reminder', () => {
    const status = reminderStatus(input({ streak: 4 }));
    expect(status.streak).toEqual(status.practice);
    expect(status.streakCount).toBe(4);
  });

  it('moves both to tomorrow once today is practiced', () => {
    const status = reminderStatus(input({ streak: 4, practicedToday: true }));
    const tomorrow = { state: 'scheduled', at: new Date(2026, 9, 14, 19, 0, 0) };
    expect(status.practice).toEqual(tomorrow);
    expect(status.streak).toEqual(tomorrow);
  });

  it('has nothing to remind of without a passage in progress', () => {
    const status = reminderStatus(input({ hasPractice: false, streak: 2, hasMemorized: true }));
    expect(status.practice).toEqual({ state: 'waiting', reason: 'nothingToPractice' });
    expect(status.streak).toEqual({ state: 'waiting', reason: 'nothingToPractice' });
    // Quizzes do not depend on a passage in progress.
    expect(status.popQuiz.state).toBe('scheduled');
  });

  it('trusts what iOS holds over what should have been planned', () => {
    const status = reminderStatus(input({ hasMemorized: true, streak: 2, scheduled: [] }));
    expect(status.practice).toEqual({ state: 'waiting', reason: 'notScheduled' });
    expect(status.popQuiz).toEqual({ state: 'waiting', reason: 'notScheduled' });
    expect(status.streak).toEqual({ state: 'waiting', reason: 'notScheduled' });
  });

  it('ignores scheduled times that have already passed', () => {
    const status = reminderStatus(
      input({
        scheduled: [
          { id: 'practice-0', at: new Date(2026, 9, 13, 9, 0, 0) },
          { id: 'practice-1', at: new Date(2026, 9, 14, 9, 0, 0) },
        ],
      }),
    );
    expect(status.practice).toEqual({ state: 'scheduled', at: new Date(2026, 9, 14, 9, 0, 0) });
  });

  it('does not mistake another kind for the one asked about', () => {
    const status = reminderStatus(
      input({
        hasMemorized: true,
        scheduled: [{ id: 'popquiz-0-0', at: new Date(2026, 9, 13, 15, 0, 0) }],
      }),
    );
    expect(status.practice).toEqual({ state: 'waiting', reason: 'notScheduled' });
    expect(status.popQuiz).toEqual({ state: 'scheduled', at: new Date(2026, 9, 13, 15, 0, 0) });
  });
});

describe('describeReminder', () => {
  const line = (kind: 'practice' | 'popQuiz' | 'streak', overrides: Overrides = {}) =>
    describeReminder(kind, reminderStatus(input(overrides)), options);

  it('says off in plain words', () => {
    const off = line('practice', { enabled: false });
    expect(off.detail).toBe('Off. Reminders are switched off in Meno.');
    expect(off.tone).toBe('muted');
  });

  it('points at iPhone Settings when iOS declined', () => {
    const blocked = line('popQuiz', { permission: 'denied' });
    expect(blocked.detail).toContain('turned off for Meno in iPhone Settings');
    expect(blocked.tone).toBe('problem');
  });

  it('does not send the user to iPhone Settings when iOS was never asked', () => {
    const blocked = line('practice', { permission: 'undetermined' });
    expect(blocked.detail).toContain('hasn’t been asked');
    expect(blocked.detail).not.toContain('iPhone Settings');
  });

  it('gives the time of the next daily reminder', () => {
    expect(line('practice').detail).toBe('Next reminder today at 7:00 PM.');
    expect(line('practice', { practicedToday: true }).detail).toBe(
      'Next reminder tomorrow at 7:00 PM.',
    );
    // 06:00 has passed at 10:00.
    expect(line('practice', { reminderHour: 6 }).detail).toBe('Next reminder tomorrow at 6:00 AM.');
  });

  it('names the weekday past tomorrow', () => {
    const status = reminderStatus(
      input({ scheduled: [{ id: 'practice-2', at: new Date(2026, 9, 15, 19, 0, 0) }] }),
    );
    expect(describeReminder('practice', status, options).detail).toBe(
      'Next reminder on Thursday at 7:00 PM.',
    );
  });

  it('keeps the quiz time a surprise but not the day or the window', () => {
    const quiz = line('popQuiz', { hasMemorized: true });
    expect(quiz.detail).toMatch(
      /^Next quiz (today|tomorrow), at a surprise time between 9:00 AM and 9:00 PM\.$/,
    );
    expect(quiz.tone).toBe('ok');
  });

  it('explains each reason nothing will arrive yet', () => {
    expect(line('popQuiz').detail).toContain('once you’ve memorized a verse');
    expect(line('streak').detail).toContain('No streak yet');
    expect(line('practice', { hasPractice: false }).detail).toContain('No passage in progress');
    expect(line('streak', { hasPractice: false, streak: 3 }).detail).toContain(
      'no reminder to carry your streak',
    );
    expect(line('practice', { scheduled: [] }).detail).toContain('Nothing is scheduled right now');
  });

  it('says which reminder carries the streak', () => {
    expect(line('streak', { streak: 4 }).detail).toBe(
      'Your 4-day streak is mentioned in the next reminder, today at 7:00 PM.',
    );
    expect(line('streak', { streak: 4, practicedToday: true }).detail).toBe(
      'Your 4-day streak is safe for today. The next reminder, tomorrow at 7:00 PM, will mention it.',
    );
  });

  it('never uses guilt', () => {
    const variants: Overrides[] = [
      {},
      { enabled: false },
      { permission: 'denied' },
      { permission: 'undetermined' },
      { hasPractice: false },
      { streak: 5, hasMemorized: true },
      { streak: 5, practicedToday: true },
      { scheduled: [] },
    ];
    for (const overrides of variants) {
      for (const l of describeReminders(reminderStatus(input(overrides)), options)) {
        expect(l.detail).not.toMatch(/\b(lose|losing|miss(ed|ing)?|fail(ed)?|forgot|disappoint\w*)\b/i);
      }
    }
  });

  it('says a block once, naming all three', () => {
    const lines = describeReminders(reminderStatus(input({ permission: 'denied' })), options);
    expect(lines).toHaveLength(1);
    expect(lines[0].tone).toBe('problem');
    expect(lines[0].detail).toContain('daily reminder, pop quizzes and the streak reminder');
    expect(lines[0].detail).toContain('iPhone Settings');
    const unasked = describeReminders(
      reminderStatus(input({ permission: 'undetermined' })),
      options,
    );
    expect(unasked[0].detail).toContain('hasn’t been asked');
  });

  it('describes all three, in a fixed order', () => {
    expect(describeReminders(reminderStatus(input()), options).map((l) => l.title)).toEqual([
      'Daily reminder',
      'Pop quizzes',
      'Streak reminder',
    ]);
  });
});

describe('reminderSummary', () => {
  const summary = (overrides: Overrides = {}) =>
    reminderSummary(reminderStatus(input(overrides)), options);

  it('covers each overall state', () => {
    expect(summary({ enabled: false })).toBe('Off');
    expect(summary({ permission: 'denied' })).toBe('Needs permission in iPhone Settings');
    expect(summary({ permission: 'undetermined' })).toBe('Needs your permission');
    expect(summary()).toBe('On, next today at 7:00 PM');
    expect(summary({ hasPractice: false })).toBe('On, nothing to send yet');
  });

  it('does not give away a quiz time', () => {
    const text = summary({
      hasMemorized: true,
      scheduled: [
        { id: 'popquiz-0-0', at: new Date(2026, 9, 13, 15, 0, 0) },
        { id: 'practice-0', at: new Date(2026, 9, 13, 19, 0, 0) },
      ],
    });
    expect(text).toBe('On, next today');
  });
});

describe('dayPhrase', () => {
  it('counts calendar days, not 24-hour spans', () => {
    const lateNight = new Date(2026, 9, 13, 23, 30, 0);
    expect(dayPhrase(new Date(2026, 9, 14, 0, 15, 0), lateNight)).toBe('tomorrow');
    expect(dayPhrase(new Date(2026, 9, 13, 23, 45, 0), lateNight)).toBe('today');
  });
});
