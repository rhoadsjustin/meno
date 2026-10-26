/**
 * Which licensed text may stay in the app database (docs/02-architecture.md
 * §5): only verses inside the range of a goal the user still has. Pure — the
 * queries that feed and apply these rules live in services/bible/index.
 */
import { refInRange } from '@/services/bible/refs';
import type { Ref, RefRange } from '@/services/bible/types';

/**
 * Goal statuses that keep their text cached. A completed goal's chunks are
 * still reviewed, so it holds its text just as an active one does; an
 * archived goal holds nothing.
 */
export const RETAINING_GOAL_STATUSES = ['active', 'completed'] as const;

export function goalRetainsText(status: string): boolean {
  return (RETAINING_GOAL_STATUSES as readonly string[]).includes(status);
}

/** The part of a single-book range that falls in one chapter. */
export function chapterSlice(range: RefRange, chapter: number): RefRange {
  const { bookId } = range.start;
  return {
    start: { bookId, chapter, verse: chapter === range.start.chapter ? range.start.verse : 1 },
    end: {
      bookId,
      chapter,
      verse: chapter === range.end.chapter ? range.end.verse : Number.MAX_SAFE_INTEGER,
    },
  };
}

/**
 * True when one retained goal range contains the whole of `range` — the
 * cache is then guaranteed to hold all of it. A request that only overlaps a
 * goal, or straddles two, is not covered: its cached rows would be a partial
 * answer, so it is read from the API instead.
 */
export function coveredByRetained(range: RefRange, retained: readonly RefRange[]): boolean {
  return retained.some((r) => refInRange(range.start, r) && refInRange(range.end, r));
}

/** The verses a retained goal range entitles the cache to keep. */
export function retainedOnly<T extends Ref>(
  verses: readonly T[],
  retained: readonly RefRange[],
): T[] {
  return verses.filter((v) => retained.some((r) => refInRange(v, r)));
}

/**
 * Deletes every cached verse that no retaining goal of the same translation
 * covers. One statement, so a goal created while it runs is either seen
 * whole or not at all. Goals are single-book (services/bible `readPassage`),
 * which is what lets the range test compare chapter and verse alone.
 *
 * The app database's `verses` table holds licensed cache rows only; bundled
 * public-domain text lives in a separate read-only database this never opens.
 */
export const PURGE_UNREFERENCED_SQL = `
DELETE FROM verses
WHERE NOT EXISTS (
  SELECT 1 FROM goals g
  WHERE g.translationId = verses.translationId
    AND g.status IN (${RETAINING_GOAL_STATUSES.map((s) => `'${s}'`).join(', ')})
    AND g.startBookId = verses.bookId
    AND g.endBookId = verses.bookId
    AND (verses.chapter > g.startChapter
      OR (verses.chapter = g.startChapter AND verses.verse >= g.startVerse))
    AND (verses.chapter < g.endChapter
      OR (verses.chapter = g.endChapter AND verses.verse <= g.endVerse))
)`;
