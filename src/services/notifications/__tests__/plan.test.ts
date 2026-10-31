import { describe, expect, it } from 'vitest';

import { mulberry32 } from '@/services/practice/prng';
import {
  DAYS_AHEAD,
  DEFAULT_REMINDER_TIME,
  MAX_PER_DAY,
  MIN_GAP_MS,
  WINDOW_END_HOUR,
  WINDOW_START_HOUR,
  formatReminderTime,
  parseReminderTime,
  planNotifications,
  type PlanInput,
} from '@/services/notifications/plan';

/** Tuesday 13 Oct 2026, 10:00 local. */
const NOW = new Date(2026, 9, 13, 10, 0, 0);

function input(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    now: NOW,
    reminderTime: { hour: 19, minute: 0 },
    hasPractice: true,
    practicedToday: false,
    streak: 0,
    dueCount: 0,
    hasMemorized: false,
    random: mulberry32(7),
    ...overrides,
  };
}

function byDay(plan: ReturnType<typeof planNotifications>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of plan) counts.set(p.at.toDateString(), (counts.get(p.at.toDateString()) ?? 0) + 1);
  return counts;
}

describe('planNotifications', () => {
  it('reminds a brand-new user who has memorized nothing yet', () => {
    // The gap that left opted-in testers with silence: no memorized verse,
    // no streak — a reminder still has to arrive.
    const plan = planNotifications(input());
    expect(plan).toHaveLength(DAYS_AHEAD);
    expect(plan.every((p) => p.kind === 'practice')).toBe(true);
    expect(plan[0].at).toEqual(new Date(2026, 9, 13, 19, 0, 0));
    expect(plan[0].title).toBe('Time to practice');
  });

  it('keeps reminding on the days after today, without the app being opened', () => {
    const days = planNotifications(input()).map((p) => p.at.getDate());
    expect(days).toEqual([13, 14, 15, 16, 17, 18, 19]);
  });

  it('skips today once today is practiced', () => {
    const plan = planNotifications(input({ practicedToday: true, streak: 3 }));
    expect(plan[0].at).toEqual(new Date(2026, 9, 14, 19, 0, 0));
    expect(plan).toHaveLength(DAYS_AHEAD - 1);
  });

  it('skips today when the reminder time has already passed', () => {
    const plan = planNotifications(input({ now: new Date(2026, 9, 13, 19, 30, 0) }));
    expect(plan[0].at.getDate()).toBe(14);
  });

  it('plans nothing when there is nothing to practice', () => {
    expect(planNotifications(input({ hasPractice: false }))).toEqual([]);
  });

  it('lets only the next reminder speak for the streak', () => {
    const plan = planNotifications(input({ streak: 4, dueCount: 2 }));
    expect(plan[0].title).toBe('4-day streak');
    expect(plan[0].body).toContain('2 verses are ready');
    expect(plan[1].title).toBe('Time to practice');
  });

  it('honors a reminder time outside the quiz window', () => {
    const plan = planNotifications(input({ reminderTime: { hour: 6, minute: 30 } }));
    // 06:30 today has passed at 10:00, so the first one is tomorrow morning.
    expect(plan[0].at).toEqual(new Date(2026, 9, 14, 6, 30, 0));
  });

  it('adds pop quizzes once a verse is memorized, within the daily cap', () => {
    const plan = planNotifications(input({ hasMemorized: true }));
    expect(plan.some((p) => p.kind === 'popQuiz')).toBe(true);
    for (const count of byDay(plan).values()) expect(count).toBeLessThanOrEqual(MAX_PER_DAY);
  });

  it('keeps quizzes inside the window and three hours from anything else', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const plan = planNotifications(input({ hasMemorized: true, random: mulberry32(seed) }));
      for (const p of plan.filter((x) => x.kind === 'popQuiz')) {
        expect(p.at.getHours()).toBeGreaterThanOrEqual(WINDOW_START_HOUR);
        expect(p.at.getHours()).toBeLessThan(WINDOW_END_HOUR);
        expect(p.at.getTime()).toBeGreaterThan(NOW.getTime());
      }
      for (let i = 1; i < plan.length; i++) {
        expect(plan[i].at.getTime() - plan[i - 1].at.getTime()).toBeGreaterThanOrEqual(MIN_GAP_MS);
      }
    }
  });

  it('gives every notification a unique id', () => {
    const plan = planNotifications(input({ hasMemorized: true }));
    expect(new Set(plan.map((p) => p.id)).size).toBe(plan.length);
  });
});

describe('reminder time', () => {
  it('round-trips through its stored form', () => {
    expect(parseReminderTime(formatReminderTime({ hour: 7, minute: 5 }))).toEqual({
      hour: 7,
      minute: 5,
    });
  });

  it('falls back to the default for missing or malformed values', () => {
    expect(parseReminderTime(undefined)).toEqual(DEFAULT_REMINDER_TIME);
    expect(parseReminderTime('25:00')).toEqual(DEFAULT_REMINDER_TIME);
    expect(parseReminderTime('evening')).toEqual(DEFAULT_REMINDER_TIME);
  });
});

describe('Year in the Word notice', () => {
  const recapIn = (plan: ReturnType<typeof planNotifications>) => plan.filter((p) => p.kind === 'recap');
  const notice = { year: 2026, plannedFor: null };

  it('goes once, on the first December day, clear of the reminder', () => {
    const plan = planNotifications(
      input({ now: new Date(2026, 10, 29, 10, 0), hasMemorized: true, recapNotice: notice }),
    );
    const recap = recapIn(plan);
    expect(recap).toHaveLength(1);
    expect(recap[0].at).toEqual(new Date(2026, 11, 1, 12, 0));
    expect(recap[0].url).toBe('/wrapped');
    for (const count of byDay(plan).values()) expect(count).toBeLessThanOrEqual(MAX_PER_DAY);
  });

  it('takes the evening when the reminder leaves room', () => {
    const plan = planNotifications(
      input({ now: new Date(2026, 11, 3, 10, 0), reminderTime: { hour: 8, minute: 0 }, recapNotice: notice }),
    );
    expect(recapIn(plan)[0].at).toEqual(new Date(2026, 11, 3, 19, 0));
  });

  it('keeps an earlier plan’s time, and never replans a notice that passed', () => {
    const plannedFor = new Date(2026, 11, 2, 19, 0);
    const before = planNotifications(
      input({ now: new Date(2026, 11, 1, 9, 0), recapNotice: { year: 2026, plannedFor } }),
    );
    expect(recapIn(before)[0].at).toEqual(plannedFor);
    const after = planNotifications(
      input({ now: new Date(2026, 11, 3, 9, 0), recapNotice: { year: 2026, plannedFor } }),
    );
    expect(recapIn(after)).toHaveLength(0);
  });

  it('stays in December, and away without a recap to announce', () => {
    const lastDay = recapIn(planNotifications(input({ now: new Date(2026, 11, 30, 22, 0), recapNotice: notice })));
    expect(lastDay.map((p) => p.at)).toEqual([new Date(2026, 11, 31, 12, 0)]);
    const january = planNotifications(input({ now: new Date(2027, 0, 2, 9, 0), recapNotice: notice }));
    expect(recapIn(january)).toHaveLength(0);
    expect(recapIn(planNotifications(input({ now: new Date(2026, 11, 5, 9, 0) })))).toHaveLength(0);
  });
});
