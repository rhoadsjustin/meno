import { describe, expect, it } from 'vitest';

import { rollupYear } from '@/services/wrapped/rollup';
import { parseRecap, serializeRecap, snapshotKey } from '@/services/wrapped/snapshot';
import type { LocalClock, RecapInput } from '@/services/wrapped/types';

const utc: LocalClock = {
  dayOf: (d) => d.toISOString().slice(0, 10),
  hourOf: (d) => d.getUTCHours(),
};

const input: RecapInput = {
  attempts: [1, 2, 3, 4, 5].map((d) => ({
    goalId: 'g',
    mode: 'speak' as const,
    source: 'practice' as const,
    durationMs: 300_000,
    createdAt: new Date(`2026-11-0${d}T07:00:00Z`),
  })),
  chunks: [{ goalId: 'g', memorizedAt: new Date('2026-11-04T08:00:00Z'), verses: 2, words: 30 }],
  goals: [
    {
      id: 'g',
      title: 'Psalm 23',
      translationId: 'esv',
      range: { start: { bookId: 'Ps', chapter: 23, verse: 1 }, end: { bookId: 'Ps', chapter: 23, verse: 6 } },
    },
  ],
  unlocks: [],
  badges: [{ code: 'first_verse', earnedAt: new Date('2026-11-04T08:00:00Z') }],
  keptDays: [],
};

describe('recap snapshot', () => {
  const recap = rollupYear(input, { year: 2026, clock: utc });

  it('round-trips a recap', () => {
    expect(parseRecap(serializeRecap(recap), 2026)).toEqual(recap);
    expect(snapshotKey(2026)).toBe('wrapped:2026');
  });

  it('carries no verse text', () => {
    expect(serializeRecap(recap)).not.toMatch(/shepherd|restores my soul/i);
  });

  it('refuses another year, another format, and damage', () => {
    const raw = serializeRecap(recap);
    expect(parseRecap(raw, 2025)).toBeNull();
    expect(parseRecap(raw.replace('"v":1', '"v":2'), 2026)).toBeNull();
    expect(parseRecap('not json', 2026)).toBeNull();
    expect(parseRecap(null, 2026)).toBeNull();
    expect(parseRecap(raw.replace('"persona":"morningWatch"', '"persona":"pirate"'), 2026)).toBeNull();
    expect(parseRecap(raw.replace('"minutes":25', '"minutes":-1'), 2026)).toBeNull();
  });
});
