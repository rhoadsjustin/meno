import { describe, expect, it } from 'vitest';

import {
  buildArrangeRound,
  currentMode,
  deserializeSession,
  firstLetters,
  gradeArrangement,
  isComplete,
  recordRound,
  selectBlanks,
  serializeSession,
  splitPhrases,
  startSession,
  displayWords,
} from '@/services/practice';

const phil11 =
  'Paul and Timothy, servants of Jesus Christ; To all the saints in Christ Jesus who are at Philippi, with the overseers and servants:';

describe('firstLetters', () => {
  it('reduces words to first letters, keeping punctuation', () => {
    expect(firstLetters('Do not be anxious about anything,')).toBe('D n b a a a,');
    expect(firstLetters('“Come!” he said.')).toBe('“C!” h s.');
  });
});

describe('selectBlanks', () => {
  it('is deterministic per (chunkId, density, attemptNo)', () => {
    const a = selectBlanks(phil11, 0.25, 'chunk1', 1);
    const b = selectBlanks(phil11, 0.25, 'chunk1', 1);
    expect(a).toEqual(b);
  });

  it('varies between attempts', () => {
    // With a small content-word pool two attempts can collide; across five
    // attempts at least one selection must differ.
    const sets = [1, 2, 3, 4, 5].map((n) => JSON.stringify(selectBlanks(phil11, 0.5, 'chunk1', n)));
    expect(new Set(sets).size).toBeGreaterThan(1);
  });

  it('blanks roughly the requested density', () => {
    const words = displayWords(phil11);
    for (const density of [0.25, 0.5, 0.75]) {
      const blanks = selectBlanks(phil11, density, 'c', 1);
      expect(blanks.length).toBe(Math.round(words.length * density));
    }
  });

  it('prefers content words at 25%', () => {
    const blanks = selectBlanks(phil11, 0.25, 'chunk1', 1);
    const words = displayWords(phil11);
    const stops = new Set(['and', 'of', 'to', 'all', 'the', 'in', 'who', 'are', 'at', 'with']);
    for (const i of blanks) {
      expect(stops.has(words[i].toLowerCase()), words[i]).toBe(false);
    }
  });
});

describe('arrange', () => {
  it('splits into 6–12 tiles that reassemble the text words', () => {
    const phrases = splitPhrases(phil11);
    expect(phrases.length).toBeGreaterThanOrEqual(4); // short text may floor lower
    expect(phrases.length).toBeLessThanOrEqual(12);
    expect(phrases.join(' ').split(/\s+/)).toEqual(phil11.split(/\s+/));
  });

  it('shuffles deterministically and never presents solved order', () => {
    const a = buildArrangeRound(phil11, 'chunk1', 1);
    const b = buildArrangeRound(phil11, 'chunk1', 1);
    expect(a).toEqual(b);
    expect(a.shuffledOrder.every((v, i) => v === i)).toBe(false);
  });

  it('grades tile order positionally', () => {
    const round = buildArrangeRound(phil11, 'chunk1', 1);
    const n = round.phrases.length;
    const perfect = round.phrases.map((_, i) => i);
    expect(gradeArrangement(round, perfect)).toBe(1);
    const oneSwap = [...perfect];
    [oneSwap[0], oneSwap[1]] = [oneSwap[1], oneSwap[0]];
    expect(gradeArrangement(round, oneSwap)).toBeCloseTo((n - 2) / n);
  });
});

describe('session state machine', () => {
  it('walks tier rounds and clears the tier on threshold passes', () => {
    let s = startSession({ goalId: 'g', chunkId: 'c', highestClearedTier: 2, now: 1 });
    expect(s.tier).toBe(3);
    expect(currentMode(s)).toBe('blanks50');
    let r = recordRound(s, { accuracy: 0.95 });
    expect(r.passed).toBe(true);
    expect(r.tierCleared).toBe(false);
    expect(currentMode(r.state)).toBe('blanks75');
    r = recordRound(r.state, { accuracy: 0.92 });
    expect(r.tierCleared).toBe(true);
    expect(isComplete(r.state)).toBe(true);
  });

  it('retries a failed round and suggests dropping after two fails', () => {
    let s = startSession({ goalId: 'g', chunkId: 'c', highestClearedTier: 4, now: 1 });
    expect(currentMode(s)).toBe('type');
    let r = recordRound(s, { accuracy: 0.8 });
    expect(r.passed).toBe(false);
    expect(r.suggestDropTier).toBe(false);
    expect(currentMode(r.state)).toBe('type'); // same round again
    r = recordRound(r.state, { accuracy: 0.9 });
    expect(r.suggestDropTier).toBe(true); // suggestion only, never forced
    r = recordRound(r.state, { accuracy: 0.97 });
    expect(r.tierCleared).toBe(true);
  });

  it('handles self-reported rounds (tiers 0–1)', () => {
    let s = startSession({ goalId: 'g', chunkId: 'c', highestClearedTier: 0, now: 1 });
    expect(s.tier).toBe(1);
    expect(s.rounds).toEqual(['firstLetters', 'firstLetters']);
    let r = recordRound(s, { selfPass: true });
    r = recordRound(r.state, { selfPass: true });
    expect(r.tierCleared).toBe(true);
  });

  it('serializes and resumes losslessly (kill-app resume)', () => {
    let s = startSession({ goalId: 'g', chunkId: 'c', highestClearedTier: 2, now: 1 });
    s = recordRound(s, { accuracy: 0.95 }).state;
    const resumed = deserializeSession(serializeSession(s));
    expect(resumed).toEqual(s);
    expect(deserializeSession('{"broken": true}')).toBeNull();
    expect(deserializeSession('not json')).toBeNull();
  });
});
