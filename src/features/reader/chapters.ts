/**
 * Stepping through the chapters a translation has of a book. A portion may
 * skip chapters, so the neighbour is the next one in the list, not ±1.
 * Pure, so the bar buttons and the book pose's page turns agree.
 */
export function neighbourChapter(
  chapters: readonly number[],
  chapter: number,
  direction: 1 | -1,
): number | undefined {
  let found: number | undefined;
  for (const c of chapters) {
    if (direction === 1 ? c > chapter : c < chapter) {
      if (found === undefined || (direction === 1 ? c < found : c > found)) found = c;
    }
  }
  return found;
}
