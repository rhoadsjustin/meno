import { describe, expect, it } from 'vitest';

import { formatRange } from '@/services/bible/refs';
import {
  chaptersToExtendThrough,
  clampToChapter,
  defaultSelection,
  extendThroughChapter,
  isVerseSelected,
  selectWholeChapter,
  selectionToRange,
  setEnd,
  setStart,
  tapVerse,
  type PassageSelection,
} from '@/services/bible/selection';

const at = (chapter: number, verse: number) => ({ chapter, verse });
const echo = (s: PassageSelection) => formatRange(selectionToRange(s));

describe('passage selection', () => {
  it('opens on verse 1:1, settled, so the wizard can continue untouched', () => {
    const s = defaultSelection('John');
    expect(echo(s)).toBe('John 1:1');
    expect(s.open).toBe(false);
  });

  it('treats a single tap as a single verse', () => {
    const s = tapVerse(defaultSelection('John'), 'John', at(3, 16));
    expect(echo(s)).toBe('John 3:16');
    expect(s.open).toBe(true);
  });

  it('closes the range on the second tap', () => {
    const first = tapVerse(null, 'John', at(3, 16));
    const s = tapVerse(first, 'John', at(3, 18));
    expect(echo(s)).toBe('John 3:16–18');
    expect(s.open).toBe(false);
  });

  it('accepts the last verse first', () => {
    const first = tapVerse(null, 'John', at(3, 18));
    expect(echo(tapVerse(first, 'John', at(3, 16)))).toBe('John 3:16–18');
  });

  it('settles on one verse when the same verse is tapped twice', () => {
    const first = tapVerse(null, 'John', at(3, 16));
    const s = tapVerse(first, 'John', at(3, 16));
    expect(echo(s)).toBe('John 3:16');
    expect(s.open).toBe(false);
  });

  it('starts over on a tap after the range is settled', () => {
    const range = tapVerse(tapVerse(null, 'John', at(3, 16)), 'John', at(3, 18));
    const s = tapVerse(range, 'John', at(3, 20));
    expect(echo(s)).toBe('John 3:20');
    expect(s.open).toBe(true);
  });

  it('closes a range across chapters of the same book', () => {
    const first = tapVerse(null, 'John', at(3, 16));
    expect(echo(tapVerse(first, 'John', at(4, 2)))).toBe('John 3:16–4:2');
  });

  it('never spans books: a tap in another book starts over there', () => {
    const first = tapVerse(null, 'John', at(3, 16));
    const s = tapVerse(first, 'Phil', at(1, 3));
    expect(echo(s)).toBe('Philippians 1:3');
    expect(s.open).toBe(true);
  });

  it('selects a whole chapter', () => {
    const s = selectWholeChapter('Phil', 2, 30);
    expect(echo(s)).toBe('Philippians 2:1–30');
    expect(s.open).toBe(false);
  });

  it('extends a whole chapter through a later one', () => {
    const s = extendThroughChapter(selectWholeChapter('Phil', 1, 30), 'Phil', 1, 4, 23);
    expect(echo(s)).toBe('Philippians 1:1–4:23');
    expect(s.open).toBe(false);
  });

  it('extends from a chosen verse and keeps it as the start', () => {
    const first = tapVerse(null, 'John', at(3, 16));
    expect(echo(extendThroughChapter(first, 'John', 3, 5, 47))).toBe('John 3:16–5:47');
  });

  it('extends from the top of the viewed chapter when nothing is selected', () => {
    expect(echo(extendThroughChapter(null, 'Phil', 2, 3, 21))).toBe('Philippians 2:1–3:21');
  });

  it('ignores an extension to a chapter before the start', () => {
    const s = selectWholeChapter('Phil', 3, 21);
    expect(extendThroughChapter(s, 'Phil', 3, 2, 30)).toBe(s);
  });

  it('can shorten a range by extending through an earlier chapter than its end', () => {
    const long = extendThroughChapter(selectWholeChapter('Phil', 1, 30), 'Phil', 1, 4, 23);
    expect(echo(extendThroughChapter(long, 'Phil', 1, 2, 30))).toBe('Philippians 1:1–2:30');
  });

  it('lists the chapters a range can run through', () => {
    const s = tapVerse(null, 'Phil', at(2, 5));
    expect(chaptersToExtendThrough(s, 'Phil', 1, 4)).toEqual([3, 4]);
    expect(chaptersToExtendThrough(null, 'Phil', 1, 4)).toEqual([2, 3, 4]);
    expect(chaptersToExtendThrough(null, 'Jude', 1, 1)).toEqual([]);
    expect(chaptersToExtendThrough(selectWholeChapter('Phil', 4, 23), 'Phil', 4, 4)).toEqual([]);
    // A portion with gaps: Genesis 1–12, 15–18.
    const portion = [1, 2, 3, 10, 11, 12, 15, 16, 17, 18];
    expect(chaptersToExtendThrough(null, 'Gen', 10, portion)).toEqual([11, 12]);
    expect(chaptersToExtendThrough(null, 'Gen', 12, portion)).toEqual([]);
    expect(chaptersToExtendThrough(null, 'Gen', 15, portion)).toEqual([16, 17, 18]);
  });

  it('moves the start and keeps the end', () => {
    const range = tapVerse(tapVerse(null, 'John', at(3, 16)), 'John', at(3, 18));
    expect(echo(setStart(range, 'John', at(3, 14)))).toBe('John 3:14–18');
    expect(echo(setStart(range, 'John', at(3, 18)))).toBe('John 3:18');
  });

  it('begins a new selection when the start lands after the end', () => {
    const range = tapVerse(tapVerse(null, 'John', at(3, 16)), 'John', at(3, 18));
    const s = setStart(range, 'John', at(3, 20));
    expect(echo(s)).toBe('John 3:20');
    expect(s.open).toBe(true);
  });

  it('moves the end and keeps the start', () => {
    const range = tapVerse(tapVerse(null, 'John', at(3, 16)), 'John', at(3, 18));
    expect(echo(setEnd(range, 'John', at(3, 21)))).toBe('John 3:16–21');
    expect(echo(setEnd(range, 'John', at(4, 2)))).toBe('John 3:16–4:2');
  });

  it('begins a new selection when the end lands before the start', () => {
    const range = tapVerse(tapVerse(null, 'John', at(3, 16)), 'John', at(3, 18));
    const s = setEnd(range, 'John', at(3, 2));
    expect(echo(s)).toBe('John 3:2');
    expect(s.open).toBe(true);
    expect(echo(setEnd(null, 'John', at(3, 2)))).toBe('John 3:2');
  });

  it('clamps ends that fall past a chapter’s real length', () => {
    const s = selectWholeChapter('3John', 1, 15);
    expect(echo(clampToChapter(s, 1, 14))).toBe('3 John 1:1–14');
    const one = tapVerse(null, '3John', at(1, 15));
    expect(echo(clampToChapter(one, 1, 14))).toBe('3 John 1:14');
  });

  it('leaves a selection alone when it already fits, or sits in another chapter', () => {
    const s = tapVerse(tapVerse(null, 'John', at(3, 16)), 'John', at(4, 2));
    expect(clampToChapter(s, 3, 36)).toBe(s);
    expect(clampToChapter(s, 5, 1)).toBe(s);
    expect(echo(clampToChapter(s, 4, 1))).toBe('John 3:16–4:1');
  });

  it('reports which verses are inside the selection', () => {
    const s = tapVerse(tapVerse(null, 'John', at(3, 16)), 'John', at(4, 2));
    expect(isVerseSelected(s, 'John', at(3, 15))).toBe(false);
    expect(isVerseSelected(s, 'John', at(3, 16))).toBe(true);
    expect(isVerseSelected(s, 'John', at(3, 36))).toBe(true);
    expect(isVerseSelected(s, 'John', at(4, 2))).toBe(true);
    expect(isVerseSelected(s, 'John', at(4, 3))).toBe(false);
    expect(isVerseSelected(s, 'Phil', at(3, 20))).toBe(false);
    expect(isVerseSelected(null, 'John', at(3, 16))).toBe(false);
  });
});
