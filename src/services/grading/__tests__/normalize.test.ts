import { describe, expect, it } from 'vitest';

import { normalize, tokenize } from '@/services/grading/normalize';

describe('normalize', () => {
  it('lowercases, strips punctuation, collapses whitespace', () => {
    expect(normalize('For God so loved the world,   that he gave')).toBe(
      'for god so loved the world that he gave',
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

  it('keeps every script: Spanish accents fold, Hindi and Arabic words survive', () => {
    expect(
      tokenize('Él vino por testimonio, para que diese testimonio de la luz.', { language: 'es' }),
    ).toEqual([
      'el',
      'vino',
      'por',
      'testimonio',
      'para',
      'que',
      'diese',
      'testimonio',
      'de',
      'la',
      'luz',
    ]);
    expect(normalize('Jesús', { language: 'es' })).toBe(normalize('Jesus', { language: 'es' }));
    expect(tokenize('क्योंकि परमेश्वर ने जगत से ऐसा प्रेम रखा।', { language: 'hi' })).toEqual([
      'क्योंकि',
      'परमेश्वर',
      'ने',
      'जगत',
      'से',
      'ऐसा',
      'प्रेम',
      'रखा',
    ]);
    // Harakat are optional in typed Arabic, so they do not count against the user.
    expect(tokenize('لأَنَّهُ هكَذَا أَحَبَّ اللهُ الْعَالَمَ', { language: 'ar' })).toEqual(
      tokenize('لأنه هكذا أحب الله العالم', { language: 'ar' }),
    );
    expect(tokenize('لأنه هكذا', { language: 'ar' })).toHaveLength(2);
  });

  it('splits unspaced scripts into words so Chinese is not one token', () => {
    const tokens = tokenize('神爱世人，甚至将他的独生子赐给他们', { language: 'zh-Hans' });
    expect(tokens.length).toBeGreaterThan(1);
    expect(tokens.join('')).toBe('神爱世人甚至将他的独生子赐给他们');
  });

  it('folds number words for English only', () => {
    expect(normalize('forty', { language: 'en-US' })).toBe('40');
    expect(normalize('forty', { language: 'es' })).toBe('forty');
    expect(normalize('cuarenta días', { language: 'es' })).toBe('cuarenta dias');
  });
});
