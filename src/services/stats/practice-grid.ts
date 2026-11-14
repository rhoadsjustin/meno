/**
 * Lays consecutive practice days out as calendar weeks for the Stats grid
 * (07 §6 "weekly practice grid"): rows are Monday-start weeks, columns are
 * weekdays. The days need not start on a Monday or end on a Sunday; the
 * first and last rows are padded with `null` so every day sits under its
 * own weekday. Pure, no React Native imports.
 */
export type PracticeDay = { date: string; practiced: boolean };

/** A day in the grid; `today` marks the last day of the run. */
export type PracticeCell = PracticeDay & { today: boolean };

export const DAYS_IN_WEEK = 7;

/** Column of an ISO date (YYYY-MM-DD) in a Monday-start week: Mon 0 … Sun 6. */
export function weekdayColumn(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  // Local noon: a calendar date, clear of any daylight-saving edge.
  return (new Date(y, m - 1, d, 12).getDay() + 6) % DAYS_IN_WEEK;
}

/**
 * `days` are consecutive calendar days, oldest first, ending today (what
 * `loadStats` emits). Returns week rows of exactly seven slots.
 */
export function practiceWeeks(days: readonly PracticeDay[]): (PracticeCell | null)[][] {
  if (days.length === 0) return [];
  const slots: (PracticeCell | null)[] = Array.from({ length: weekdayColumn(days[0].date) }, () => null);
  days.forEach((day, i) => slots.push({ ...day, today: i === days.length - 1 }));
  while (slots.length % DAYS_IN_WEEK !== 0) slots.push(null);
  const weeks: (PracticeCell | null)[][] = [];
  for (let i = 0; i < slots.length; i += DAYS_IN_WEEK) weeks.push(slots.slice(i, i + DAYS_IN_WEEK));
  return weeks;
}
