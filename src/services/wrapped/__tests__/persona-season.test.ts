import { describe, expect, it } from 'vitest';

import { personaFor, type PersonaFacts } from '@/services/wrapped/persona';
import { isRecapSeason, recapYearFor } from '@/services/wrapped/season';

const base: PersonaFacts = { hours: [], modes: [], activeDays: 10, longestRun: 3 };
const facts = (over: Partial<PersonaFacts>): PersonaFacts => ({ ...base, ...over });
const repeat = <T>(value: T, n: number): T[] => Array.from({ length: n }, () => value);

describe('personaFor', () => {
  it('needs enough days and some practice', () => {
    expect(personaFor(facts({ activeDays: 4, hours: [7] }))).toBeNull();
    expect(personaFor(facts({ hours: [] }))).toBeNull();
  });

  it('reads the time of day', () => {
    expect(personaFor(facts({ hours: [6, 7, 8, 15] }))).toBe('morningWatch');
    expect(personaFor(facts({ hours: [21, 23, 1, 15] }))).toBe('nightMeditator');
    expect(personaFor(facts({ hours: [12, 13, 16, 17, 18] }))).toBe('middayPause');
  });

  it('counts 2am as morning’s edge, not night', () => {
    expect(personaFor(facts({ hours: [2, 3, 15, 16] }))).toBe('steadyWalker');
  });

  it('falls through to speaking, then faithfulness, then steadiness', () => {
    const scattered = [9, 10, 15, 16, 17, 18, 19, 14, 10, 15];
    expect(
      personaFor(facts({ hours: scattered, modes: [...repeat('speak' as const, 3), ...repeat('type' as const, 7)] })),
    ).toBe('voiceInTheRoom');
    expect(personaFor(facts({ hours: scattered, modes: repeat('type' as const, 10), longestRun: 30 }))).toBe(
      'faithfulKeeper',
    );
    expect(personaFor(facts({ hours: scattered, modes: repeat('type' as const, 10) }))).toBe('steadyWalker');
  });

  it('lets time of day win over speaking', () => {
    expect(personaFor(facts({ hours: [6, 6, 6], modes: repeat('speak' as const, 3) }))).toBe('morningWatch');
  });
});

describe('recap season', () => {
  it('runs December 1 through January 31', () => {
    expect(recapYearFor('2026-11-30')).toBeNull();
    expect(recapYearFor('2026-12-01')).toBe(2026);
    expect(recapYearFor('2026-12-31')).toBe(2026);
    expect(recapYearFor('2027-01-01')).toBe(2026);
    expect(recapYearFor('2027-01-31')).toBe(2026);
    expect(recapYearFor('2027-02-01')).toBeNull();
    expect(isRecapSeason('2026-10-31')).toBe(false);
  });

  it('reads malformed dates as out of season', () => {
    expect(recapYearFor('')).toBeNull();
    expect(recapYearFor('soon')).toBeNull();
  });
});
