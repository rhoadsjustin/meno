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

/**
 * Finished years whose recap can still be opened from Stats once the season
 * is over (docs/10 §5.4–5.5, "Past years"): a year with a kept snapshot, or
 * with enough practice days to make one. The year on offer in season is left
 * out, since it has its own row. Newest first.
 */
export function pastRecapYears(input: {
  /** Local date, 'YYYY-MM-DD'. */
  today: string;
  /** Distinct practice days per year. */
  activeDays: ReadonlyMap<number, number>;
  /** Years with a snapshot in settings. */
  snapshotYears: readonly number[];
  minDays: number;
}): number[] {
  const thisYear = Number(input.today.slice(0, 4));
  if (!thisYear) return [];
  const onOffer = recapYearFor(input.today);
  const years = new Set<number>(input.snapshotYears);
  for (const [year, days] of input.activeDays) {
    if (days >= input.minDays) years.add(year);
  }
  return [...years]
    .filter((year) => Number.isInteger(year) && year < thisYear && year !== onOffer)
    .sort((a, b) => b - a);
}
