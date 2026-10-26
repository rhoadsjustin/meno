import { describe, expect, it } from 'vitest';

import { BOOKS, bookOrder, getBook, getBookByUsfm, isValidBookId } from '@/services/bible/canon';

describe('canon', () => {
  it('has the 66-book Protestant canon', () => {
    expect(BOOKS).toHaveLength(66);
    expect(BOOKS.filter((b) => b.testament === 'ot')).toHaveLength(39);
    expect(BOOKS.filter((b) => b.testament === 'nt')).toHaveLength(27);
  });

  it('has unique OSIS ids, USFM ids and slugs', () => {
    expect(new Set(BOOKS.map((b) => b.id)).size).toBe(66);
    expect(new Set(BOOKS.map((b) => b.usfm)).size).toBe(66);
    expect(new Set(BOOKS.map((b) => b.webSlug)).size).toBe(66);
    for (const b of BOOKS) expect(b.usfm).toMatch(/^[1-3A-Z][A-Z]{2}$/);
  });

  it('maps USFM ids (what the YouVersion Platform speaks) back to OSIS', () => {
    expect(getBookByUsfm('JHN')?.id).toBe('John');
    expect(getBookByUsfm('1CO')?.id).toBe('1Cor');
    expect(getBookByUsfm('PSA')?.id).toBe('Ps');
    expect(getBookByUsfm('SNG')?.id).toBe('Song');
    expect(getBookByUsfm('EZK')?.id).toBe('Ezek');
    expect(getBookByUsfm('NAM')?.id).toBe('Nah');
    expect(getBookByUsfm('PHP')?.id).toBe('Phil');
    expect(getBookByUsfm('PHM')?.id).toBe('Phlm');
    expect(getBookByUsfm('TOB')).toBeNull();
    expect(getBook('John').usfm).toBe('JHN');
  });

  it('has 1,189 chapters in total', () => {
    expect(BOOKS.reduce((sum, b) => sum + b.chapters, 0)).toBe(1189);
  });

  it('looks up books by OSIS id', () => {
    expect(getBook('John').name).toBe('John');
    expect(getBook('1Cor').chapters).toBe(16);
    expect(getBook('Ps').chapters).toBe(150);
    expect(() => getBook('Jhn')).toThrow(/Unknown OSIS book id/);
    expect(isValidBookId('Gen')).toBe(true);
    expect(isValidBookId('Genesis')).toBe(false);
  });

  it('orders books canonically', () => {
    expect(bookOrder('Gen')).toBe(0);
    expect(bookOrder('Mal')).toBe(38);
    expect(bookOrder('Matt')).toBe(39);
    expect(bookOrder('Rev')).toBe(65);
  });
});
