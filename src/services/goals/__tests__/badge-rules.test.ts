import { describe, expect, it } from 'vitest';

import {
  countsAsWholePassage,
  memorizedFullChapter,
  memorizedWholeBook,
  type BadgeChunk,
  type BadgeGoal,
} from '@/services/goals/badge-rules';

const goal = (
  id: string,
  status: string,
  bookId: string,
  startChapter: number,
  endChapter: number,
): BadgeGoal => ({
  id,
  status,
  startBookId: bookId,
  startChapter,
  startVerse: 1,
  endBookId: bookId,
  endChapter,
});

const chunk = (goalId: string, chapter: number, status: string, bookId = 'Ps'): BadgeChunk => ({
  goalId,
  startBookId: bookId,
  startChapter: chapter,
  status,
});

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
  it('is earned when every chunk of a chapter in a goal is memorized', () => {
    const goals = [goal('g', 'active', 'Ps', 1, 2)];
    const chunks = [
      chunk('g', 1, 'memorized'),
      chunk('g', 1, 'memorized'),
      chunk('g', 2, 'learning'),
    ];
    expect(memorizedFullChapter(goals, chunks)).toBe(true);
  });

  it('is not earned while a chunk of the chapter is still being learned', () => {
    const goals = [goal('g', 'active', 'Ps', 1, 1)];
    expect(
      memorizedFullChapter(goals, [chunk('g', 1, 'memorized'), chunk('g', 1, 'learning')]),
    ).toBe(false);
  });

  it('does not count a stopped goal, whose unmemorized chunks were removed', () => {
    // Before the stop Psalm 1 had [memorized, learning]; only the first is left.
    const goals = [goal('g', 'stopped', 'Ps', 1, 1)];
    expect(memorizedFullChapter(goals, [chunk('g', 1, 'memorized')])).toBe(false);
  });

  it('still counts other goals beside a stopped one', () => {
    const goals = [goal('s', 'stopped', 'Ps', 1, 1), goal('c', 'completed', 'Ps', 23, 23)];
    const chunks = [chunk('s', 1, 'memorized'), chunk('c', 23, 'memorized')];
    expect(memorizedFullChapter(goals, chunks)).toBe(true);
  });

  it('ignores chunks whose goal is gone', () => {
    expect(memorizedFullChapter([], [chunk('gone', 1, 'memorized')])).toBe(false);
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
