/**
 * Which licensed text may stay in the app database (docs/02-architecture.md
 * §5): only verses the user still practices or reviews. Pure — the queries
 * that feed and apply these rules live in services/bible/index.
 */
import { refInRange } from '@/services/bible/refs';
import type { Ref, RefRange } from '@/services/bible/types';

/**
 * Goal statuses that keep their whole range cached. A completed goal's
 * chunks are still reviewed, so it holds its text just as an active one
 * does; an archived goal holds nothing.
 */
export const RETAINING_GOAL_STATUSES = ['active', 'completed'] as const;

/**
 * A stopped goal (services/goals `mayStopGoal`) is reviewed but no longer
 * practiced, so it keeps the verses of its memorized chunks and nothing
 * else of its range.
 */
export const CHUNK_RETAINING_GOAL_STATUS = 'stopped';

/** Where a goal or chunk row starts and ends (flat columns in the schema). */
export type RangeRow = {
  startBookId: string;
  startChapter: number;
  startVerse: number;
  endBookId: string;
  endChapter: number;
  endVerse: number;
};

export function rowRange(row: RangeRow): RefRange {
  return {
    start: { bookId: row.startBookId, chapter: row.startChapter, verse: row.startVerse },
    end: { bookId: row.endBookId, chapter: row.endChapter, verse: row.endVerse },
  };
}

/**
 * The ranges a goal entitles the cache to keep: its whole range while it is
 * active or completed, its memorized chunks once it is stopped, nothing
 * otherwise. `chunks` are the goal's own; only a stopped goal looks at them.
 */
export function retainedRangesOf(
  goal: RangeRow & { status: string },
  chunks: readonly (RangeRow & { status: string })[],
): RefRange[] {
  if ((RETAINING_GOAL_STATUSES as readonly string[]).includes(goal.status)) {
    return [rowRange(goal)];
  }
  if (goal.status === CHUNK_RETAINING_GOAL_STATUS) {
    return chunks.filter((c) => c.status === 'memorized').map(rowRange);
  }
  return [];
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

/** SQL: `verses` row lies inside the range of row `t` (same single book). */
function verseInRangeSql(t: string): string {
  return `${t}.startBookId = verses.bookId
    AND ${t}.endBookId = verses.bookId
    AND (verses.chapter > ${t}.startChapter
      OR (verses.chapter = ${t}.startChapter AND verses.verse >= ${t}.startVerse))
    AND (verses.chapter < ${t}.endChapter
      OR (verses.chapter = ${t}.endChapter AND verses.verse <= ${t}.endVerse))`;
}

/**
 * Deletes every cached verse that `retainedRangesOf` gives no goal of the
 * same translation a claim to: not inside an active or completed goal, nor
 * inside a memorized chunk of a stopped goal. One statement, so a goal
 * created or stopped while it runs is either seen whole or not at all. Goals
 * and chunks are single-book (services/bible `readPassage`), which is what
 * lets the range test compare chapter and verse alone.
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
    AND ${verseInRangeSql('g')}
)
AND NOT EXISTS (
  SELECT 1 FROM chunks c
  JOIN goals g ON g.id = c.goalId
  WHERE g.translationId = verses.translationId
    AND g.status = '${CHUNK_RETAINING_GOAL_STATUS}'
    AND c.status = 'memorized'
    AND ${verseInRangeSql('c')}
)`;
