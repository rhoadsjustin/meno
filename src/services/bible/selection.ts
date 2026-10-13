/**
 * Passage selection for the goal wizard (docs/07 §6): tap the first verse,
 * then the last. Pure — no React Native imports. Ranges stay inside one book.
 */
import type { RefRange } from '@/services/bible/types';

export type VersePoint = { chapter: number; verse: number };

export type PassageSelection = {
  bookId: string;
  start: VersePoint;
  end: VersePoint;
  /** True after a first tap: the next tap closes the range instead of starting a new one. */
  open: boolean;
};

function comparePoints(a: VersePoint, b: VersePoint): number {
  if (a.chapter !== b.chapter) return a.chapter - b.chapter;
  return a.verse - b.verse;
}

function single(bookId: string, point: VersePoint): PassageSelection {
  return { bookId, start: point, end: point, open: true };
}

/** What the wizard opens with, and what a book change resets to: verse 1:1, settled. */
export function defaultSelection(bookId: string): PassageSelection {
  const first = { chapter: 1, verse: 1 };
  return { bookId, start: first, end: first, open: false };
}

/**
 * A tap on a verse. The first tap picks that verse alone and leaves the
 * range open; the second closes it (in either direction, so tapping the
 * last verse first also works); a tap on a settled range starts over.
 */
export function tapVerse(
  selection: PassageSelection | null,
  bookId: string,
  point: VersePoint
): PassageSelection {
  if (!selection || !selection.open || selection.bookId !== bookId) return single(bookId, point);
  const anchor = selection.start;
  return comparePoints(point, anchor) < 0
    ? { bookId, start: point, end: anchor, open: false }
    : { bookId, start: anchor, end: point, open: false };
}

/**
 * Moves the first verse and keeps the last (VoiceOver's "Start passage
 * here"). A start past the current end begins a new single-verse selection.
 */
export function setStart(
  selection: PassageSelection | null,
  bookId: string,
  point: VersePoint
): PassageSelection {
  if (!selection || selection.bookId !== bookId || comparePoints(point, selection.end) > 0) {
    return single(bookId, point);
  }
  return { bookId, start: point, end: selection.end, open: false };
}

/**
 * Moves the last verse and keeps the first (VoiceOver's "End passage
 * here"). An end before the current start begins a new single-verse selection.
 */
export function setEnd(
  selection: PassageSelection | null,
  bookId: string,
  point: VersePoint
): PassageSelection {
  if (!selection || selection.bookId !== bookId || comparePoints(point, selection.start) < 0) {
    return single(bookId, point);
  }
  return { bookId, start: selection.start, end: point, open: false };
}

/** Every verse of one chapter. `lastVerse` is that chapter's final verse number. */
export function selectWholeChapter(
  bookId: string,
  chapter: number,
  lastVerse: number
): PassageSelection {
  return {
    bookId,
    start: { chapter, verse: 1 },
    end: { chapter, verse: Math.max(1, lastVerse) },
    open: false,
  };
}

/**
 * Keeps the first verse and runs the range to the end of `chapter`. With
 * nothing selected it selects from the top of `fromChapter`; a chapter
 * before the first verse's is ignored.
 */
export function extendThroughChapter(
  selection: PassageSelection | null,
  bookId: string,
  fromChapter: number,
  chapter: number,
  lastVerse: number
): PassageSelection {
  const base =
    selection && selection.bookId === bookId
      ? selection
      : selectWholeChapter(bookId, fromChapter, 1);
  if (chapter < base.start.chapter) return base;
  return {
    bookId,
    start: base.start,
    end: { chapter, verse: Math.max(base.start.chapter === chapter ? base.start.verse : 1, lastVerse) },
    open: false,
  };
}

/** Chapters the range can be extended through: every one after its first verse's. */
export function chaptersToExtendThrough(
  selection: PassageSelection | null,
  bookId: string,
  fromChapter: number,
  bookChapters: number
): number[] {
  const first = selection && selection.bookId === bookId ? selection.start.chapter : fromChapter;
  const out: number[] = [];
  for (let c = first + 1; c <= bookChapters; c++) out.push(c);
  return out;
}

/**
 * Pulls the selection's ends back inside a chapter once its real length is
 * known (translations disagree on a few: 3 John has 14 or 15 verses).
 */
export function clampToChapter(
  selection: PassageSelection,
  chapter: number,
  lastVerse: number
): PassageSelection {
  const clamp = (p: VersePoint): VersePoint =>
    p.chapter === chapter && p.verse > lastVerse ? { chapter, verse: Math.max(1, lastVerse) } : p;
  const start = clamp(selection.start);
  const end = clamp(selection.end);
  if (start === selection.start && end === selection.end) return selection;
  return { ...selection, start, end };
}

export function isVerseSelected(
  selection: PassageSelection | null,
  bookId: string,
  point: VersePoint
): boolean {
  if (!selection || selection.bookId !== bookId) return false;
  return comparePoints(selection.start, point) <= 0 && comparePoints(point, selection.end) <= 0;
}

export function selectionToRange(selection: PassageSelection): RefRange {
  const { bookId, start, end } = selection;
  return { start: { bookId, ...start }, end: { bookId, ...end } };
}
