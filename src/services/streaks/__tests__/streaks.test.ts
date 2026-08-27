import { describe, expect, it } from 'vitest';

import {
  INITIAL_STREAK,
  isoWeek,
  recordActivity,
  streakDisplay,
  type StreakState,
} from '@/services/streaks';

describe('streaks', () => {
  it('starts a streak on first activity', () => {
    const r = recordActivity(INITIAL_STREAK, '2026-08-27');
    expect(r.state.current).toBe(1);
    expect(r.state.longest).toBe(1);
    expect(r.daySecured).toBe(true);
    expect(r.streakReset).toBe(false);
  });

  it('only counts a day once', () => {
    let s = recordActivity(INITIAL_STREAK, '2026-08-27').state;
    const again = recordActivity(s, '2026-08-27');
    expect(again.state.current).toBe(1);
    expect(again.daySecured).toBe(false);
  });

  it('extends on consecutive days and tracks longest', () => {
    let s = recordActivity(INITIAL_STREAK, '2026-08-25').state;
    s = recordActivity(s, '2026-08-26').state;
    s = recordActivity(s, '2026-08-27').state;
    expect(s.current).toBe(3);
    expect(s.longest).toBe(3);
  });

  it('bridges a single missed day with a grace day, silently and honestly', () => {
    let s = recordActivity(INITIAL_STREAK, '2026-08-24').state; // Monday
    s = recordActivity(s, '2026-08-25').state; // Tuesday
    const r = recordActivity(s, '2026-08-27'); // Thursday — missed Wednesday
    expect(r.state.current).toBe(3);
    expect(r.graceUsedOn).toBe('2026-08-26');
    expect(r.state.graceDaysAvailable).toBe(0);
    expect(r.state.graceDaysUsedThisWeek).toBe(1);
    expect(r.streakReset).toBe(false);
  });

  it('resets after two missed days even with grace available', () => {
    let s = recordActivity(INITIAL_STREAK, '2026-08-20').state;
    s = recordActivity(s, '2026-08-21').state;
    const r = recordActivity(s, '2026-08-24'); // 3-day gap
    expect(r.state.current).toBe(1);
    expect(r.streakReset).toBe(true);
    expect(r.state.longest).toBe(2);
    expect(r.state.graceDaysAvailable).toBe(1); // grace not wasted on a lost streak
  });

  it('resets on a single missed day when grace is spent', () => {
    let s: StreakState = { ...INITIAL_STREAK, graceDaysAvailable: 0 };
    s = recordActivity(s, '2026-08-25').state;
    s = { ...s, graceDaysAvailable: 0 };
    const r = recordActivity(s, '2026-08-27');
    expect(r.state.current).toBe(1);
    expect(r.streakReset).toBe(true);
  });

  it('refills one grace day when the ISO week rolls over', () => {
    // Spend grace in week A…
    let s = recordActivity(INITIAL_STREAK, '2026-08-24').state; // Mon of W35
    s = recordActivity(s, '2026-08-26').state; // grace used for Tue
    expect(s.graceDaysAvailable).toBe(0);
    // …continue daily into week B (Mon 2026-08-31): grace refills.
    s = recordActivity(s, '2026-08-27').state;
    s = recordActivity(s, '2026-08-28').state;
    s = recordActivity(s, '2026-08-29').state;
    s = recordActivity(s, '2026-08-30').state;
    const r = recordActivity(s, '2026-08-31');
    expect(isoWeek('2026-08-30')).not.toBe(isoWeek('2026-08-31'));
    expect(r.state.graceDaysAvailable).toBe(1);
    expect(r.state.graceDaysUsedThisWeek).toBe(0);
    // 24, (25 bridged), 26, 27, 28, 29, 30, 31 → 7 increments from 1
    expect(r.state.current).toBe(7);
  });

  it('reports ember display states', () => {
    const s = recordActivity(INITIAL_STREAK, '2026-08-26').state;
    expect(streakDisplay(s, '2026-08-26')).toEqual({
      current: 1,
      activeToday: true,
      atRisk: false,
    });
    expect(streakDisplay(s, '2026-08-27')).toEqual({
      current: 1,
      activeToday: false,
      atRisk: true,
    });
    // Grace still covers a one-day gap → shown as at-risk, not lost.
    expect(streakDisplay(s, '2026-08-28').atRisk).toBe(true);
    expect(streakDisplay(s, '2026-08-30')).toEqual({
      current: 0,
      activeToday: false,
      atRisk: false,
    });
  });
});
