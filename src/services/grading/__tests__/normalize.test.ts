import { describe, expect, it } from 'vitest';

import { normalize, tokenize } from '@/services/grading/normalize';

describe('normalize', () => {
  it('lowercases, strips punctuation, collapses whitespace', () => {
    expect(normalize('For God so loved the world,   that he gave')).toBe(
      'for god so loved the world that he gave'
    );
    expect(normalize('“Come!” he said.')).toBe('come he said');
  });

  it('keeps intra-word apostrophes', () => {
    expect(normalize("God's")).toBe("god's");
    expect(normalize('‘God’s word’')).toBe("god's word");
  });

  it('strips diacritics', () => {
    expect(normalize('naïve résumé')).toBe('naive resume');
  });

  it('canonicalizes number words to digits', () => {
    expect(normalize('forty')).toBe('40');
    expect(normalize('forty-two')).toBe('42');
    expect(normalize('seventy times seven')).toBe('70 times 7');
    expect(normalize('a hundred forty four thousand')).toBe('a 144000');
    expect(normalize('12 apostles')).toBe('12 apostles');
  });

  it('preserves KJV archaic forms untouched', () => {
    expect(tokenize('Thou shalt not steal')).toEqual(['thou', 'shalt', 'not', 'steal']);
    expect(normalize('thee thy thine')).toBe('thee thy thine');
  });

  it('never merges separate digit tokens', () => {
    expect(normalize('2 3')).toBe('2 3');
  });
});
