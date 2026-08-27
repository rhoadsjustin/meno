/**
 * Goal + chunk persistence and orchestration. Screens stay thin; anything
 * touching both Scripture and the database goes through here.
 */
import { and, asc, eq } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';

import { getPassage } from '@/services/bible';
import type { RefRange } from '@/services/bible/types';
import { chunkPassage, type ChunkPlan } from '@/services/chunking';
import { db, tables } from '@/services/db';
import { nextTier, tierDef, TIERS } from '@/services/practice/tiers';

export type Goal = typeof tables.goals.$inferSelect;
export type Chunk = typeof tables.chunks.$inferSelect;

export type GoalPreview = {
  verseCount: number;
  wordCount: number;
  chunks: ChunkPlan[];
  /** ~1 new chunk/day reaching Tier 3 (docs/03 §5). */
  projectedDays: number;
};

/** Wizard preview: chunk plan + projected completion (no writes). */
export async function previewGoal(translationId: string, range: RefRange): Promise<GoalPreview> {
  const verses = await getPassage(translationId, range);
  if (verses.length === 0) throw new Error('Passage contains no verses');
  const chunks = chunkPassage(verses);
  const wordCount = verses.reduce((n, v) => n + v.text.split(/\s+/).filter(Boolean).length, 0);
  return { verseCount: verses.length, wordCount, chunks, projectedDays: chunks.length };
}

export async function createGoal(input: {
  translationId: string;
  range: RefRange;
  title: string;
  targetDate?: Date;
}): Promise<Goal> {
  const plan = await previewGoal(input.translationId, input.range);
  const goalId = Crypto.randomUUID();
  const now = new Date();

  await db.insert(tables.goals).values({
    id: goalId,
    translationId: input.translationId,
    startBookId: input.range.start.bookId,
    startChapter: input.range.start.chapter,
    startVerse: input.range.start.verse,
    endBookId: input.range.end.bookId,
    endChapter: input.range.end.chapter,
    endVerse: input.range.end.verse,
    title: input.title,
    createdAt: now,
    targetDate: input.targetDate ?? null,
    status: 'active',
  });

  await db.insert(tables.chunks).values(
    plan.chunks.map((c) => ({
      id: `${goalId}:${c.id}`,
      goalId,
      orderIndex: c.orderIndex,
      startBookId: c.start.bookId,
      startChapter: c.start.chapter,
      startVerse: c.start.verse,
      endBookId: c.end.bookId,
      endChapter: c.end.chapter,
      endVerse: c.end.verse,
      tier: 0,
      // First chunk starts active; the rest unlock when their predecessor
      // reaches Tier 3 (docs/03 §5).
      status: c.orderIndex === 0 ? ('active' as const) : ('locked' as const),
    }))
  );

  const goal = await getGoal(goalId);
  if (!goal) throw new Error('Goal insert failed');
  return goal;
}

export async function getGoal(id: string): Promise<Goal | undefined> {
  const rows = await db.select().from(tables.goals).where(eq(tables.goals.id, id)).limit(1);
  return rows[0];
}

export async function listGoals(): Promise<Goal[]> {
  return db.select().from(tables.goals).orderBy(asc(tables.goals.createdAt));
}

export async function activeGoal(): Promise<Goal | undefined> {
  const rows = await db
    .select()
    .from(tables.goals)
    .where(eq(tables.goals.status, 'active'))
    .orderBy(asc(tables.goals.createdAt))
    .limit(1);
  return rows[0];
}

export async function chunksForGoal(goalId: string): Promise<Chunk[]> {
  return db
    .select()
    .from(tables.chunks)
    .where(eq(tables.chunks.goalId, goalId))
    .orderBy(asc(tables.chunks.orderIndex));
}

/** The chunk the user practices next: lowest unlocked, not memorized. */
export async function currentChunk(goalId: string): Promise<Chunk | undefined> {
  const rows = await db
    .select()
    .from(tables.chunks)
    .where(and(eq(tables.chunks.goalId, goalId), eq(tables.chunks.status, 'active')))
    .orderBy(asc(tables.chunks.orderIndex))
    .limit(1);
  if (rows[0]) return rows[0];
  const learning = await db
    .select()
    .from(tables.chunks)
    .where(and(eq(tables.chunks.goalId, goalId), eq(tables.chunks.status, 'learning')))
    .orderBy(asc(tables.chunks.orderIndex))
    .limit(1);
  return learning[0];
}

/**
 * Applies a cleared tier to a chunk: bumps tier/status, and unlocks the
 * next chunk once Tier 3 is reached (docs/03 §5).
 */
export async function applyTierCleared(chunk: Chunk, clearedTier: number): Promise<void> {
  const newTier = Math.max(chunk.tier, clearedTier);
  const memorized = newTier >= 6;
  await db
    .update(tables.chunks)
    .set({
      tier: newTier,
      status: memorized ? 'memorized' : 'learning',
      memorizedAt: memorized ? new Date() : null,
    })
    .where(eq(tables.chunks.id, chunk.id));

  if (newTier >= 3) {
    const siblings = await chunksForGoal(chunk.goalId);
    const next = siblings.find((c) => c.orderIndex === chunk.orderIndex + 1);
    if (next && next.status === 'locked') {
      await db.update(tables.chunks).set({ status: 'active' }).where(eq(tables.chunks.id, next.id));
    }
  }
}

/** Sub-line copy like "Chunk 4 of 12 · Blanks 50" (docs/07 §6). */
export function chunkProgressLabel(chunk: Chunk, total: number): string {
  const tier = nextTier(chunk.tier);
  return `Chunk ${chunk.orderIndex + 1} of ${total} · ${tierDef(tier).name}`;
}

export { TIERS };
