/**
 * Practice days kept from deleted passages (docs/06 §2). Pure: dates are
 * local calendar dates as 'YYYY-MM-DD' strings, like services/streaks.
 *
 * Deleting a goal deletes its attempts. They have to go: an attempt's missed
 * words are words of the verse, and a licensed translation's text may not
 * outlive the goal that covers it (02 §5). The days those attempts were made
 * on still happened, though. The streak already counted them, so the Stats
 * practice grid and the widget's week row keep them too, from this list.
 */

/** About thirteen months: past any grid Meno draws, and a full year back. */
export const KEPT_PRACTICE_DAYS = 400;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

/** Reads the stored list; anything malformed reads as no days. */
export function parsePracticeDays(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((d): d is string => typeof d === 'string' && ISO_DATE.test(d));
  } catch {
    return [];
  }
}

/**
 * Adds `added` to the kept days: each day once, oldest first, and nothing
 * older than `window` days before `today` (nothing reads that far back).
 */
export function keepPracticeDays(
  kept: readonly string[],
  added: readonly string[],
  today: string,
  window = KEPT_PRACTICE_DAYS,
): string[] {
  const oldest = dayNumber(today) - window + 1;
  const days = new Set(
    [...kept, ...added].filter((d) => ISO_DATE.test(d) && dayNumber(d) >= oldest),
  );
  return [...days].sort();
}
