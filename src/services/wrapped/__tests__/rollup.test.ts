import { describe, expect, it } from 'vitest';

import { mayShareVerseText } from '@/services/bible/registry';
import { rollupYear } from '@/services/wrapped/rollup';
import type {
  LocalClock,
  RecapAttempt,
  RecapGoal,
  RecapInput,
} from '@/services/wrapped/types';

/** A fixed-offset zone; -6 is Central Standard Time. */
function zone(offsetHours: number): LocalClock {
  const shift = (d: Date) => new Date(d.getTime() + offsetHours * 3_600_000);
  return {
    dayOf: (d) => shift(d).toISOString().slice(0, 10),
    hourOf: (d) => shift(d).getUTCHours(),
  };
}
const central = zone(-6);

/** A moment given in Central local time. */
function at(local: string): Date {
  return new Date(`${local}-06:00`);
}

const phil: RecapGoal = {
  id: 'phil',
  title: 'Philippians 4:4–9',
  translationId: 'web',
  range: { start: { bookId: 'Phil', chapter: 4, verse: 4 }, end: { bookId: 'Phil', chapter: 4, verse: 9 } },
};
const ps23: RecapGoal = {
  id: 'ps23',
  title: 'Psalm 23',
  translationId: 'esv',
  range: { start: { bookId: 'Ps', chapter: 23, verse: 1 }, end: { bookId: 'Ps', chapter: 23, verse: 6 } },
};

function attempt(local: string, over: Partial<RecapAttempt> = {}): RecapAttempt {
  return {
    goalId: 'phil',
    mode: 'firstLetters',
    source: 'practice',
    durationMs: 120_000,
    createdAt: at(local),
    ...over,
  };
}

function input(over: Partial<RecapInput> = {}): RecapInput {
  return { attempts: [], chunks: [], goals: [phil, ps23], unlocks: [], badges: [], keptDays: [], ...over };
}

/** One attempt per day at the given local hour, on consecutive days. */
function daily(start: string, count: number, hour = 7, over: Partial<RecapAttempt> = {}) {
  const out: RecapAttempt[] = [];
  const base = new Date(`${start}T00:00:00Z`);
  for (let i = 0; i < count; i++) {
    const day = new Date(base.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    out.push(attempt(`${day}T${String(hour).padStart(2, '0')}:30:00`, over));
  }
  return out;
}

const roll = (i: RecapInput, year = 2026) => rollupYear(i, { year, clock: central });

describe('rollupYear', () => {
  it('gives an empty device no recap and no cards', () => {
    const r = roll(input());
    expect(r.eligible).toBe(false);
    expect(r.cards).toEqual([]);
    expect(r.passage).toBeNull();
    expect(r.persona).toBeNull();
    expect(r.wordsMemorized).toBe(0);
  });

  it('waits for three active days', () => {
    expect(roll(input({ attempts: daily('2026-11-01', 2) })).eligible).toBe(false);
    const r = roll(input({ attempts: daily('2026-11-01', 3) }));
    expect(r.eligible).toBe(true);
    expect(r.cards[0]).toBe('cover');
    expect(r.cards.at(-1)).toBe('summary');
  });

  it('counts the year in local time, not UTC', () => {
    // 21:00 Dec 31 Central is 03:00 Jan 1 UTC: still 2026 here.
    const lateNewYearsEve = attempt('2026-12-31T21:00:00');
    // 23:30 Dec 31, 2025 Central is already 2026 in UTC: not this year.
    const lastYear = attempt('2025-12-31T23:30:00');
    const r = roll(input({ attempts: [lateNewYearsEve, lastYear] }));
    expect(r.attempts).toBe(1);
    expect(r.activeDays).toBe(1);
    expect(roll(input({ attempts: [lateNewYearsEve, lastYear] }), 2025).attempts).toBe(1);
  });

  it('keeps days from deleted passages and does not double-count them', () => {
    const r = roll(
      input({
        attempts: daily('2026-10-01', 2),
        keptDays: ['2026-10-01', '2026-09-15', '2025-12-30'],
      }),
    );
    expect(r.activeDays).toBe(3);
  });

  it('finds the longest run with the streak’s grace rules', () => {
    // Five days, one missed day (bridged by grace), four more; later a lone day.
    const attempts = [
      ...daily('2026-03-02', 5),
      ...daily('2026-03-08', 4),
      ...daily('2026-05-01', 1),
    ];
    const r = roll(input({ attempts }));
    expect(r.longestRun).toBe(9);
    expect(r.graceDaysHonored).toBe(1);
  });

  it('adds up memorized verses and words, or admits it can’t count words', () => {
    const chunks = [
      { goalId: 'phil', memorizedAt: at('2026-10-10T08:00:00'), verses: 2, words: 40 },
      { goalId: 'phil', memorizedAt: at('2026-11-02T08:00:00'), verses: 3, words: 61 },
      { goalId: 'phil', memorizedAt: at('2025-12-01T08:00:00'), verses: 5, words: 90 },
      { goalId: 'phil', memorizedAt: null, verses: 1, words: 20 },
    ];
    const r = roll(input({ chunks, attempts: daily('2026-10-01', 3) }));
    expect(r.chunksMemorized).toBe(2);
    expect(r.versesMemorized).toBe(5);
    expect(r.wordsMemorized).toBe(101);
    expect(r.cards).toContain('words');

    const offline = [...chunks, { goalId: 'ps23', memorizedAt: at('2026-11-05T08:00:00'), verses: 6, words: null }];
    expect(roll(input({ chunks: offline })).wordsMemorized).toBeNull();
  });

  it('picks the passage the most time went into', () => {
    const attempts = [
      ...daily('2026-10-01', 3, 7, { goalId: 'phil', durationMs: 60_000 }),
      ...daily('2026-10-01', 2, 8, { goalId: 'ps23', durationMs: 300_000 }),
      attempt('2026-10-05T07:00:00', { goalId: 'deleted-goal', durationMs: 9_000_000 }),
    ];
    const r = roll(input({ attempts }));
    expect(r.passage?.id).toBe('ps23');
    expect(r.passage?.minutes).toBe(10);
    expect(r.passage?.attempts).toBe(2);
  });

  it('breaks a tie in time by attempts', () => {
    const attempts = [
      attempt('2026-10-01T07:00:00', { goalId: 'phil', durationMs: 120_000 }),
      attempt('2026-10-02T07:00:00', { goalId: 'ps23', durationMs: 60_000 }),
      attempt('2026-10-03T07:00:00', { goalId: 'ps23', durationMs: 60_000 }),
    ];
    expect(roll(input({ attempts })).passage?.id).toBe('ps23');
  });

  it('never carries text for a licensed passage of the year', () => {
    const attempts = daily('2026-10-01', 3, 7, { goalId: 'ps23' });
    const r = roll(input({ attempts }));
    expect(r.passage).not.toHaveProperty('text');
    expect(mayShareVerseText(r.passage!.translationId)).toBe(false);
    expect(mayShareVerseText('web')).toBe(true);
    expect(mayShareVerseText('kjv')).toBe(true);
    expect(mayShareVerseText('yv-111')).toBe(false);
    expect(mayShareVerseText('no-such-translation')).toBe(false);
  });

  it('counts minutes, speaking, reviews and unlocks; never overrides', () => {
    const attempts = [
      ...daily('2026-10-01', 3, 7, { durationMs: 240_000 }),
      attempt('2026-10-04T07:00:00', { mode: 'speak', source: 'review', durationMs: 30_000 }),
    ];
    const r = roll(
      input({
        attempts,
        unlocks: [at('2026-10-02T06:10:00'), at('2026-10-03T06:05:00'), at('2025-11-01T06:00:00')],
      }),
    );
    expect(r.minutes).toBe(13);
    expect(r.spokenRecitations).toBe(1);
    expect(r.reviews).toBe(1);
    expect(r.unlocks).toBe(2);
    expect(r.cards).toEqual(
      expect.arrayContaining(['minutes', 'spoken', 'unlocks']),
    );
  });

  it('skips cards that would read as nothing', () => {
    const r = roll(input({ attempts: daily('2026-11-01', 3, 7, { durationMs: 30_000 }) }));
    expect(r.cards).toEqual(['cover', 'passage', 'days', 'summary']);
  });

  it('lists the year’s badges in the order they were earned', () => {
    const badges = [
      { code: 'steady_30', earnedAt: at('2026-11-20T08:00:00') },
      { code: 'first_verse', earnedAt: at('2026-10-03T08:00:00') },
      { code: 'perfect_speak', earnedAt: at('2025-12-03T08:00:00') },
    ];
    const r = roll(input({ badges, attempts: daily('2026-10-01', 3) }));
    expect(r.badges).toEqual(['first_verse', 'steady_30']);
    expect(r.cards).toContain('badges');
  });

  it('reads a late start as a first season', () => {
    expect(roll(input({ attempts: daily('2026-10-12', 3) })).span).toEqual({
      kind: 'firstSeason',
      month: 10,
    });
    expect(roll(input({ attempts: daily('2026-08-28', 3) })).span).toEqual({ kind: 'year' });
  });

  it('gives a persona from five days on', () => {
    expect(roll(input({ attempts: daily('2026-10-01', 4, 6) })).persona).toBeNull();
    const r = roll(input({ attempts: daily('2026-10-01', 5, 6) }));
    expect(r.persona).toBe('morningWatch');
    expect(r.alsoPersonas).toEqual([]);
    expect(r.cards).toContain('persona');
  });

  it('adds up to two more personas the year earned', () => {
    // Forty mornings in a row, all spoken: morning first, then voice and faithfulness.
    const r = roll(input({ attempts: daily('2026-03-02', 40, 6, { mode: 'speak' }) }));
    expect(r.persona).toBe('morningWatch');
    expect(r.alsoPersonas).toEqual(['voiceInTheRoom', 'faithfulKeeper']);
  });
});
