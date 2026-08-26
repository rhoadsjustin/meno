import { describe, expect, it } from 'vitest';

import {
  compareRefs,
  formatRange,
  formatRef,
  parseOsisRef,
  refInRange,
  refToOsis,
} from '@/services/bible/refs';

const john316 = { bookId: 'John', chapter: 3, verse: 16 };

describe('refs', () => {
  it('orders references canonically', () => {
    expect(compareRefs(john316, john316)).toBe(0);
    expect(compareRefs({ bookId: 'Gen', chapter: 1, verse: 1 }, john316)).toBeLessThan(0);
    expect(compareRefs({ bookId: 'John', chapter: 3, verse: 17 }, john316)).toBeGreaterThan(0);
    expect(compareRefs({ bookId: 'John', chapter: 4, verse: 1 }, john316)).toBeGreaterThan(0);
    expect(compareRefs({ bookId: 'Rev', chapter: 1, verse: 1 }, john316)).toBeGreaterThan(0);
  });

  it('checks range membership inclusively', () => {
    const phil1 = {
      start: { bookId: 'Phil', chapter: 1, verse: 1 },
      end: { bookId: 'Phil', chapter: 1, verse: 30 },
    };
    expect(refInRange({ bookId: 'Phil', chapter: 1, verse: 1 }, phil1)).toBe(true);
    expect(refInRange({ bookId: 'Phil', chapter: 1, verse: 30 }, phil1)).toBe(true);
    expect(refInRange({ bookId: 'Phil', chapter: 2, verse: 1 }, phil1)).toBe(false);
    expect(refInRange({ bookId: 'Eph', chapter: 1, verse: 1 }, phil1)).toBe(false);
  });

  it('formats references for humans', () => {
    expect(formatRef(john316)).toBe('John 3:16');
    expect(formatRef({ bookId: '1Cor', chapter: 13, verse: 4 })).toBe('1 Corinthians 13:4');
    expect(
      formatRange({ start: john316, end: john316 })
    ).toBe('John 3:16');
    expect(
      formatRange({
        start: { bookId: 'Phil', chapter: 1, verse: 1 },
        end: { bookId: 'Phil', chapter: 1, verse: 11 },
      })
    ).toBe('Philippians 1:1–11');
    expect(
      formatRange({
        start: { bookId: 'John', chapter: 3, verse: 16 },
        end: { bookId: 'John', chapter: 4, verse: 2 },
      })
    ).toBe('John 3:16–4:2');
  });

  it('round-trips OSIS machine ids', () => {
    expect(refToOsis(john316)).toBe('John.3.16');
    expect(parseOsisRef('John.3.16')).toEqual(john316);
    expect(parseOsisRef('1Cor.13.4')).toEqual({ bookId: '1Cor', chapter: 13, verse: 4 });
    expect(() => parseOsisRef('John.3')).toThrow(/Invalid OSIS ref/);
    expect(() => parseOsisRef('Jhn.3.16')).toThrow(/Unknown OSIS book id/);
    expect(() => parseOsisRef('John.22.1')).toThrow(/Invalid chapter/);
    expect(() => parseOsisRef('John.3.0')).toThrow(/Invalid verse/);
  });
});
