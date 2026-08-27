/** Stats aggregation (docs/06 §2, 07 §6 Stats screen). */
import { eq, gte } from 'drizzle-orm';

import { db, tables } from '@/services/db';
import { localToday } from '@/services/db/repos/streaks';

/** Mode → tier weight so higher tiers count more (06 §2). */
const MODE_WEIGHT: Record<string, number> = {
  read: 5,
  firstLetters: 10,
  blanks25: 15,
  blanks50: 20,
  blanks75: 20,
  arrange: 30,
  type: 40,
  speak: 50,
};

export type Stats = {
  /** Weighted accuracy over the last 30 days, 0–1, or null with no data. */
  accuracy30: number | null;
  versesMemorized: number;
  totalReviews: number;
  recitations: number;
  overrides: number;
  /** ISO date → practiced?, for the last `weeks` full weeks (Mon-start). */
  practiceDays: { date: string; practiced: boolean }[];
};

export async function loadStats(weeks = 5): Promise<Stats> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recent = await db
    .select()
    .from(tables.attempts)
    .where(gte(tables.attempts.createdAt, since));

  let weightSum = 0;
  let accSum = 0;
  for (const a of recent) {
    const w = MODE_WEIGHT[a.mode] ?? 10;
    weightSum += w;
    accSum += a.accuracy * w;
  }

  const memorized = await db
    .select()
    .from(tables.chunks)
    .where(eq(tables.chunks.status, 'memorized'));
  const versesMemorized = memorized.reduce((sum, c) => {
    if (c.startChapter === c.endChapter) return sum + (c.endVerse - c.startVerse + 1);
    return sum + (c.endVerse - c.startVerse + 1); // cross-chapter chunks don't exist (03 §5)
  }, 0);

  const allAttempts = await db.select({ source: tables.attempts.source, createdAt: tables.attempts.createdAt }).from(tables.attempts);
  const lockEvents = await db.select({ type: tables.lockEvents.type }).from(tables.lockEvents);

  // Practice grid: the last `weeks` weeks ending today.
  const practicedDates = new Set(
    allAttempts.map((a) => localToday(a.createdAt))
  );
  const days: { date: string; practiced: boolean }[] = [];
  const today = new Date();
  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = localToday(d);
    days.push({ date: iso, practiced: practicedDates.has(iso) });
  }

  return {
    accuracy30: weightSum > 0 ? accSum / weightSum : null,
    versesMemorized,
    totalReviews: allAttempts.filter((a) => a.source === 'review').length,
    recitations: lockEvents.filter((e) => e.type === 'reciteSuccess').length,
    overrides: lockEvents.filter((e) => e.type === 'override').length,
    practiceDays: days,
  };
}
