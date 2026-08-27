/**
 * Badges (docs/06 §4): all earned, all real. Conditions are recomputed from
 * the database and newly earned badges inserted; display data includes
 * locked badges so the medallion wall is visible-by-design.
 */
import { eq } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';

import { getPassage } from '@/services/bible';
import { db, tables } from '@/services/db';
import { loadStreak } from '@/services/db/repos/streaks';
import { tokenize } from '@/services/grading';

export type BadgeCode =
  | 'first_verse'
  | 'first_chapter'
  | 'first_book'
  | 'perfect_speak'
  | 'century_reviews'
  | 'dawn_reciter'
  | 'steady_30'
  | 'steady_100'
  | 'steady_365'
  | 'word_hoard_1k'
  | 'word_hoard_5k'
  | 'word_hoard_10k';

export const BADGE_DEFS: { code: BadgeCode; name: string; hint: string }[] = [
  { code: 'first_verse', name: 'First verse', hint: 'Memorize your first chunk' },
  { code: 'first_chapter', name: 'First chapter', hint: 'Memorize a full chapter' },
  { code: 'first_book', name: 'First book', hint: 'Memorize an entire book' },
  { code: 'perfect_speak', name: 'Word perfect', hint: '100% on a spoken recitation' },
  { code: 'century_reviews', name: 'Century', hint: 'Complete 100 reviews' },
  { code: 'dawn_reciter', name: 'Dawn reciter', hint: '10 recite-to-unlock successes' },
  { code: 'steady_30', name: 'Steady 30', hint: 'A 30-day streak' },
  { code: 'steady_100', name: 'Steady 100', hint: 'A 100-day streak' },
  { code: 'steady_365', name: 'Steady 365', hint: 'A full year' },
  { code: 'word_hoard_1k', name: 'Word hoard I', hint: '1,000 words memorized' },
  { code: 'word_hoard_5k', name: 'Word hoard II', hint: '5,000 words memorized' },
  { code: 'word_hoard_10k', name: 'Word hoard III', hint: '10,000 words memorized' },
];

export async function earnedBadges(): Promise<Map<string, Date>> {
  const rows = await db.select().from(tables.badges);
  return new Map(rows.map((r) => [r.code, r.earnedAt]));
}

/** Counts unique normalized words across all memorized chunks. */
async function memorizedUniqueWordCount(): Promise<number> {
  const memorized = await db
    .select()
    .from(tables.chunks)
    .where(eq(tables.chunks.status, 'memorized'));
  if (memorized.length === 0) return 0;
  const words = new Set<string>();
  for (const chunk of memorized) {
    const goalRows = await db
      .select({ translationId: tables.goals.translationId })
      .from(tables.goals)
      .where(eq(tables.goals.id, chunk.goalId))
      .limit(1);
    const verses = await getPassage(goalRows[0]?.translationId ?? 'web', {
      start: { bookId: chunk.startBookId, chapter: chunk.startChapter, verse: chunk.startVerse },
      end: { bookId: chunk.endBookId, chapter: chunk.endChapter, verse: chunk.endVerse },
    });
    for (const v of verses) for (const w of tokenize(v.text)) words.add(w);
  }
  return words.size;
}

/**
 * Recomputes all badge conditions and awards anything new.
 * Returns codes earned by this call (for the session-summary medallion).
 */
export async function refreshBadges(): Promise<BadgeCode[]> {
  const earned = await earnedBadges();
  const newly: BadgeCode[] = [];

  const chunks = await db.select().from(tables.chunks);
  const memorized = chunks.filter((c) => c.status === 'memorized');
  const attempts = await db.select().from(tables.attempts);
  const lockEvents = await db.select().from(tables.lockEvents);
  const streak = await loadStreak();

  const conditions = new Map<BadgeCode, boolean>();
  conditions.set('first_verse', memorized.length > 0);

  // Full chapter memorized: every chunk of some (goal, chapter) memorized.
  const byChapter = new Map<string, { total: number; done: number }>();
  for (const c of chunks) {
    const key = `${c.goalId}:${c.startBookId}:${c.startChapter}`;
    const entry = byChapter.get(key) ?? { total: 0, done: 0 };
    entry.total += 1;
    if (c.status === 'memorized') entry.done += 1;
    byChapter.set(key, entry);
  }
  conditions.set(
    'first_chapter',
    [...byChapter.values()].some((e) => e.total > 0 && e.done === e.total)
  );

  // Whole goal memorized where the goal spans an entire book.
  const goals = await db.select().from(tables.goals);
  const { getBook } = await import('@/services/bible');
  conditions.set(
    'first_book',
    goals.some((g) => {
      const goalChunks = chunks.filter((c) => c.goalId === g.id);
      if (goalChunks.length === 0) return false;
      const allDone = goalChunks.every((c) => c.status === 'memorized');
      const book = getBook(g.startBookId);
      const wholeBook =
        g.startBookId === g.endBookId &&
        g.startChapter === 1 &&
        g.startVerse === 1 &&
        g.endChapter === book.chapters;
      return allDone && wholeBook;
    })
  );

  conditions.set(
    'perfect_speak',
    attempts.some((a) => a.mode === 'speak' && a.accuracy >= 1)
  );
  conditions.set('century_reviews', attempts.filter((a) => a.source === 'review').length >= 100);
  conditions.set(
    'dawn_reciter',
    lockEvents.filter((e) => e.type === 'reciteSuccess').length >= 10
  );
  conditions.set('steady_30', streak.longest >= 30);
  conditions.set('steady_100', streak.longest >= 100);
  conditions.set('steady_365', streak.longest >= 365);

  // Word hoard only needs computing while it can still change something.
  if (!earned.has('word_hoard_10k')) {
    const words = await memorizedUniqueWordCount();
    conditions.set('word_hoard_1k', words >= 1000);
    conditions.set('word_hoard_5k', words >= 5000);
    conditions.set('word_hoard_10k', words >= 10000);
  }

  for (const [code, met] of conditions) {
    if (met && !earned.has(code)) {
      await db
        .insert(tables.badges)
        .values({ id: Crypto.randomUUID(), code, earnedAt: new Date() });
      newly.push(code);
    }
  }
  return newly;
}
