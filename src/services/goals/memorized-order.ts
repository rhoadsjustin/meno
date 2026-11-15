/**
 * The order of the Memorized shelf (07 §6: "sorted by risk"). Pure.
 *
 * Health is a function of how long ago a review fell due (scheduler
 * `healthOf`), so the earliest `dueAt` first puts at risk before fading
 * before fresh, and the most overdue first within each. A row with no review
 * schedule yet reads as fresh and goes last. Ties keep the order given.
 */
export function sortByRisk<T>(rows: readonly T[], dueAt: (row: T) => number | undefined): T[] {
  return rows
    .map((row, index) => ({ row, index, due: dueAt(row) ?? Number.POSITIVE_INFINITY }))
    .sort((a, b) => (a.due === b.due ? a.index - b.index : a.due < b.due ? -1 : 1))
    .map(({ row }) => row);
}
