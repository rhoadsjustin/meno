import { eq } from 'drizzle-orm';

import { db, tables } from '@/services/db';
import {
  INITIAL_STREAK,
  recordActivity,
  streakDisplay,
  type StreakDisplay,
  type StreakState,
  type StreakUpdate,
} from '@/services/streaks';

/** Local calendar date as YYYY-MM-DD (the streak day boundary). */
export function localToday(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function loadStreak(): Promise<StreakState> {
  const rows = await db.select().from(tables.streaks).where(eq(tables.streaks.id, 1)).limit(1);
  const row = rows[0];
  if (!row) return { ...INITIAL_STREAK };
  return {
    current: row.current,
    longest: row.longest,
    lastActiveDate: row.lastActiveDate,
    graceDaysAvailable: row.graceDaysAvailable,
    graceDaysUsedThisWeek: row.graceDaysUsedThisWeek,
  };
}

async function saveStreak(state: StreakState): Promise<void> {
  await db
    .insert(tables.streaks)
    .values({ id: 1, ...state })
    .onConflictDoUpdate({ target: tables.streaks.id, set: { ...state } });
}

/** Marks today as active (any meaningful action) and persists. */
export async function secureToday(today = localToday()): Promise<StreakUpdate> {
  const update = recordActivity(await loadStreak(), today);
  await saveStreak(update.state);
  return update;
}

export async function currentStreakDisplay(today = localToday()): Promise<StreakDisplay> {
  return streakDisplay(await loadStreak(), today);
}
