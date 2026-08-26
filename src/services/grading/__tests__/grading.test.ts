import { describe, expect, it } from 'vitest';

import { gradeSpoken, gradeTyped, metaphone, similarity } from '@/services/grading';

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
