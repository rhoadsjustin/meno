import * as Crypto from 'expo-crypto';

import { db, tables } from '@/services/db';
import type { PracticeMode } from '@/services/practice/tiers';

export async function recordAttempt(input: {
  chunkId: string;
  mode: PracticeMode;
  accuracy: number;
  durationMs: number;
  missedWords: string[];
  source: 'practice' | 'review' | 'popquiz' | 'unlock';
}): Promise<void> {
  await db.insert(tables.attempts).values({
    id: Crypto.randomUUID(),
    chunkId: input.chunkId,
    mode: input.mode,
    accuracy: input.accuracy,
    durationMs: input.durationMs,
    missedWords: JSON.stringify(input.missedWords),
    createdAt: new Date(),
    source: input.source,
  });
}
