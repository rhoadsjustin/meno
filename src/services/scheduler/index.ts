/**
 * Spaced repetition — modified SM-2 (docs/03-memory-engine.md §6).
 * Pure: callers pass `now`, and the ±10% due-date fuzz comes from an
 * injectable random source so tests are exact.
 */

export type ReviewState = {
  easiness: number;
  intervalDays: number;
  repetitions: number;
  /** Epoch ms. */
  dueAt: number;
  /** Epoch ms. */
  lastReviewedAt: number | null;
};

export type Health = 'fresh' | 'fading' | 'atRisk';

export const INITIAL_REVIEW_STATE: Omit<ReviewState, 'dueAt' | 'lastReviewedAt'> = {
  easiness: 2.5,
  intervalDays: 1,
  repetitions: 0,
};

export const MAX_INTERVAL_DAYS = 180;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Creates the review item state when a chunk first reaches Memorized. */
export function createReviewState(now: number, fuzz: () => number = Math.random): ReviewState {
  return {
    ...INITIAL_REVIEW_STATE,
    dueAt: now + applyFuzz(1, fuzz) * DAY_MS,
    lastReviewedAt: null,
  };
}

/**
 * Applies one review result. `accuracy` is 0–1; `fuzz` returns a uniform
 * random in [0,1) (inject a constant for determinism in tests).
 */
export function applyReview(
  state: ReviewState,
  accuracy: number,
  now: number,
  fuzz: () => number = Math.random
): ReviewState {
  const q = Math.round(clamp(accuracy, 0, 1) * 5); // SM-2 quality 0..5

  let { easiness, intervalDays, repetitions } = state;

  if (q >= 3) {
    intervalDays = [1, 3, intervalDays * easiness][Math.min(repetitions, 2)];
    repetitions += 1;
  } else {
    repetitions = 0;
    intervalDays = 1;
  }

  easiness = clamp(easiness + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02), 1.3, 2.7);
  intervalDays = Math.min(intervalDays, MAX_INTERVAL_DAYS);

  return {
    easiness,
    intervalDays,
    repetitions,
    dueAt: now + applyFuzz(intervalDays, fuzz) * DAY_MS,
    lastReviewedAt: now,
  };
}

/** ±10% fuzz to avoid review pileups. */
function applyFuzz(intervalDays: number, fuzz: () => number): number {
  return intervalDays * (0.9 + 0.2 * fuzz());
}

/**
 * Health drives library indicators and notification copy:
 * fresh = not yet due; fading = due or ≤3 days overdue; atRisk = >3 days.
 */
export function healthOf(state: Pick<ReviewState, 'dueAt'>, now: number): Health {
  if (now < state.dueAt) return 'fresh';
  const daysOverdue = (now - state.dueAt) / DAY_MS;
  return daysOverdue <= 3 ? 'fading' : 'atRisk';
}

/** Most-overdue first; used to order review sessions (max 5 by default). */
export function orderReviewQueue<T extends Pick<ReviewState, 'dueAt'>>(
  items: T[],
  now: number,
  limit = 5
): T[] {
  return items
    .filter((i) => i.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt)
    .slice(0, limit);
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}
