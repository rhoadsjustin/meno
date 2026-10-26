import { describe, expect, it } from 'vitest';

import {
  firstGrapheme,
  graphemeSegmenter,
  isEnglish,
  splitUnspaced,
  wordSegmenter,
} from '@/services/grading/script';

describe('isEnglish', () => {
  it('treats English tags and no tag as English, nothing else', () => {
    expect(isEnglish(undefined)).toBe(true);
    expect(isEnglish('en')).toBe(true);
    expect(isEnglish('en-GB')).toBe(true);
    expect(isEnglish('es-MX')).toBe(false);
    expect(isEnglish('hi')).toBe(false);
  });
});

describe('splitUnspaced', () => {
  it('leaves spaced scripts alone', () => {
    expect(splitUnspaced('Jesús', null)).toEqual(['Jesús']);
    expect(splitUnspaced('परमेश्वर', null)).toEqual(['परमेश्वर']);
  });

  it('falls back to one unit per letter, dropping punctuation', () => {
    expect(splitUnspaced('神爱世人，甚至', null)).toEqual(['神', '爱', '世', '人', '甚', '至']);
    // Thai letters keep their marks as one unit each.
    expect(splitUnspaced('พระเจ้า', null)).toEqual(['พ', 'ร', 'ะ', 'เ', 'จ้', 'า']);
  });

  it('uses the runtime word segmenter when there is one', () => {
    if (!wordSegmenter) return; // Hermes: covered by the fallback above
    const words = splitUnspaced('神爱世人，甚至将他的独生子赐给他们');
    expect(words.length).toBeGreaterThan(1);
    expect(words.join('')).toBe('神爱世人甚至将他的独生子赐给他们');
  });
});

describe('firstGrapheme', () => {
  it('keeps accents and marks with their letter', () => {
    expect(firstGrapheme('él', null)).toBe('é');
    expect(firstGrapheme('Él', null)).toBe('É');
    expect(firstGrapheme('él', null)).toBe('é');
    expect(firstGrapheme('लूका', null)).toBe('लू');
    expect(firstGrapheme('لأَنَّهُ', null)).toBe('ل');
    expect(firstGrapheme('', null)).toBe('');
  });

  it('carries an Indic conjunct across the virama', () => {
    expect(firstGrapheme('क्योंकि', null)).toBe('क्यों');
    expect(firstGrapheme('प्रेम', null)).toBe('प्रे');
  });

  it('agrees with the runtime grapheme segmenter when there is one', () => {
    if (!graphemeSegmenter) return;
    expect(firstGrapheme('él')).toBe('é');
    expect(firstGrapheme('लूका')).toBe('लू');
  });
});
