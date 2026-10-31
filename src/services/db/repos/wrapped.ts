/**
 * Reads what the Year in the Word recap needs (docs/10 §5.2) and hands it
 * to the pure rollup. Everything stays on the device (docs/09 §1).
 */
import { eq } from 'drizzle-orm';

import { getPassage, getTranslation } from '@/services/bible';
import { db, tables } from '@/services/db';
import { keptPracticeDays } from '@/services/db/repos/stats';
import { tokenize } from '@/services/grading';
import {
  deviceClock,
  rollupYear,
  type LocalClock,
  type RecapChunk,
  type RecapInput,
  type YearRecap,
} from '@/services/wrapped';
import { parseRecap, serializeRecap, snapshotKey } from '@/services/wrapped/snapshot';

export async function loadRecapInput(year: number, clock: LocalClock = deviceClock): Promise<RecapInput> {
  const [chunkRows, attemptRows, goalRows, unlockRows, badgeRows, keptDays] = await Promise.all([
    db.select().from(tables.chunks),
    db
      .select({
        chunkId: tables.attempts.chunkId,
        mode: tables.attempts.mode,
        source: tables.attempts.source,
        durationMs: tables.attempts.durationMs,
        createdAt: tables.attempts.createdAt,
      })
      .from(tables.attempts),
    db.select().from(tables.goals),
    db
      .select({ createdAt: tables.lockEvents.createdAt })
      .from(tables.lockEvents)
      .where(eq(tables.lockEvents.type, 'reciteSuccess')),
    db.select({ code: tables.badges.code, earnedAt: tables.badges.earnedAt }).from(tables.badges),
    keptPracticeDays(),
  ]);

  const goalOfChunk = new Map(chunkRows.map((c) => [c.id, c.goalId]));
  const translationOfGoal = new Map(goalRows.map((g) => [g.id, g.translationId]));
  const inYear = (date: Date | null) => !!date && clock.dayOf(date).startsWith(`${year}-`);

  // Words are counted only for the year's memorized chunks: reading text can
  // mean a fetch (ESV, YouVersion), and nothing else needs it.
  const chunks: RecapChunk[] = await Promise.all(
    chunkRows.map(async (c) => ({
      goalId: c.goalId,
      memorizedAt: c.memorizedAt,
      verses: c.endVerse - c.startVerse + 1, // chunks never cross chapters (03 §5)
      words: inYear(c.memorizedAt)
        ? await countWords(translationOfGoal.get(c.goalId) ?? 'web', c)
        : 0,
    })),
  );

  return {
    attempts: attemptRows.flatMap((a) => {
      const goalId = goalOfChunk.get(a.chunkId);
      return goalId ? [{ goalId, mode: a.mode, source: a.source, durationMs: a.durationMs, createdAt: a.createdAt }] : [];
    }),
    chunks,
    goals: goalRows.map((g) => ({
      id: g.id,
      title: g.title,
      translationId: g.translationId,
      range: {
        start: { bookId: g.startBookId, chapter: g.startChapter, verse: g.startVerse },
        end: { bookId: g.endBookId, chapter: g.endChapter, verse: g.endVerse },
      },
    })),
    unlocks: unlockRows.map((r) => r.createdAt),
    badges: badgeRows,
    keptDays,
  };
}

/**
 * The recap for `year`, as of now. A finished year reads from its snapshot
 * (docs/10 §5.4), taken the first time it is opened after December 31.
 */
export async function loadYearRecap(year: number, clock: LocalClock = deviceClock): Promise<YearRecap> {
  const yearOver = Number(clock.dayOf(new Date()).slice(0, 4)) > year;
  const key = snapshotKey(year);
  if (yearOver) {
    const rows = await db.select().from(tables.settings).where(eq(tables.settings.key, key)).limit(1);
    const kept = parseRecap(rows[0]?.value, year);
    if (kept) return kept;
  }
  const recap = rollupYear(await loadRecapInput(year, clock), { year, clock });
  if (yearOver) {
    const value = serializeRecap(recap);
    await db
      .insert(tables.settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: tables.settings.key, set: { value } });
  }
  return recap;
}

type ChunkRange = {
  startBookId: string;
  startChapter: number;
  startVerse: number;
  endBookId: string;
  endChapter: number;
  endVerse: number;
};

/** Words in a chunk's text, or null when the text can't be read right now. */
async function countWords(translationId: string, c: ChunkRange): Promise<number | null> {
  try {
    const verses = await getPassage(translationId, {
      start: { bookId: c.startBookId, chapter: c.startChapter, verse: c.startVerse },
      end: { bookId: c.endBookId, chapter: c.endChapter, verse: c.endVerse },
    });
    const language = getTranslation(translationId).languageCode;
    return verses.reduce((sum, v) => sum + tokenize(v.text, { language }).length, 0);
  } catch {
    return null;
  }
}

/** Distinct local days with practice in `year`: enough to decide eligibility cheaply. */
export async function activeDaysIn(year: number, clock: LocalClock = deviceClock): Promise<number> {
  const [rows, kept] = await Promise.all([
    db.select({ createdAt: tables.attempts.createdAt }).from(tables.attempts),
    keptPracticeDays(),
  ]);
  const prefix = `${year}-`;
  const days = new Set(kept.filter((d) => d.startsWith(prefix)));
  for (const r of rows) {
    const day = clock.dayOf(r.createdAt);
    if (day.startsWith(prefix)) days.add(day);
  }
  return days.size;
}
