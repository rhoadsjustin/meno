/**
 * Review items + sessions (docs/03 §6): modified SM-2 retention of
 * memorized chunks. Pure scheduling math lives in services/scheduler.
 */
import { asc, eq, inArray, lte } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';

import { db, tables } from '@/services/db';
import {
  applyReview,
  createReviewState,
  healthOf,
  type Health,
  type ReviewState,
} from '@/services/scheduler';

export type ReviewItem = typeof tables.reviewItems.$inferSelect;

/** Creates the review item when a chunk first reaches Memorized. */
export async function ensureReviewItem(chunkId: string): Promise<void> {
  const existing = await db
    .select({ id: tables.reviewItems.id })
    .from(tables.reviewItems)
    .where(eq(tables.reviewItems.chunkId, chunkId))
    .limit(1);
  if (existing[0]) return;
  const state = createReviewState(Date.now());
  await db.insert(tables.reviewItems).values({
    id: Crypto.randomUUID(),
    chunkId,
    easiness: state.easiness,
    intervalDays: state.intervalDays,
    repetitions: state.repetitions,
    dueAt: new Date(state.dueAt),
    lastReviewedAt: null,
    health: 'fresh',
  });
}

/** Due items, most overdue first, capped per session (default 5, 03 §6). */
export async function dueReviewItems(limit = 5, now = new Date()): Promise<ReviewItem[]> {
  return db
    .select()
    .from(tables.reviewItems)
    .where(lte(tables.reviewItems.dueAt, now))
    .orderBy(asc(tables.reviewItems.dueAt))
    .limit(limit);
}

export async function countDueReviews(now = new Date()): Promise<number> {
  const rows = await db
    .select({ id: tables.reviewItems.id })
    .from(tables.reviewItems)
    .where(lte(tables.reviewItems.dueAt, now));
  return rows.length;
}

/** The chunks behind the most overdue items, in that order, for naming what
 * is due (07 §6: count + up-to-3 references). */
export async function dueReviewChunks(
  limit = 3,
  now = new Date(),
): Promise<(typeof tables.chunks.$inferSelect)[]> {
  const items = await dueReviewItems(limit, now);
  if (items.length === 0) return [];
  const chunks = await db
    .select()
    .from(tables.chunks)
    .where(
      inArray(
        tables.chunks.id,
        items.map((item) => item.chunkId),
      ),
    );
  const byId = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  return items.flatMap((item) => byId.get(item.chunkId) ?? []);
}

export async function reviewItemForChunk(chunkId: string): Promise<ReviewItem | undefined> {
  const rows = await db
    .select()
    .from(tables.reviewItems)
    .where(eq(tables.reviewItems.chunkId, chunkId))
    .limit(1);
  return rows[0];
}

/** Review items for many chunks in one read per batch, keyed by chunk id. */
export async function reviewItemsForChunks(chunkIds: string[]): Promise<Map<string, ReviewItem>> {
  const byChunk = new Map<string, ReviewItem>();
  // Well under SQLite's bound-parameter limit.
  const BATCH = 500;
  for (let i = 0; i < chunkIds.length; i += BATCH) {
    const rows = await db
      .select()
      .from(tables.reviewItems)
      .where(inArray(tables.reviewItems.chunkId, chunkIds.slice(i, i + BATCH)));
    for (const row of rows) byChunk.set(row.chunkId, row);
  }
  return byChunk;
}

/** Applies one review result via SM-2 and persists the new state. */
/**
 * Applies one review to the item's schedule. Resolves to whether the verse
 * held (SM-2 quality 3 or better): a review that didn't hold resets the
 * interval, so the verse comes back tomorrow.
 */
export async function recordReviewResult(item: ReviewItem, accuracy: number): Promise<boolean> {
  const state: ReviewState = {
    easiness: item.easiness,
    intervalDays: item.intervalDays,
    repetitions: item.repetitions,
    dueAt: item.dueAt.getTime(),
    lastReviewedAt: item.lastReviewedAt?.getTime() ?? null,
  };
  const next = applyReview(state, accuracy, Date.now());
  await db
    .update(tables.reviewItems)
    .set({
      easiness: next.easiness,
      intervalDays: next.intervalDays,
      repetitions: next.repetitions,
      dueAt: new Date(next.dueAt),
      lastReviewedAt: new Date(next.lastReviewedAt ?? Date.now()),
      health: 'fresh',
    })
    .where(eq(tables.reviewItems.id, item.id));
  // applyReview zeroes repetitions exactly when the review didn't hold.
  return next.repetitions > 0;
}

/** Recomputed lazily whenever an item is displayed. */
export function itemHealth(item: ReviewItem, now = Date.now()): Health {
  return healthOf({ dueAt: item.dueAt.getTime() }, now);
}
