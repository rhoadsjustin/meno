import { describe, expect, it } from 'vitest';

import { neighbourChapter } from '@/features/reader/chapters';

describe('neighbourChapter', () => {
  it('steps by one through a whole book', () => {
    const all = [1, 2, 3, 4];
    expect(neighbourChapter(all, 2, 1)).toBe(3);
    expect(neighbourChapter(all, 2, -1)).toBe(1);
  });

  it('stops at the ends of the book', () => {
    const all = [1, 2, 3];
    expect(neighbourChapter(all, 3, 1)).toBeUndefined();
    expect(neighbourChapter(all, 1, -1)).toBeUndefined();
    expect(neighbourChapter([], 1, 1)).toBeUndefined();
  });

  it('steps over the chapters a portion translation lacks', () => {
    const portion = [1, 2, 5, 6, 9];
    expect(neighbourChapter(portion, 2, 1)).toBe(5);
    expect(neighbourChapter(portion, 5, -1)).toBe(2);
    expect(neighbourChapter(portion, 6, 1)).toBe(9);
    expect(neighbourChapter(portion, 9, -1)).toBe(6);
  });

  it('finds the neighbours of a chapter the list does not have', () => {
    expect(neighbourChapter([1, 2, 5], 3, 1)).toBe(5);
    expect(neighbourChapter([1, 2, 5], 3, -1)).toBe(2);
  });
});
