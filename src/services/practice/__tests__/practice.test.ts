import { describe, expect, it } from 'vitest';

import { meetsThreshold } from '@/services/grading';
import {
  buildArrangeRound,
  currentMode,
  deserializeSession,
  dropTier,
  firstLetters,
  gradeArrangement,
  isComplete,
  recordRound,
  retryTier,
  topTierStanding,
  selectBlanks,
  serializeSession,
  splitPhrases,
  ladderProgress,
  LADDER_ROUNDS,
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
    // Two tiles land wrong, but tapping neighbours out of order is one slip,
    // so it costs one error — not two (TRANSPOSITION_WEIGHT).
    expect(gradeArrangement(round, oneSwap)).toBeCloseTo(1 - 1 / n);
  });

  it('accepts identical phrases in either order (TestFlight: repeated-phrase verses)', () => {
    const round = {
      phrases: ['Holy, holy,', 'is the Lord,', 'Holy, holy,', 'God Almighty.'],
      shuffledOrder: [3, 0, 2, 1],
    };
    // Tiles 0 and 2 are the same text — swapping them must still grade 100%.
    expect(gradeArrangement(round, [2, 1, 0, 3])).toBe(1);
    expect(gradeArrangement(round, [0, 1, 2, 3])).toBe(1);
    // A genuinely wrong placement still fails the tier.
    const wrong = gradeArrangement(round, [1, 0, 2, 3]);
    expect(wrong).toBeCloseTo(0.75);
    expect(meetsThreshold(0.95, wrong, round.phrases.length)).toBe(false);
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

describe('dropTier', () => {
  it('rebuilds one tier lower without touching the chunk record', () => {
    // docs/03 §1: "failing a tier twice suggests dropping one tier —
    // suggestion, never forced". Session-local, so nothing is lost.
    let s = startSession({ goalId: 'g', chunkId: 'c', highestClearedTier: 5, now: 0 });
    expect(s.tier).toBe(6);
    const failed = recordRound(recordRound(s, { accuracy: 0.5, unitCount: 26 }).state, {
      accuracy: 0.5,
      unitCount: 26,
    });
    expect(failed.suggestDropTier).toBe(true);

    const dropped = dropTier(failed.state);
    expect(dropped.tier).toBe(5);
    expect(dropped.roundIndex).toBe(0);
    expect(dropped.failCount).toBe(0);
    expect(dropped.attemptNo).toBeGreaterThan(failed.state.attemptNo);
    expect(dropped.results).toEqual(failed.state.results); // history kept
    expect(dropped.chunkId).toBe('c');
  });

  it('bottoms out at Read', () => {
    let s = startSession({ goalId: 'g', chunkId: 'c', highestClearedTier: 1, now: 0 });
    for (let i = 0; i < 6; i++) s = dropTier(s);
    expect(s.tier).toBe(0);
    expect(dropTier(s).tier).toBe(0);
  });
});

describe('recordRound tolerance', () => {
  it('lets a short chunk clear a 95% tier with one slipped word', () => {
    const s = startSession({ goalId: 'g', chunkId: 'c', highestClearedTier: 4, now: 0 });
    expect(s.tier).toBe(5); // Type, threshold 0.95
    expect(recordRound(s, { accuracy: 0.9, unitCount: 10 }).band).toBe('pass');
    // Four slips in 40 words is outside the pass budget (2) — an almost now.
    expect(recordRound(s, { accuracy: 0.9, unitCount: 40 }).band).toBe('almost');
    expect(recordRound(s, { accuracy: 0.85, unitCount: 40 }).passed).toBe(false);
  });

  it('still freezes the round on a real miss', () => {
    let s = startSession({ goalId: 'g', chunkId: 'c', highestClearedTier: 4, now: 0 });
    for (let i = 0; i < 5; i++) s = recordRound(s, { accuracy: 0.5, unitCount: 26 }).state;
    expect(s.roundIndex).toBe(0);
    expect(s.failCount).toBe(5);
  });
});

describe('recordRound almost band', () => {
  const at = (highestClearedTier: number) =>
    startSession({ goalId: 'g', chunkId: 'c', highestClearedTier, now: 0 });

  it('advances the round like a pass and records the band', () => {
    // Tier 3 is two rounds at 90%: 8 blanks tolerate 1 miss, almost at 2.
    const s = at(2);
    const r = recordRound(s, { accuracy: 6 / 8, unitCount: 8 });
    expect(r.band).toBe('almost');
    expect(r.passed).toBe(true);
    expect(r.tierCleared).toBe(false);
    expect(r.state.roundIndex).toBe(1);
    expect(r.state.failCount).toBe(0);
    expect(r.state.results[0]).toMatchObject({ mode: 'blanks50', passed: true, band: 'almost' });
    expect(recordRound(r.state, { accuracy: 1, unitCount: 8 }).tierCleared).toBe(true);
  });

  it('clears a single-round tier and never suggests dropping', () => {
    const r = recordRound(at(4), { accuracy: 0.8, unitCount: 10 }); // Type, two slips in ten
    expect(r.band).toBe('almost');
    expect(r.tierCleared).toBe(true);
    expect(r.suggestDropTier).toBe(false);
  });

  it('still counts a real miss toward the drop-tier suggestion', () => {
    let r = recordRound(at(4), { accuracy: 0.7, unitCount: 10 });
    expect(r.band).toBe('miss');
    r = recordRound(r.state, { accuracy: 0.7, unitCount: 10 });
    expect(r.suggestDropTier).toBe(true);
  });

  it('keeps self-report rounds pass/miss', () => {
    expect(recordRound(at(-1), {}).band).toBe('pass');
    expect(recordRound(at(0), { selfPass: true }).band).toBe('pass');
    const miss = recordRound(at(0), { selfPass: false });
    expect(miss.band).toBe('miss');
    expect(miss.passed).toBe(false);
  });

  it('has no band when the round reports no length', () => {
    expect(recordRound(at(4), { accuracy: 0.94 }).band).toBe('miss');
    expect(recordRound(at(4), { accuracy: 0.95 }).band).toBe('pass');
  });

  it('survives serialization, and reads sessions saved before the band', () => {
    const r = recordRound(at(2), { accuracy: 6 / 8, unitCount: 8 });
    expect(deserializeSession(serializeSession(r.state))).toEqual(r.state);
    const legacy = { ...r.state, results: [{ mode: 'blanks50', accuracy: 0.75, passed: true }] };
    expect(deserializeSession(JSON.stringify(legacy))?.roundIndex).toBe(1);
  });
});

describe('topTierStanding', () => {
  const base = { tier: 6, memorized: false, dayBanked: false } as const;

  it('a clean Speak banks the day: sealed tomorrow', () => {
    expect(topTierStanding({ ...base, band: 'pass' })).toBe('sealsTomorrow');
  });

  it('an almost at Speak banks nothing and must say so', () => {
    expect(topTierStanding({ ...base, band: 'almost' })).toBe('needsCleanPass');
  });

  it('an almost at Speak after a clean Type today is still one day from sealed', () => {
    expect(topTierStanding({ ...base, band: 'almost', dayBanked: true })).toBe('sealsTomorrow');
  });

  it('reports memorized whatever the band', () => {
    expect(topTierStanding({ ...base, band: 'pass', memorized: true })).toBe('memorized');
    expect(topTierStanding({ ...base, tier: 5, band: 'pass', memorized: true })).toBe('memorized');
  });

  it('is null below the top tier, where the next tier is simply served', () => {
    expect(topTierStanding({ ...base, tier: 5, band: 'almost' })).toBeNull();
    expect(topTierStanding({ ...base, tier: 5, band: 'pass' })).toBeNull();
    expect(topTierStanding({ ...base, tier: 3, band: 'almost' })).toBeNull();
  });

  it('is null on a miss', () => {
    expect(topTierStanding({ ...base, band: 'miss' })).toBeNull();
  });
});

describe('retryTier', () => {
  it('re-serves the same Speak round after an almost, as a fresh attempt', () => {
    const s = startSession({ goalId: 'g', chunkId: 'c', highestClearedTier: 5, now: 0 });
    const done = recordRound(s, { accuracy: 0.8, unitCount: 10 });
    expect(done.band).toBe('almost');
    expect(isComplete(done.state)).toBe(true);

    const again = retryTier(done.state, 99);
    expect(again.chunkId).toBe('c');
    expect(again.tier).toBe(6);
    expect(currentMode(again)).toBe('speak');
    expect(again.results).toEqual([]);
    expect(again.attemptNo).toBeGreaterThan(done.state.attemptNo);
    expect(again.startedAt).toBe(99);
    // A clean recitation from here is an ordinary pass.
    expect(recordRound(again, { accuracy: 1, unitCount: 10 }).band).toBe('pass');
  });
});

describe('gradeArrangement transpositions', () => {
  const round = { phrases: ['a', 'b', 'c', 'd', 'e', 'f'], shuffledOrder: [0, 1, 2, 3, 4, 5] };

  it('scores a perfect order at 1', () => {
    expect(gradeArrangement(round, [0, 1, 2, 3, 4, 5])).toBe(1);
  });

  it('charges one adjacent swap as a single slip, and it clears the tier', () => {
    // Two tiles are out of place but the user made one mistake; at full
    // weight no tile count from 6 to 12 could absorb it (MAX_TILES is 12,
    // and 10/12 is 83%), so every swap failed Arrange forever.
    const swapped = [0, 1, 3, 2, 4, 5];
    expect(gradeArrangement(round, swapped)).toBeCloseTo(1 - 1 / 6);
    expect(meetsThreshold(0.95, gradeArrangement(round, swapped), 6)).toBe(true);
  });

  it('still fails two separate swaps', () => {
    const twice = [1, 0, 2, 3, 5, 4];
    expect(gradeArrangement(round, twice)).toBeCloseTo(1 - 2 / 6);
    expect(meetsThreshold(0.95, gradeArrangement(round, twice), 6)).toBe(false);
  });

  it('still fails a tile dragged far out of place', () => {
    // Placing 'f' first shifts everything: five tiles wrong, no swap among them.
    const shifted = [5, 0, 1, 2, 3, 4];
    expect(meetsThreshold(0.95, gradeArrangement(round, shifted), 6)).toBe(false);
  });

  it('still fails a reversed order', () => {
    expect(gradeArrangement(round, [5, 4, 3, 2, 1, 0])).toBeLessThan(0.5);
  });

  it('treats duplicate phrases as interchangeable', () => {
    const dup = { phrases: ['x', 'y', 'x', 'z'], shuffledOrder: [0, 1, 2, 3] };
    expect(gradeArrangement(dup, [2, 1, 0, 3])).toBe(1); // the two 'x' tiles swapped
  });

  it('scores an incomplete placement without crashing', () => {
    expect(gradeArrangement(round, [0, 1])).toBeCloseTo(1 - 4 / 6);
  });
});

describe('ladderProgress', () => {
  const fresh = () => startSession({ goalId: 'g', chunkId: 'c', highestClearedTier: -1, now: 0 });

  it('counts the whole ladder, not just the tier in progress', () => {
    expect(LADDER_ROUNDS).toBe(9);
    expect(ladderProgress(fresh())).toEqual({ done: 0, total: 9, pass: null });
  });

  it('carries the tiers already cleared into a later session', () => {
    // Blanks 50/75 (tier 3) sits behind Read, First Letters ×2 and Blanks 25.
    const s = startSession({ goalId: 'g', chunkId: 'c', highestClearedTier: 2, now: 0 });
    expect(ladderProgress(s).done).toBe(4);
    expect(ladderProgress(recordRound(s, { accuracy: 1, unitCount: 8 }).state).done).toBe(5);
  });

  it('names the repeat when an exercise runs twice', () => {
    let s = startSession({ goalId: 'g', chunkId: 'c', highestClearedTier: 0, now: 0 });
    expect(ladderProgress(s).pass).toEqual({ index: 1, of: 2 });
    s = recordRound(s, { selfPass: true }).state;
    expect(ladderProgress(s)).toEqual({ done: 2, total: 9, pass: { index: 2, of: 2 } });
  });

  it('does not advance on a failed round', () => {
    const s = startSession({ goalId: 'g', chunkId: 'c', highestClearedTier: 4, now: 0 });
    const failed = recordRound(s, { accuracy: 0.5, unitCount: 20 }).state;
    expect(ladderProgress(failed).done).toBe(ladderProgress(s).done);
  });

  it('is full once Speak is cleared', () => {
    const s = startSession({ goalId: 'g', chunkId: 'c', highestClearedTier: 5, now: 0 });
    const cleared = recordRound(s, { accuracy: 1, unitCount: 20 }).state;
    expect(ladderProgress(cleared)).toEqual({ done: 9, total: 9, pass: null });
  });
});
