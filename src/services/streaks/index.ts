/**
 * Streak logic (docs/06-gamification-social.md §1). Pure — dates are local
 * calendar dates as 'YYYY-MM-DD' strings supplied by callers, so there is no
 * hidden clock or timezone dependency.
 *
 * Rules: any meaningful action secures the day; one grace day per week is
 * earned automatically; missing a single day with grace available consumes
 * it silently and preserves the streak.
 */

export type StreakState = {
  current: number;
  longest: number;
  /** Last local date with a meaningful action, or null before first action. */
  lastActiveDate: string | null;
  graceDaysAvailable: number;
  graceDaysUsedThisWeek: number;
};

export type StreakUpdate = {
  state: StreakState;
  /** True when this action extended (or started) the streak today. */
  daySecured: boolean;
  /** Set when a grace day silently bridged a missed date ("grace day used Tuesday"). */
  graceUsedOn: string | null;
  /** True when the previous streak was lost by this update. */
  streakReset: boolean;
};

export const INITIAL_STREAK: StreakState = {
  current: 0,
  longest: 0,
  lastActiveDate: null,
  graceDaysAvailable: 1,
  graceDaysUsedThisWeek: 0,
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtc(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b) - toUtc(a)) / DAY_MS);
}

export function addDays(date: string, days: number): string {
  const d = new Date(toUtc(date) + days * DAY_MS);
  return d.toISOString().slice(0, 10);
}

/** ISO week key (Monday-start), e.g. '2026-W35' — used for grace refills. */
export function isoWeek(date: string): string {
  const utc = new Date(toUtc(date));
  // Shift to the Thursday of this week to get the ISO week-year.
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(utc.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((utc.getTime() - yearStart) / DAY_MS + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Refills the weekly grace day when the week rolls over. */
function refillGrace(state: StreakState, today: string): StreakState {
  if (state.lastActiveDate && isoWeek(state.lastActiveDate) !== isoWeek(today)) {
    return { ...state, graceDaysAvailable: 1, graceDaysUsedThisWeek: 0 };
  }
  return state;
}

/** Applies one meaningful action performed on `today`. */
export function recordActivity(prev: StreakState, today: string): StreakUpdate {
  const state = refillGrace(prev, today);
  const last = state.lastActiveDate;

  if (last === today) {
    return { state, daySecured: false, graceUsedOn: null, streakReset: false };
  }

  let current: number;
  let graceUsedOn: string | null = null;
  let streakReset = false;
  let { graceDaysAvailable, graceDaysUsedThisWeek } = state;

  if (last === null) {
    current = 1;
  } else {
    const gap = daysBetween(last, today);
    if (gap <= 0) {
      // Clock went backwards (timezone travel); treat as already secured.
      return { state, daySecured: false, graceUsedOn: null, streakReset: false };
    }
    if (gap === 1) {
      current = state.current + 1;
    } else if (gap === 2 && graceDaysAvailable > 0) {
      graceUsedOn = addDays(last, 1);
      graceDaysAvailable -= 1;
      graceDaysUsedThisWeek += 1;
      current = state.current + 1;
    } else {
      current = 1;
      streakReset = state.current > 0;
    }
  }

  const next: StreakState = {
    current,
    longest: Math.max(state.longest, current),
    lastActiveDate: today,
    graceDaysAvailable,
    graceDaysUsedThisWeek,
  };
  return { state: next, daySecured: true, graceUsedOn, streakReset };
}

export type StreakDisplay = {
  /** Streak count to show, after accounting for a not-yet-broken gap. */
  current: number;
  /** True when today already has a meaningful action (solid ember). */
  activeToday: boolean;
  /** True when the streak survives only if the user acts today. */
  atRisk: boolean;
};

/** What the Today screen ember should show, without mutating anything. */
export function streakDisplay(prev: StreakState, today: string): StreakDisplay {
  const state = refillGrace(prev, today);
  const last = state.lastActiveDate;
  if (last === null) return { current: 0, activeToday: false, atRisk: false };
  if (last === today) return { current: state.current, activeToday: true, atRisk: false };
  const gap = daysBetween(last, today);
  if (gap === 1) return { current: state.current, activeToday: false, atRisk: true };
  if (gap === 2 && state.graceDaysAvailable > 0) {
    return { current: state.current, activeToday: false, atRisk: true };
  }
  return { current: 0, activeToday: false, atRisk: false };
}
