/** Lock configuration + event log persistence (docs/02 §4, 04 §6). */
import { eq } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';

import { db, tables } from '@/services/db';

export type LockConfig = typeof tables.lockConfig.$inferSelect;

const DEFAULTS: Omit<LockConfig, 'id'> = {
  enabled: false,
  mode: 'firstPickup',
  relockMinutes: 30,
  scheduleJson: null,
  verseSource: 'current',
  overrideStyle: 'instant',
  activitySelectionToken: null,
};

export async function loadLockConfig(): Promise<LockConfig> {
  const rows = await db.select().from(tables.lockConfig).where(eq(tables.lockConfig.id, 1)).limit(1);
  return rows[0] ?? { id: 1, ...DEFAULTS };
}

export async function saveLockConfig(patch: Partial<Omit<LockConfig, 'id'>>): Promise<LockConfig> {
  const current = await loadLockConfig();
  const next = { ...current, ...patch, id: 1 };
  await db
    .insert(tables.lockConfig)
    .values(next)
    .onConflictDoUpdate({ target: tables.lockConfig.id, set: next });
  return next;
}

export async function recordLockEvent(input: {
  type: 'shielded' | 'reciteSuccess' | 'override';
  verseChunkId?: string;
  accuracy?: number;
}): Promise<void> {
  await db.insert(tables.lockEvents).values({
    id: Crypto.randomUUID(),
    type: input.type,
    verseChunkId: input.verseChunkId ?? null,
    accuracy: input.accuracy ?? null,
    createdAt: new Date(),
  });
}

/** Neutral stats for Settings/Stats ("12 recitations, 3 overrides"). */
export async function lockEventCounts(): Promise<{ recitations: number; overrides: number }> {
  const rows = await db.select({ type: tables.lockEvents.type }).from(tables.lockEvents);
  return {
    recitations: rows.filter((r) => r.type === 'reciteSuccess').length,
    overrides: rows.filter((r) => r.type === 'override').length,
  };
}
