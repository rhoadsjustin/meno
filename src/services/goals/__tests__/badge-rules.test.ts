import { describe, expect, it } from 'vitest';

import {
  chaptersToMeasure,
  countsAsWholePassage,
  memorizedFullChapter,
  memorizedWholeBook,
  type BadgeChunk,
  type BadgeGoal,
  type ChapterRef,
  type VersesIn,
} from '@/services/goals/badge-rules';

const goal = (
  id: string,
  status: string,
  bookId: string,
  startChapter: number,
  endChapter: number,
  options: { startVerse?: number; translationId?: string } = {},
): BadgeGoal => ({
  id,
  status,
  translationId: options.translationId ?? 'web',
  startBookId: bookId,
  startChapter,
  startVerse: options.startVerse ?? 1,
  endBookId: bookId,
  endChapter,
});

/** A chunk of verses `from`–`to` in one chapter (chunks never cross one). */
const chunk = (
  goalId: string,
  chapter: number,
  status: string,
  bookId = 'Ps',
  from = 1,
  to = from,
): BadgeChunk => ({
  goalId,
  startBookId: bookId,
  startChapter: chapter,
  startVerse: from,
  endChapter: chapter,
  endVerse: to,
  status,
});

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

/**
 * Chapter lengths as the WEB numbers them: Psalm 1 has 6 verses, Psalm 2 12,
 * Psalm 23 6 and John 3 36. Anything else is unknown.
 */
const WEB: Record<string, number> = { 'Ps.1': 6, 'Ps.2': 12, 'Ps.23': 6, 'John.3': 36 };
const versesIn: VersesIn = ({ translationId, bookId, chapter }) => {
  const last = translationId === 'web' ? WEB[`${bookId}.${chapter}`] : undefined;
  return last === undefined ? undefined : range(1, last);
};

/** Philippians has 4 chapters, Psalms 150. */
const chaptersIn = (bookId: string) => (bookId === 'Phil' ? 4 : 150);

describe('countsAsWholePassage', () => {
  it('counts every goal that still has all its chunks', () => {
    expect(countsAsWholePassage({ status: 'active' })).toBe(true);
    expect(countsAsWholePassage({ status: 'completed' })).toBe(true);
    expect(countsAsWholePassage({ status: 'archived' })).toBe(true);
  });

  it('does not count a stopped goal', () => {
    expect(countsAsWholePassage({ status: 'stopped' })).toBe(false);
  });
});

describe('memorizedFullChapter', () => {
  it('is earned when a goal’s memorized chunks cover every verse of a chapter', () => {
    const goals = [goal('g', 'active', 'Ps', 23, 23)];
    const chunks = [
      chunk('g', 23, 'memorized', 'Ps', 1, 3),
      chunk('g', 23, 'memorized', 'Ps', 4, 6),
    ];
    expect(memorizedFullChapter(goals, chunks, versesIn)).toBe(true);
  });

  it('is not earned for a single verse of a chapter (John 3:16)', () => {
    const goals = [goal('g', 'completed', 'John', 3, 3, { startVerse: 16 })];
    expect(memorizedFullChapter(goals, [chunk('g', 3, 'memorized', 'John', 16)], versesIn)).toBe(
      false,
    );
  });

  it('is not earned for a goal that stops short of the chapter’s last verse', () => {
    // Psalm 23:1–5 of 6, every chunk memorized and the goal completed.
    const goals = [goal('g', 'completed', 'Ps', 23, 23)];
    const chunks = [
      chunk('g', 23, 'memorized', 'Ps', 1, 3),
      chunk('g', 23, 'memorized', 'Ps', 4, 5),
    ];
    expect(memorizedFullChapter(goals, chunks, versesIn)).toBe(false);
  });

  it('is not earned for a goal that starts after verse 1', () => {
    const goals = [goal('g', 'completed', 'Ps', 23, 23, { startVerse: 2 })];
    expect(memorizedFullChapter(goals, [chunk('g', 23, 'memorized', 'Ps', 2, 6)], versesIn)).toBe(
      false,
    );
  });

  it('is not earned while a chunk of the chapter is still being learned', () => {
    const goals = [goal('g', 'active', 'Ps', 23, 23)];
    const chunks = [
      chunk('g', 23, 'memorized', 'Ps', 1, 3),
      chunk('g', 23, 'learning', 'Ps', 4, 6),
    ];
    expect(memorizedFullChapter(goals, chunks, versesIn)).toBe(false);
  });

  it('is not earned with a gap in the middle of the chapter', () => {
    const goals = [goal('g', 'active', 'Ps', 23, 23)];
    const chunks = [
      chunk('g', 23, 'memorized', 'Ps', 1, 2),
      chunk('g', 23, 'learning', 'Ps', 3, 4),
      chunk('g', 23, 'memorized', 'Ps', 5, 6),
    ];
    expect(memorizedFullChapter(goals, chunks, versesIn)).toBe(false);
  });

  it('counts the first chapter of a longer goal once all of it is memorized', () => {
    const goals = [goal('g', 'active', 'Ps', 1, 2)];
    const chunks = [
      chunk('g', 1, 'memorized', 'Ps', 1, 3),
      chunk('g', 1, 'memorized', 'Ps', 4, 6),
      chunk('g', 2, 'learning', 'Ps', 1, 4),
    ];
    expect(memorizedFullChapter(goals, chunks, versesIn)).toBe(true);
  });

  it('takes the chapter’s length from the goal’s translation', () => {
    // Six verses memorized; this translation numbers seven in the chapter.
    const goals = [goal('g', 'active', 'Ps', 23, 23, { translationId: 'other' })];
    const chunks = [chunk('g', 23, 'memorized', 'Ps', 1, 6)];
    const asked: ChapterRef[] = [];
    const seven: VersesIn = (ref) => {
      asked.push(ref);
      return ref.translationId === 'other' ? range(1, 7) : range(1, 6);
    };
    expect(memorizedFullChapter(goals, chunks, seven)).toBe(false);
    expect(asked).toEqual([{ translationId: 'other', bookId: 'Ps', chapter: 23 }]);
  });

  it('does not ask for verses the translation leaves out', () => {
    // The ESV has no John 5:4, so its chunks skip from verse 3 to verse 5.
    const goals = [goal('g', 'active', 'John', 5, 5, { translationId: 'esv' })];
    const chunks = [
      chunk('g', 5, 'memorized', 'John', 1, 3),
      chunk('g', 5, 'memorized', 'John', 5, 6),
    ];
    const esv: VersesIn = () => [1, 2, 3, 5, 6];
    expect(memorizedFullChapter(goals, chunks, esv)).toBe(true);
  });

  it('does not count a chapter whose verses are unknown', () => {
    const goals = [goal('g', 'active', 'Ps', 23, 23)];
    const chunks = [chunk('g', 23, 'memorized', 'Ps', 1, 6)];
    expect(memorizedFullChapter(goals, chunks, () => undefined)).toBe(false);
    expect(memorizedFullChapter(goals, chunks, () => [])).toBe(false);
  });

  it('does not add up chunks from two goals', () => {
    const goals = [goal('a', 'completed', 'Ps', 23, 23), goal('b', 'completed', 'Ps', 23, 23)];
    const chunks = [
      chunk('a', 23, 'memorized', 'Ps', 1, 3),
      chunk('b', 23, 'memorized', 'Ps', 4, 6),
    ];
    expect(memorizedFullChapter(goals, chunks, versesIn)).toBe(false);
  });

  it('does not count a stopped goal, even when its memorized chunks cover the chapter', () => {
    // Psalm 1–2 stopped after all of Psalm 1 was memorized; Psalm 2's chunks are gone.
    const goals = [goal('g', 'stopped', 'Ps', 1, 2)];
    const chunks = [chunk('g', 1, 'memorized', 'Ps', 1, 6)];
    expect(memorizedFullChapter(goals, chunks, versesIn)).toBe(false);
  });

  it('still counts other goals beside a stopped one', () => {
    const goals = [goal('s', 'stopped', 'Ps', 1, 1), goal('c', 'completed', 'Ps', 23, 23)];
    const chunks = [
      chunk('s', 1, 'memorized', 'Ps', 1, 3),
      chunk('c', 23, 'memorized', 'Ps', 1, 6),
    ];
    expect(memorizedFullChapter(goals, chunks, versesIn)).toBe(true);
  });

  it('ignores chunks whose goal is gone', () => {
    expect(memorizedFullChapter([], [chunk('gone', 23, 'memorized', 'Ps', 1, 6)], versesIn)).toBe(
      false,
    );
  });
});

describe('chaptersToMeasure', () => {
  it('asks only for chapters a goal has memorized from verse 1', () => {
    const goals = [goal('g', 'active', 'Ps', 1, 2), goal('j', 'completed', 'John', 3, 3)];
    const chunks = [
      chunk('g', 1, 'memorized', 'Ps', 1, 3),
      chunk('g', 1, 'memorized', 'Ps', 4, 6),
      chunk('g', 2, 'learning', 'Ps', 1, 4),
      chunk('j', 3, 'memorized', 'John', 16),
    ];
    expect(chaptersToMeasure(goals, chunks)).toEqual([
      { translationId: 'web', bookId: 'Ps', chapter: 1 },
    ]);
  });

  it('asks once per chapter and translation', () => {
    const goals = [
      goal('a', 'completed', 'Ps', 23, 23),
      goal('b', 'completed', 'Ps', 23, 23),
      goal('c', 'completed', 'Ps', 23, 23, { translationId: 'kjv' }),
    ];
    const chunks = ['a', 'b', 'c'].map((id) => chunk(id, 23, 'memorized', 'Ps', 1, 6));
    expect(chaptersToMeasure(goals, chunks)).toEqual([
      { translationId: 'web', bookId: 'Ps', chapter: 23 },
      { translationId: 'kjv', bookId: 'Ps', chapter: 23 },
    ]);
  });

  it('asks nothing for a stopped goal', () => {
    const goals = [goal('g', 'stopped', 'Ps', 23, 23)];
    expect(chaptersToMeasure(goals, [chunk('g', 23, 'memorized', 'Ps', 1, 6)])).toEqual([]);
  });
});

describe('memorizedWholeBook', () => {
  const allOf = (goalId: string, status: string) =>
    [1, 2, 3, 4].map((c) => chunk(goalId, c, status, 'Phil'));

  it('is earned when a whole-book goal is fully memorized', () => {
    const goals = [goal('g', 'active', 'Phil', 1, 4)];
    expect(memorizedWholeBook(goals, allOf('g', 'memorized'), chaptersIn)).toBe(true);
  });

  it('is not earned for part of a book, or before every chunk is memorized', () => {
    expect(
      memorizedWholeBook(
        [goal('g', 'active', 'Phil', 1, 3)],
        allOf('g', 'memorized').slice(0, 3),
        chaptersIn,
      ),
    ).toBe(false);
    const chunks = [...allOf('g', 'memorized').slice(0, 3), chunk('g', 4, 'learning', 'Phil')];
    expect(memorizedWholeBook([goal('g', 'active', 'Phil', 1, 4)], chunks, chaptersIn)).toBe(false);
  });

  it('does not count a stopped whole-book goal, whatever chunks are left', () => {
    const goals = [goal('g', 'stopped', 'Phil', 1, 4)];
    expect(memorizedWholeBook(goals, allOf('g', 'memorized').slice(0, 2), chaptersIn)).toBe(false);
  });

  it('is not earned by a goal with no chunks', () => {
    expect(memorizedWholeBook([goal('g', 'active', 'Phil', 1, 4)], [], chaptersIn)).toBe(false);
  });
});
