/**
 * Stitch sessions (docs/03 §5): every 5 chunks (and at goal completion) the
 * user recites from chunk 1 through the current chunk as one long text.
 * A goal is Memorized when all chunks are memorized AND a full-passage
 * stitch passes ≥90%.
 */
import { eq } from 'drizzle-orm';

import { db, tables } from '@/services/db';
import { chunksForGoal, type Chunk } from '@/services/db/repos/goals';

export const STITCH_PASS = 0.9;
const STITCH_INTERVAL = 5;

type StitchState = {
  /** tier≥3 chunk count at the last completed stitch. */
  lastCount: number;
  /** True once a full-passage stitch passed at ≥90%. */
  finalPassed: boolean;
  history: { at: number; accuracy: number; chunkCount: number }[];
};

const EMPTY: StitchState = { lastCount: 0, finalPassed: false, history: [] };

function key(goalId: string): string {
  return `stitch_${goalId}`;
}

export async function loadStitchState(goalId: string): Promise<StitchState> {
  const rows = await db
    .select()
    .from(tables.settings)
    .where(eq(tables.settings.key, key(goalId)))
    .limit(1);
  if (!rows[0]) return { ...EMPTY };
  try {
    return { ...EMPTY, ...(JSON.parse(rows[0].value) as StitchState) };
  } catch {
    return { ...EMPTY };
  }
}

async function saveStitchState(goalId: string, state: StitchState): Promise<void> {
  const value = JSON.stringify(state);
  await db
    .insert(tables.settings)
    .values({ key: key(goalId), value })
    .onConflictDoUpdate({ target: tables.settings.key, set: { value } });
}

export type StitchPlan = {
  due: boolean;
  /** Chunks covered: chunk 1 through the last tier≥3 chunk. */
  chunks: Chunk[];
  /** True when this stitch covers the whole goal (the memorization gate). */
  isFinal: boolean;
};

/** Reached tier 3+ — solid enough to be stitched (03 §5). */
function stitchable(c: Chunk): boolean {
  return c.tier >= 3;
}

export async function stitchPlan(goalId: string): Promise<StitchPlan> {
  const chunks = await chunksForGoal(goalId);
  // Chunks unlock sequentially, so the stitchable set is a prefix.
  let count = 0;
  while (count < chunks.length && stitchable(chunks[count])) count++;
  const covered = chunks.slice(0, count);
  const allMemorized = chunks.length > 0 && chunks.every((c) => c.status === 'memorized');
  const state = await loadStitchState(goalId);

  const intervalDue = count - state.lastCount >= STITCH_INTERVAL;
  const finalDue = allMemorized && !state.finalPassed;

  return {
    due: count >= 2 && (intervalDue || finalDue),
    chunks: covered,
    isFinal: allMemorized && count === chunks.length,
  };
}

/** Records a stitch attempt; completes the goal when the final stitch passes. */
export async function recordStitchResult(
  goalId: string,
  accuracy: number,
  chunkCount: number,
  isFinal: boolean
): Promise<{ goalCompleted: boolean }> {
  const state = await loadStitchState(goalId);
  const passed = accuracy >= STITCH_PASS;
  const next: StitchState = {
    lastCount: passed ? chunkCount : state.lastCount,
    finalPassed: state.finalPassed || (isFinal && passed),
    history: [...state.history, { at: Date.now(), accuracy, chunkCount }].slice(-50),
  };
  await saveStitchState(goalId, next);

  let goalCompleted = false;
  if (isFinal && passed) {
    await db.update(tables.goals).set({ status: 'completed' }).where(eq(tables.goals.id, goalId));
    goalCompleted = true;
  }
  return { goalCompleted };
}
