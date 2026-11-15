import { describe, expect, it } from 'vitest';

import { mulberry32 } from '@/services/practice/prng';
import {
  CHANNEL_IDS,
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

  it('names the verse the review opens on, once that review is due', () => {
    const psalm = { bookId: 'Ps', chapter: 23, verse: 1 };
    const nextReview = { range: { start: psalm, end: psalm }, dueAt: new Date(2026, 9, 15, 12, 0) };
    const quizzes = planNotifications(input({ hasMemorized: true, nextReview })).filter(
      (p) => p.kind === 'popQuiz',
    );
    const early = quizzes.filter((p) => p.at.getTime() < nextReview.dueAt.getTime());
    const late = quizzes.filter((p) => p.at.getTime() >= nextReview.dueAt.getTime());
    expect(early.length).toBeGreaterThan(0);
    expect(late.length).toBeGreaterThan(0);
    // Before it is due the queue would not open on it, so the quiz stays unnamed.
    for (const p of early) expect(p.title).toBe('Pop quiz');
    for (const p of late) {
      expect(p.title).toBe('Pop quiz — Psalms 23:1');
      expect(p.body).toBe('Still have it from memory? 30 seconds.');
      expect(p.url).toBe('/review');
    }
  });

  it('leaves a quiz unnamed when no review is known', () => {
    const plan = planNotifications(input({ hasMemorized: true, nextReview: null }));
    for (const p of plan.filter((x) => x.kind === 'popQuiz')) expect(p.title).toBe('Pop quiz');
  });

  it('files seasonal notices under their own Android channel', () => {
    expect(CHANNEL_IDS.recap).toBe(CHANNEL_IDS.advent);
    expect(CHANNEL_IDS.recap).not.toBe(CHANNEL_IDS.practice);
    expect(CHANNEL_IDS.recap).not.toBe(CHANNEL_IDS.popQuiz);
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

describe('Advent notices', () => {
  const adventIn = (plan: ReturnType<typeof planNotifications>) => plan.filter((p) => p.kind === 'advent');
  const luke = (from: number, to: number) => ({
    start: { bookId: 'Luke', chapter: 2, verse: from },
    end: { bookId: 'Luke', chapter: 2, verse: to },
  });
  const weekly = [
    { year: 2026, date: '2026-11-29', week: 1, range: luke(1, 4) },
    { year: 2026, date: '2026-12-06', week: 2, range: luke(5, 7) },
    { year: 2026, date: '2026-12-13', week: 3, range: luke(8, 11) },
    { year: 2026, date: '2026-12-20', week: 4, range: luke(12, 14) },
  ];

  it('goes on Sunday afternoon and names the week’s verses', () => {
    // Friday 27 Nov: the first two Sundays are inside the week ahead.
    const plan = planNotifications(
      input({ now: new Date(2026, 10, 27, 10, 0), hasMemorized: true, adventNotices: weekly }),
    );
    const advent = adventIn(plan);
    expect(advent.map((p) => p.at)).toEqual([new Date(2026, 10, 29, 14, 0)]);
    expect(advent[0].id).toBe('advent-2026-1');
    expect(advent[0].title).toBe('Advent, week 1 of 4');
    expect(advent[0].body).toBe('This week: Luke 2:1–4.');
    expect(advent[0].url).toBe('/');
    for (const count of byDay(plan).values()) expect(count).toBeLessThanOrEqual(MAX_PER_DAY);
  });

  it('invites with the whole passage', () => {
    const plan = planNotifications(
      input({
        now: new Date(2026, 10, 28, 10, 0),
        hasPractice: false,
        adventNotices: [{ year: 2026, date: '2026-11-29', week: 0, range: luke(1, 14) }],
      }),
    );
    expect(plan).toHaveLength(1);
    expect(plan[0].id).toBe('advent-2026-0');
    expect(plan[0].title).toBe('Advent begins today');
    expect(plan[0].body).toContain('Luke 2:1–14');
  });

  it('keeps clear of the daily reminder', () => {
    const plan = planNotifications(
      input({
        now: new Date(2026, 10, 28, 10, 0),
        reminderTime: { hour: 15, minute: 30 },
        adventNotices: weekly,
      }),
    );
    const advent = adventIn(plan);
    expect(advent).toHaveLength(1);
    expect(advent[0].at).toEqual(new Date(2026, 10, 29, 11, 0));
    for (const other of plan.filter((p) => p.kind !== 'advent')) {
      expect(Math.abs(other.at.getTime() - advent[0].at.getTime())).toBeGreaterThanOrEqual(MIN_GAP_MS);
    }
  });

  it('is not sent again by a plan made after it went out', () => {
    // Sunday 29 Nov, 14:30: the 14:00 notice has gone. Practicing drops
    // today's reminder, which must not free a later hour for a second one.
    for (const practicedToday of [false, true]) {
      const plan = planNotifications(
        input({ now: new Date(2026, 10, 29, 14, 30), practicedToday, adventNotices: weekly }),
      );
      expect(adventIn(plan)).toHaveLength(0);
    }
    // The next Sunday comes into the week ahead on Monday.
    const monday = planNotifications(input({ now: new Date(2026, 10, 30, 9, 0), adventNotices: weekly }));
    expect(adventIn(monday).map((p) => p.id)).toEqual(['advent-2026-2']);
  });

  it('plans nothing without notices', () => {
    expect(adventIn(planNotifications(input({ now: new Date(2026, 10, 28, 10, 0) })))).toHaveLength(0);
    expect(
      adventIn(planNotifications(input({ now: new Date(2026, 10, 28, 10, 0), adventNotices: [] }))),
    ).toHaveLength(0);
  });
});
