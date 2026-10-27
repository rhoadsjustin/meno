/**
 * The passage badges (docs/06 §4) that ask whether a whole stretch of
 * Scripture is memorized: `first_chapter` and `first_book`. Pure — repos/
 * badges loads the rows and awards.
 *
 * Both read "every chunk is memorized" as "all of it is memorized", which
 * holds only while a goal still has all its chunks. A stopped goal does not:
 * stopping removed the chunks that were not memorized (services/goals
 * `mayStopGoal`), so whatever is left is memorized by construction. Stopped
 * goals therefore never count here. Badges earned before the stop are stored
 * and stay.
 */
export type BadgeGoal = {
  id: string;
  status: string;
  startBookId: string;
  startChapter: number;
  startVerse: number;
  endBookId: string;
  endChapter: number;
};

export type BadgeChunk = {
  goalId: string;
  startBookId: string;
  startChapter: number;
  status: string;
};

/** False for a goal whose chunks no longer cover the passage it was set for. */
export function countsAsWholePassage(goal: { status: string }): boolean {
  return goal.status !== 'stopped';
}

/** `first_chapter`: every chunk of some (goal, chapter) is memorized. */
export function memorizedFullChapter(
  goals: readonly BadgeGoal[],
  chunks: readonly BadgeChunk[],
): boolean {
  const counted = new Set(goals.filter(countsAsWholePassage).map((g) => g.id));
  const byChapter = new Map<string, { total: number; done: number }>();
  for (const c of chunks) {
    if (!counted.has(c.goalId)) continue;
    const key = `${c.goalId}:${c.startBookId}:${c.startChapter}`;
    const entry = byChapter.get(key) ?? { total: 0, done: 0 };
    entry.total += 1;
    if (c.status === 'memorized') entry.done += 1;
    byChapter.set(key, entry);
  }
  return [...byChapter.values()].some((e) => e.total > 0 && e.done === e.total);
}

/** `first_book`: every chunk memorized of a goal that spans a whole book. */
export function memorizedWholeBook(
  goals: readonly BadgeGoal[],
  chunks: readonly BadgeChunk[],
  chaptersIn: (bookId: string) => number,
): boolean {
  return goals.filter(countsAsWholePassage).some((g) => {
    const goalChunks = chunks.filter((c) => c.goalId === g.id);
    if (goalChunks.length === 0) return false;
    const wholeBook =
      g.startBookId === g.endBookId &&
      g.startChapter === 1 &&
      g.startVerse === 1 &&
      g.endChapter === chaptersIn(g.startBookId);
    return wholeBook && goalChunks.every((c) => c.status === 'memorized');
  });
}
