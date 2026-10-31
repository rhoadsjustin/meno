/**
 * When the recap is offered (docs/10 §5.5, D4): December 1 through
 * January 31, in local time. December shows the year that is ending;
 * January still shows the year just past.
 */

/** The recap year on offer for a local date ('YYYY-MM-DD'), or null out of season. */
export function recapYearFor(today: string): number | null {
  const [year, month] = today.split('-').map(Number);
  if (!year || !month) return null;
  if (month === 12) return year;
  if (month === 1) return year - 1;
  return null;
}

export function isRecapSeason(today: string): boolean {
  return recapYearFor(today) !== null;
}

/**
 * Activity that begins on or after this day reads as a first season
 * ("Since you started in October") rather than as the whole year.
 */
export function firstSeasonCutoff(year: number): string {
  return `${year}-09-01`;
}
