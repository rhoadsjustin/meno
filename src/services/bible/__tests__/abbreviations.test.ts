import { afterEach, describe, expect, it } from 'vitest';

import { applyLocale } from '@/i18n';
import {
  BOOK_ABBREVIATIONS_ES,
  bookAbbreviation,
  formatRangeShort,
} from '@/services/bible/abbreviations';
import { BOOKS } from '@/services/bible/canon';
import { bookName } from '@/services/bible/refs';

const ref = (bookId: string, chapter: number, verse: number) => ({ bookId, chapter, verse });

afterEach(() => applyLocale(['en-US']));

describe('book abbreviations', () => {
  it('covers the whole canon in Spanish, and nothing else', () => {
    expect(Object.keys(BOOK_ABBREVIATIONS_ES).sort()).toEqual(BOOKS.map((b) => b.id).sort());
  });

  it.each(['en-US', 'es-MX'])('is unique and never longer than the name (%s)', (tag) => {
    applyLocale([tag]);
    const all = BOOKS.map((b) => bookAbbreviation(b.id));
    expect(new Set(all).size).toBe(BOOKS.length);
    for (const b of BOOKS) {
      expect(bookAbbreviation(b.id).length).toBeLessThanOrEqual(bookName(b.id).length);
    }
  });

  it('formats the inline widget reference of docs/05 §1', () => {
    expect(formatRangeShort({ start: ref('Phil', 4, 6), end: ref('Phil', 4, 6) })).toBe('Phil 4:6');
    expect(formatRangeShort({ start: ref('1Thess', 5, 16), end: ref('1Thess', 5, 18) })).toBe(
      '1 Thess 5:16–18',
    );
    expect(formatRangeShort({ start: ref('John', 3, 16), end: ref('John', 4, 2) })).toBe(
      'John 3:16–4:2',
    );
    expect(formatRangeShort({ start: ref('Mal', 4, 6), end: ref('Matt', 1, 1) })).toBe(
      'Mal 4:6 – Matt 1:1',
    );
  });

  it('abbreviates in Spanish', () => {
    applyLocale(['es-MX']);
    expect(formatRangeShort({ start: ref('Phil', 4, 6), end: ref('Phil', 4, 6) })).toBe('Fil 4:6');
    expect(formatRangeShort({ start: ref('1Thess', 5, 16), end: ref('1Thess', 5, 18) })).toBe(
      '1 Ts 5:16–18',
    );
  });
});
