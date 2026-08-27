import { describe, expect, it } from 'vitest';

import { chaptersInRange, parseEsvPassage } from '@/services/bible/esv';

describe('parseEsvPassage', () => {
  it('splits bracketed verse markers into verses', () => {
    const passage =
      '  [1] Paul and Timothy, servants of Christ Jesus,\n\nTo all the saints in Christ Jesus who are at Philippi, with the overseers and deacons: [2] Grace to you and peace from God our Father and the Lord Jesus Christ.\n';
    const verses = parseEsvPassage(passage, 'Phil', 1);
    expect(verses).toHaveLength(2);
    expect(verses[0]).toMatchObject({ translationId: 'esv', bookId: 'Phil', chapter: 1, verse: 1 });
    expect(verses[0].text).toContain('Paul and Timothy, servants of Christ Jesus');
    expect(verses[0].text).not.toContain('[');
    expect(verses[1].verse).toBe(2);
    expect(verses[1].text).toBe(
      'Grace to you and peace from God our Father and the Lord Jesus Christ.'
    );
  });

  it('collapses internal whitespace and drops empty segments', () => {
    const verses = parseEsvPassage('[1] In the   beginning\n\n  was the Word. [2]   ', 'John', 1);
    expect(verses).toHaveLength(1);
    expect(verses[0].text).toBe('In the beginning was the Word.');
  });

  it('handles poetry line breaks inside one verse', () => {
    const verses = parseEsvPassage(
      '[1] The LORD is my shepherd;\n    I shall not want.\n[2] He makes me lie down in green pastures.',
      'Ps',
      23
    );
    expect(verses[0].text).toBe('The LORD is my shepherd; I shall not want.');
    expect(verses[1].verse).toBe(2);
  });
});

describe('chaptersInRange', () => {
  it('lists chapters inclusively', () => {
    expect(
      chaptersInRange({ bookId: 'John', chapter: 1, verse: 5 }, { bookId: 'John', chapter: 3, verse: 2 })
    ).toEqual([1, 2, 3]);
  });
});
