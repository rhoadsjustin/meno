/**
 * The passage badges (docs/06 §4) that ask whether a whole stretch of
 * Scripture is memorized: `first_chapter` and `first_book`. Pure — repos/
 * badges loads the rows, reads chapter lengths through services/bible and
 * awards.
 *
 * Stopped goals never count here. Stopping removed the chunks that were not
 * memorized (services/goals `mayStopGoal`), so a stopped goal's chunks no
 * longer stand for the passage it was set for. Badges earned before the
 * stop are stored and stay.
 */
export type BadgeGoal = {
  id: string;
  status: string;
  translationId: string;
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
  startVerse: number;
  endChapter: number;
  endVerse: number;
  status: string;
};

/** One chapter as one translation numbers it. */
export type ChapterRef = { translationId: string; bookId: string; chapter: number };

/** Every verse number `ref`'s translation has in that chapter, or undefined when unknown. */
export type VersesIn = (ref: ChapterRef) => readonly number[] | undefined;

/** False for a goal whose chunks no longer cover the passage it was set for. */
export function countsAsWholePassage(goal: { status: string }): boolean {
  return goal.status !== 'stopped';
}

export function chapterKey(ref: ChapterRef): string {
  return `${ref.translationId}:${ref.bookId}:${ref.chapter}`;
}

function isMemorized(c: BadgeChunk): boolean {
  return c.status === 'memorized';
}

/** True when `chunk` takes in verse `verse` of `bookId` `chapter`. */
function covers(chunk: BadgeChunk, bookId: string, chapter: number, verse: number): boolean {
  if (chunk.startBookId !== bookId) return false;
  const afterStart =
    chunk.startChapter < chapter || (chunk.startChapter === chapter && chunk.startVerse <= verse);
  const beforeEnd =
    chunk.endChapter > chapter || (chunk.endChapter === chapter && chunk.endVerse >= verse);
  return afterStart && beforeEnd;
}

/** True when `chunk` takes in any verse of `bookId` `chapter`. */
function touches(chunk: BadgeChunk, bookId: string, chapter: number): boolean {
  return (
    chunk.startBookId === bookId && chunk.startChapter <= chapter && chunk.endChapter >= chapter
  );
}

/** Each counted goal that has something memorized, with its chunks. */
function countedGoals(
  goals: readonly BadgeGoal[],
  chunks: readonly BadgeChunk[],
): { goal: BadgeGoal; chunks: BadgeChunk[]; memorized: BadgeChunk[] }[] {
  return goals
    .filter(countsAsWholePassage)
    .map((goal) => {
      const own = chunks.filter((c) => c.goalId === goal.id);
      return { goal, chunks: own, memorized: own.filter(isMemorized) };
    })
    .filter((g) => g.memorized.length > 0);
}

/**
 * The chapters that may be whole in one goal: its memorized chunks take in
 * verse 1, and none of its chunks there is still to memorize. Only these are
 * measured, so memorizing John 3:16 alone, or the start of the chapter a
 * goal is working through, fetches nothing.
 */
function candidateChapters(
  goal: BadgeGoal,
  chunks: readonly BadgeChunk[],
  memorized: readonly BadgeChunk[],
): ChapterRef[] {
  const out: ChapterRef[] = [];
  for (const c of memorized) {
    for (let chapter = c.startChapter; chapter <= c.endChapter; chapter++) {
      const bookId = c.startBookId;
      if (!covers(c, bookId, chapter, 1)) continue;
      if (chunks.some((other) => !isMemorized(other) && touches(other, bookId, chapter))) continue;
      out.push({ translationId: goal.translationId, bookId, chapter });
    }
  }
  return out;
}

/** The chapters `memorizedFullChapter` asks `versesIn` about. */
export function chaptersToMeasure(
  goals: readonly BadgeGoal[],
  chunks: readonly BadgeChunk[],
): ChapterRef[] {
  const byKey = new Map<string, ChapterRef>();
  for (const g of countedGoals(goals, chunks)) {
    for (const ref of candidateChapters(g.goal, g.chunks, g.memorized)) {
      byKey.set(chapterKey(ref), ref);
    }
  }
  return [...byKey.values()];
}

/**
 * `first_chapter`: one goal's memorized chunks take in every verse of a
 * chapter, verse 1 through its last, as the goal's translation numbers it
 * (`versesIn`). Verses a translation leaves out (the ESV has no John 5:4)
 * are not asked for. A chapter whose verses are unknown — not looked up, or
 * the translation was out of reach — does not count yet.
 *
 * Chunks of two goals do not add up to a chapter: they may be in different
 * translations, which number verses differently.
 */
export function memorizedFullChapter(
  goals: readonly BadgeGoal[],
  chunks: readonly BadgeChunk[],
  versesIn: VersesIn,
): boolean {
  return countedGoals(goals, chunks).some(({ goal, chunks: own, memorized }) =>
    candidateChapters(goal, own, memorized).some((ref) => {
      const verses = versesIn(ref);
      return (
        verses !== undefined &&
        verses.length > 0 &&
        verses.every((v) => memorized.some((c) => covers(c, ref.bookId, ref.chapter, v)))
      );
    }),
  );
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
    return wholeBook && goalChunks.every(isMemorized);
  });
}
