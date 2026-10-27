/**
 * Badges (docs/06 §4): all earned, all real. Conditions are recomputed from
 * the database and newly earned badges inserted; display data includes
 * locked badges so the medallion wall is visible-by-design.
 */
import { eq } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';

import { getBook, getPassage, getTranslation } from '@/services/bible';
import { db, tables } from '@/services/db';
import { t } from '@/i18n';
import { loadStreak } from '@/services/db/repos/streaks';
import { memorizedFullChapter, memorizedWholeBook } from '@/services/goals/badge-rules';
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

/** Every badge, in display order. Names and hints are looked up by code at
 * display time (stats:badges), so the stored code never carries copy. */
export const BADGE_CODES: readonly BadgeCode[] = [
  'first_verse',
  'first_chapter',
  'first_book',
  'perfect_speak',
  'century_reviews',
  'dawn_reciter',
  'steady_30',
  'steady_100',
  'steady_365',
  'word_hoard_1k',
  'word_hoard_5k',
  'word_hoard_10k',
];

/** The badge's display name in the UI language. */
export function badgeName(code: BadgeCode): string {
  return t(`stats:badges.${code}.name`);
}

/** How to earn the badge, in the UI language. */
export function badgeHint(code: BadgeCode): string {
  return t(`stats:badges.${code}.hint`);
}

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
    for (const v of verses) {
      const language = getTranslation(v.translationId).languageCode;
      for (const w of tokenize(v.text, { language })) words.add(w);
    }
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

  // A whole chapter or book memorized; stopped goals don't count (badge-rules).
  const goals = await db.select().from(tables.goals);
  conditions.set('first_chapter', memorizedFullChapter(goals, chunks));
  conditions.set(
    'first_book',
    memorizedWholeBook(goals, chunks, (bookId) => getBook(bookId).chapters),
  );

  conditions.set(
    'perfect_speak',
    attempts.some((a) => a.mode === 'speak' && a.accuracy >= 1),
  );
  conditions.set('century_reviews', attempts.filter((a) => a.source === 'review').length >= 100);
  conditions.set('dawn_reciter', lockEvents.filter((e) => e.type === 'reciteSuccess').length >= 10);
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
