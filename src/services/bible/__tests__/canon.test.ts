import { describe, expect, it } from 'vitest';

import { BOOKS, bookOrder, getBook, isValidBookId } from '@/services/bible/canon';

describe('canon', () => {
  it('has the 66-book Protestant canon', () => {
    expect(BOOKS).toHaveLength(66);
    expect(BOOKS.filter((b) => b.testament === 'ot')).toHaveLength(39);
    expect(BOOKS.filter((b) => b.testament === 'nt')).toHaveLength(27);
  });

  it('has unique OSIS ids and slugs', () => {
    expect(new Set(BOOKS.map((b) => b.id)).size).toBe(66);
    expect(new Set(BOOKS.map((b) => b.webSlug)).size).toBe(66);
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
