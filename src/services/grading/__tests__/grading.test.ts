import { describe, expect, it } from 'vitest';

import {
  almostBudget,
  almostThresholdFor,
  errorBudget,
  gradeBand,
  slipCount,
  gradeSpoken,
  gradeTyped,
  meetsThreshold,
  metaphone,
  MIN_PASS_ACCURACY,
  similarity,
  thresholdFor,
} from '@/services/grading';

const verse = 'For God so loved the world, that he gave his one and only Son';

describe('gradeTyped', () => {
  it('scores a perfect attempt at 1', () => {
    const r = gradeTyped(verse, 'for god so loved the world that he gave his one and only son');
    expect(r.accuracy).toBe(1);
    expect(r.words.every((w) => w.tag === 'correct')).toBe(true);
    expect(r.insertions).toHaveLength(0);
  });

  it('counts near-miss spellings as typos at half weight', () => {
    expect(similarity('receive', 'recieve')).toBeGreaterThanOrEqual(0.8);
    const r = gradeTyped('you shall receive power', 'you shall recieve power');
    const typo = r.words.find((w) => w.word === 'receive');
    expect(typo?.tag).toBe('typo');
    expect(typo?.said).toBe('recieve');
    expect(r.accuracy).toBe(1 - 0.5 / 4);
  });

  it('tags wrong, missed, and inserted words', () => {
    const r = gradeTyped('the quick brown fox jumps', 'the slow fox jumps high');
    const byWord = Object.fromEntries(r.words.map((w) => [w.word, w.tag]));
    // "slow" substitutes one of quick/brown; the other is missed — both
    // alignments cost the same, so accept either.
    expect([byWord['quick'], byWord['brown']].sort()).toEqual(['missed', 'wrong']);
    expect(byWord['the']).toBe('correct');
    expect(r.insertions).toEqual([{ word: 'high', beforeIndex: 5 }]);
    // errors: wrong(1) + missed(1) + inserted(1) over 5 reference words
    expect(r.accuracy).toBeCloseTo(1 - 3 / 5);
  });

  it('floors accuracy at 0', () => {
    const r = gradeTyped('a b', 'x y z w v u t s');
    expect(r.accuracy).toBe(0);
  });

  it('requires archaic forms verbatim (KJV)', () => {
    const r = gradeTyped('thou shalt love thy neighbour', 'you shall love your neighbour');
    const tags = r.words.map((w) => w.tag);
    expect(tags.filter((t) => t === 'correct')).toHaveLength(2); // love, neighbour
    expect(r.accuracy).toBeLessThan(0.9);
  });

  it('treats number words and digits as equal', () => {
    const r = gradeTyped('forty days and forty nights', '40 days and 40 nights');
    expect(r.accuracy).toBe(1);
  });
});

describe('gradeSpoken', () => {
  it('accepts homophones via metaphone', () => {
    expect(metaphone('their')).toBe(metaphone('there'));
    expect(metaphone('Saul')).toBe(metaphone('soul'));
    const r = gradeSpoken('their hearts were glad', 'there hearts were glad');
    expect(r.accuracy).toBe(1);
  });

  it('ignores leading/trailing fillers but counts mid-verse insertions', () => {
    const clean = gradeSpoken('the lord is my shepherd', 'um the lord is my shepherd okay');
    expect(clean.accuracy).toBe(1);
    const drift = gradeSpoken('the lord is my shepherd', 'the lord um is my shepherd');
    expect(drift.accuracy).toBeLessThan(1);
  });

  it('grades Psalm 23:1 with sensible leniency', () => {
    const r = gradeSpoken(
      'Yahweh is my shepherd: I shall lack nothing.',
      'yahweh is my shepherd i shall lack nothing'
    );
    expect(r.accuracy).toBe(1);
  });
});

describe('errorBudget / meetsThreshold', () => {
  it('never demands literal perfection above a handful of words', () => {
    // The bare proportional budget is (1 - threshold) * length, which is < 1
    // for anything under 20 words at the 95% tiers — one slip then fails
    // forever, since a failed round never advances (services/practice).
    for (const words of [5, 8, 10, 14, 17, 19]) {
      expect(errorBudget(0.95, words)).toBeGreaterThanOrEqual(1);
      expect(meetsThreshold(0.95, 1 - 1 / words, words)).toBe(true);
    }
  });

  it('leaves long chunks exactly as tolerant as before', () => {
    expect(errorBudget(0.95, 20)).toBeCloseTo(1);
    expect(errorBudget(0.95, 26)).toBeCloseTo(1.3);
    expect(errorBudget(0.95, 60)).toBeCloseTo(3);
    expect(meetsThreshold(0.95, 1 - 2 / 26, 26)).toBe(false);
  });

  it('never passes a round below MIN_PASS_ACCURACY', () => {
    for (const units of [1, 2, 3, 4, 8, 10, 26, 60]) {
      expect(thresholdFor(0.95, units)).toBeGreaterThanOrEqual(MIN_PASS_ACCURACY - 1e-9);
    }
    // "Jesus wept." — a near-miss on one of two words is still not a pass.
    const short = gradeSpoken('Jesus wept.', 'Jesus swept');
    expect(short.accuracy).toBeCloseTo(0.75);
    expect(meetsThreshold(0.95, short.accuracy, short.unitCount)).toBe(false);
  });

  it('forgives one slipped word in a short verse', () => {
    // Phil 4:13 (WEB) is 10 words: one wrong word used to score 90% and repeat.
    const phil = 'I can do all things through Christ, who strengthens me.';
    const said = 'I can do all things through Christ, who strengthens us.';
    const g = gradeSpoken(phil, said);
    expect(g.accuracy).toBeLessThan(0.95);
    expect(meetsThreshold(0.95, g.accuracy, g.unitCount)).toBe(true);
  });

  it('a perfect answer passes at every length', () => {
    for (const units of [1, 2, 5, 20, 60]) expect(meetsThreshold(0.95, 1, units)).toBe(true);
  });

  it('reports the reference length it graded against', () => {
    expect(gradeTyped('For God so loved the world', 'For God so loved the world').unitCount).toBe(6);
  });
});

describe('gradeBand (pass / almost / miss)', () => {
  // Phil 4:13 (WEB), 10 words.
  const phil = 'I can do all things through Christ, who strengthens me.';
  // A 30-word chunk, built so slips are easy to count.
  const thirty = Array.from({ length: 30 }, (_, i) => `word${String.fromCharCode(97 + i)}x`);
  const drop = (words: string[], n: number) => words.slice(n).join(' ');

  it('never lets an almost fall below 75%, however short the chunk', () => {
    // Five words: twice the one-word budget would be two wrong (60%).
    expect(almostBudget(0.95, 5)).toBeCloseTo(1.25);
    expect(gradeBand(0.95, 3 / 5, 5)).toBe('miss');
    expect(gradeBand(0.9, 3 / 5, 5)).toBe('miss'); // five blanks, three right
    for (let units = 5; units <= 60; units++) {
      for (const threshold of [0.9, 0.95]) {
        expect(almostThresholdFor(threshold, units)).toBeGreaterThanOrEqual(0.75 - 1e-9);
        // ...and the band never sits inside the pass budget.
        expect(almostBudget(threshold, units)).toBeGreaterThanOrEqual(
          errorBudget(threshold, units) - 1e-9,
        );
      }
    }
  });

  it('is twice the pass budget once the chunk is long enough', () => {
    for (const units of [8, 10, 20, 30, 60]) {
      expect(almostBudget(0.95, units)).toBeCloseTo(2 * errorBudget(0.95, units));
    }
    expect(almostBudget(0.95, 10)).toBeCloseTo(2);
    expect(almostBudget(0.95, 30)).toBeCloseTo(3);
    expect(almostThresholdFor(0.95, 10)).toBeCloseTo(0.8);
    expect(almostThresholdFor(0.95, 30)).toBeCloseTo(0.9);
  });

  it('bands a 10-word verse at the Type tier', () => {
    const band = (said: string) => {
      const g = gradeTyped(phil, said);
      return gradeBand(0.95, g.accuracy, g.unitCount);
    };
    expect(band(phil)).toBe('pass');
    expect(band('I can do all things through Christ, who strengthens us.')).toBe('pass'); // 1
    expect(band('I can do all things through Christ who strengthens')).toBe('pass'); // 1 missing
    expect(band('I can do all things through Jesus, who strengthens us.')).toBe('almost'); // 2
    expect(band('I can do things through Christ, who strengthens')).toBe('almost'); // 2 missing
    expect(band('I can do things through Jesus, who strengthens us.')).toBe('miss'); // 3
    // One wrong word and one typo is 1.5 weighted errors: past the pass, inside the band.
    expect(band('I can do all thigns through Christ, who strengthens us.')).toBe('almost');
  });

  it('bands a 30-word chunk at the Type tier', () => {
    const band = (missing: number) => {
      const g = gradeTyped(thirty.join(' '), drop(thirty, missing));
      return gradeBand(0.95, g.accuracy, g.unitCount);
    };
    expect(band(0)).toBe('pass');
    expect(band(1)).toBe('pass'); // budget 1.5
    expect(band(2)).toBe('almost');
    expect(band(3)).toBe('almost'); // 2 × 1.5
    expect(band(4)).toBe('miss');
  });

  it('pass is exactly meetsThreshold, at every length and score', () => {
    for (const units of [1, 2, 3, 4, 5, 10, 19, 20, 30, 60]) {
      for (let errors = 0; errors <= units; errors += 0.5) {
        const accuracy = 1 - errors / units;
        for (const threshold of [0.9, 0.95]) {
          expect(gradeBand(threshold, accuracy, units) === 'pass').toBe(
            meetsThreshold(threshold, accuracy, units)
          );
        }
      }
    }
  });

  it('an almost never satisfies the strict bar the Memorized rule uses', () => {
    const g = gradeTyped(phil, 'I can do all things through Jesus, who strengthens us.');
    expect(gradeBand(0.95, g.accuracy, g.unitCount)).toBe('almost');
    expect(meetsThreshold(0.95, g.accuracy, g.unitCount)).toBe(false);
  });

  it('has no almost band under five units: "Jesus wept." must be exact', () => {
    const near = gradeSpoken('Jesus wept.', 'Jesus swept');
    expect(gradeBand(0.95, near.accuracy, near.unitCount)).toBe('miss');
    expect(gradeBand(0.95, gradeTyped('Jesus wept.', 'Jesus').accuracy, 2)).toBe('miss');
    expect(gradeBand(0.95, gradeTyped('Jesus wept.', 'Jesus wept').accuracy, 2)).toBe('pass');
    for (const units of [1, 2, 3, 4]) {
      expect(almostBudget(0.95, units)).toBeCloseTo(errorBudget(0.95, units));
      expect(almostThresholdFor(0.95, units)).toBeCloseTo(thresholdFor(0.95, units));
      // One whole wrong word is a miss at these lengths, as it was before.
      expect(gradeBand(0.95, 1 - 1 / units, units)).toBe('miss');
    }
  });

  it('has no band without a length: the strict rule, never a free almost', () => {
    expect(gradeBand(0.95, 0.94, 0)).toBe('miss');
    expect(gradeBand(0.95, 0.95, 0)).toBe('pass');
  });

  it('applies to blanks and tiles as well as words', () => {
    // 8 blanks at the 90% tiers: 1 miss passes, 2 is an almost, 3 a miss.
    expect(gradeBand(0.9, 7 / 8, 8)).toBe('pass');
    expect(gradeBand(0.9, 6 / 8, 8)).toBe('almost');
    expect(gradeBand(0.9, 5 / 8, 8)).toBe('miss');
  });

  it('never bands a wild answer as almost', () => {
    for (const units of [5, 10, 30, 60]) expect(gradeBand(0.95, 0.5, units)).toBe('miss');
  });
});

describe('slipCount', () => {
  it('counts wrong, missed, typo and extra words once each', () => {
    expect(slipCount(gradeTyped(verse, verse))).toBe(0);
    expect(slipCount(gradeTyped('receive the word', 'recieve the word'))).toBe(1);
    expect(slipCount(gradeTyped('For God so loved the world', 'For God loved the whole world'))).toBe(2);
  });
});
