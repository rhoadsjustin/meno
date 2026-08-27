/**
 * Active practice-session persistence (docs/03 §8: sessions are resumable
 * and interruptible without penalty). Stored in the settings table.
 */
import { eq } from 'drizzle-orm';

import { db, tables } from '@/services/db';
import { deserializeSession, serializeSession, type SessionState } from '@/services/practice/session';

const KEY = 'activeSession';

export async function saveActiveSession(state: SessionState): Promise<void> {
  const value = serializeSession(state);
  await db
    .insert(tables.settings)
    .values({ key: KEY, value })
    .onConflictDoUpdate({ target: tables.settings.key, set: { value } });
}

export async function loadActiveSession(): Promise<SessionState | null> {
  const rows = await db.select().from(tables.settings).where(eq(tables.settings.key, KEY)).limit(1);
  return rows[0] ? deserializeSession(rows[0].value) : null;
}

export async function clearActiveSession(): Promise<void> {
  await db.delete(tables.settings).where(eq(tables.settings.key, KEY));
}
