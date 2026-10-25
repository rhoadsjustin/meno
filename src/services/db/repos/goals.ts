/**
 * Goal + chunk persistence and orchestration. Screens stay thin; anything
 * touching both Scripture and the database goes through here.
 */
import { and, asc, eq, inArray, ne } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';

import {
  formatRange,
  getPassage,
  getTranslation,
  refEquals,
  starterPassage,
  type StarterVerse,
} from '@/services/bible';
import type { RefRange } from '@/services/bible/types';
import { chunkPassage, type ChunkPlan } from '@/services/chunking';
import { meetsThreshold, tokenize } from '@/services/grading';
import { db, tables } from '@/services/db';
import { resolveFocusGoal } from '@/services/focus';
import { daysAgo, planPractice, type ChunkStanding, type PracticePlan } from '@/services/practice/plan';
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
  /** Set when this goal was created by joining a shared challenge (06 §5). */
  challengeId?: string;
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
    challengeId: input.challengeId ?? null,
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
      tier: -1, // nothing passed yet — first practice starts at Read

      // First chunk starts active; the rest unlock when their predecessor
      // reaches Tier 3 (docs/03 §5).
      status: c.orderIndex === 0 ? ('active' as const) : ('locked' as const),
    }))
  );

  const goal = await getGoal(goalId);
  if (!goal) throw new Error('Goal insert failed');
  return goal;
}

/** Starter starts in flight, by starter id — a second tap joins the first. */
const starterStarts = new Map<string, Promise<Goal>>();

/**
 * Quick start: turns a starter verse into an ordinary goal, ready to
 * practice. ESV when it is available and arrives in time, bundled KJV
 * otherwise (services/bible `starterPassage`), so this works offline.
 *
 * Safe to call twice: concurrent calls share one insert, and a starter the
 * user is already working on returns that goal instead of a duplicate.
 */
export function startStarterGoal(
  starter: StarterVerse,
  options: { preferEsv?: boolean } = {}
): Promise<Goal> {
  let pending = starterStarts.get(starter.id);
  if (!pending) {
    pending = (async () => {
      const existing = (await listActiveGoals()).find(
        (g) =>
          refEquals(
            { bookId: g.startBookId, chapter: g.startChapter, verse: g.startVerse },
            starter.range.start
          ) &&
          refEquals({ bookId: g.endBookId, chapter: g.endChapter, verse: g.endVerse }, starter.range.end)
      );
      if (existing) return existing;
      const { translationId } = await starterPassage(starter, options);
      return createGoal({ translationId, range: starter.range, title: formatRange(starter.range) });
    })().finally(() => starterStarts.delete(starter.id));
    starterStarts.set(starter.id, pending);
  }
  return pending;
}

export async function getGoal(id: string): Promise<Goal | undefined> {
  const rows = await db.select().from(tables.goals).where(eq(tables.goals.id, id)).limit(1);
  return rows[0];
}

/** Marks a goal as a shared challenge; the code goes into its links. */
export async function setGoalChallengeId(goalId: string, code: string): Promise<void> {
  await db.update(tables.goals).set({ challengeId: code }).where(eq(tables.goals.id, goalId));
}

/** Join-time dedupe: has this device already joined the challenge? */
export async function goalByChallengeId(code: string): Promise<Goal | undefined> {
  const rows = await db
    .select()
    .from(tables.goals)
    .where(eq(tables.goals.challengeId, code))
    .limit(1);
  return rows[0];
}

export async function listGoals(): Promise<Goal[]> {
  return db.select().from(tables.goals).orderBy(asc(tables.goals.createdAt));
}

/** Every passage in progress, oldest first. */
export async function listActiveGoals(): Promise<Goal[]> {
  return db
    .select()
    .from(tables.goals)
    .where(eq(tables.goals.status, 'active'))
    .orderBy(asc(tables.goals.createdAt));
}

/**
 * The focus goal (services/focus): the passage on the widgets and the
 * shield, and what a widget tap practices — the user's "Show on widgets"
 * pick, else the oldest active goal.
 */
export async function activeGoal(): Promise<Goal | undefined> {
  const [goals, focusId] = await Promise.all([listActiveGoals(), focusGoalId()]);
  return resolveFocusGoal(goals, focusId);
}

const FOCUS_KEY = 'focusGoalId';

/** The stored "Show on widgets" pick; may point at a finished goal (resolver skips it). */
export async function focusGoalId(): Promise<string | null> {
  const rows = await db
    .select()
    .from(tables.settings)
    .where(eq(tables.settings.key, FOCUS_KEY))
    .limit(1);
  return rows[0]?.value ?? null;
}

/** Stores the pick only — use services/widgets `showGoalOnWidgets` from screens. */
export async function setFocusGoalId(goalId: string): Promise<void> {
  await db
    .insert(tables.settings)
    .values({ key: FOCUS_KEY, value: goalId })
    .onConflictDoUpdate({ target: tables.settings.key, set: { value: goalId } });
}

export async function chunksForGoal(goalId: string): Promise<Chunk[]> {
  return db
    .select()
    .from(tables.chunks)
    .where(eq(tables.chunks.goalId, goalId))
    .orderBy(asc(tables.chunks.orderIndex));
}

/** Reference length of a chunk, in the same tokens the graders count. */
async function chunkUnitCount(chunk: Chunk, translationId: string): Promise<number> {
  const verses = await getPassage(translationId, {
    start: { bookId: chunk.startBookId, chapter: chunk.startChapter, verse: chunk.startVerse },
    end: { bookId: chunk.endBookId, chapter: chunk.endChapter, verse: chunk.endVerse },
  });
  return tokenize(verses.map((v) => v.text).join(' '), {
    language: getTranslation(translationId).languageCode,
  }).length;
}

/**
 * What tapping Practice does next for a goal, with the chunks it was decided
 * over. The decision itself is `planPractice` (services/practice/plan): new
 * work first, a verse waiting on its second-day seal offered beside it.
 */
export async function practicePlan(
  goalId: string,
  now: Date = new Date()
): Promise<{ plan: PracticePlan; chunks: Chunk[] }> {
  const chunks = await chunksForGoal(goalId);
  let translationId: string | undefined;
  const standings: ChunkStanding[] = [];
  for (const chunk of chunks) {
    let masteryDaysAgo: number[] = [];
    // Cheap check first: anything still climbing the ladder is plain work,
    // so only a chunk sitting at the ceiling costs a passage read.
    const unfinished = chunk.status === 'active' || chunk.status === 'learning';
    if (unfinished && nextTier(chunk.tier) === chunk.tier) {
      translationId ??= (await getGoal(goalId))?.translationId ?? 'web';
      const dates = await masteryDates(chunk.id, await chunkUnitCount(chunk, translationId));
      masteryDaysAgo = daysAgo(dates, now);
    }
    standings.push({
      id: chunk.id,
      orderIndex: chunk.orderIndex,
      tier: chunk.tier,
      status: chunk.status,
      masteryDaysAgo,
    });
  }
  return { plan: planPractice(standings), chunks };
}

/**
 * The goal's current verse: the chunk the main Practice button opens, which
 * is also what the widgets and recite-to-unlock show (docs/05 §1).
 *
 * A chunk that has topped the ladder and banked today's mastery day stays
 * `learning` until a second day seals it, so the plan passes over it for the
 * next chunk with work to do rather than parking the whole goal on it.
 *
 * When every unfinished chunk is waiting on tomorrow there is nothing to
 * pass on to, so the lowest-order one is still returned: callers need the
 * goal's current verse either way, and the practice screen turns it into its
 * "one day from sealed" state.
 */
export async function currentChunk(goalId: string): Promise<Chunk | undefined> {
  const { plan, chunks } = await practicePlan(goalId);
  const next = plan.next;
  return next ? chunks.find((c) => c.id === next.chunkId) : undefined;
}

/** The Memorized bar (docs/03 §1): a Tier 5/6 pass on two separate days. */
const MASTERY_THRESHOLD = 0.95;

/**
 * Applies a cleared tier to a chunk: bumps tier/status, unlocks the next
 * chunk once Tier 3 is reached, and marks Memorized per docs/03 §1 —
 * a Tier 5 or 6 pass at ≥95% on two separate days (attempts are the audit
 * trail). Creates the chunk's review item when it becomes memorized.
 *
 * `unitCount` is the chunk's word count: the mastery bar tolerates the same
 * single slip the round itself does, or a short chunk could clear Speak and
 * still never be credited with the day.
 */
export async function applyTierCleared(
  chunk: Chunk,
  clearedTier: number,
  unitCount: number
): Promise<{ memorized: boolean }> {
  const newTier = Math.max(chunk.tier, clearedTier);
  const memorized = clearedTier >= 5 && (await masteryDays(chunk.id, unitCount)).size >= 2;
  await db
    .update(tables.chunks)
    .set({
      tier: memorized ? 6 : newTier,
      status: memorized ? 'memorized' : 'learning',
      memorizedAt: memorized ? new Date() : null,
    })
    .where(eq(tables.chunks.id, chunk.id));

  if (memorized) {
    const { ensureReviewItem } = await import('@/services/db/repos/reviews');
    await ensureReviewItem(chunk.id);
  }

  if (newTier >= 3) {
    const siblings = await chunksForGoal(chunk.goalId);
    const next = siblings.find((c) => c.orderIndex === chunk.orderIndex + 1);
    if (next && next.status === 'locked') {
      await db.update(tables.chunks).set({ status: 'active' }).where(eq(tables.chunks.id, next.id));
    }
  }
  return { memorized };
}

function localDay(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * When a Type/Speak attempt cleared the mastery bar (03 §1); the distinct
 * local days among them are the chunk's mastery days.
 *
 * Stitch attempts are excluded. A stitch is filed against its last chunk but
 * graded over every chunk from the first through that one, so its accuracy
 * says nothing about the last chunk on its own — counting it could seal a
 * chunk the user never recited alone.
 */
async function masteryDates(chunkId: string, unitCount: number): Promise<Date[]> {
  const rows = await db
    .select({ createdAt: tables.attempts.createdAt, accuracy: tables.attempts.accuracy })
    .from(tables.attempts)
    .where(
      and(
        eq(tables.attempts.chunkId, chunkId),
        inArray(tables.attempts.mode, ['type', 'speak']),
        ne(tables.attempts.source, 'stitch')
      )
    );
  return rows
    .filter((r) => meetsThreshold(MASTERY_THRESHOLD, r.accuracy, unitCount))
    .map((r) => r.createdAt);
}

async function masteryDays(chunkId: string, unitCount: number): Promise<Set<string>> {
  return new Set((await masteryDates(chunkId, unitCount)).map(localDay));
}

/**
 * True when the chunk has topped the ladder and today's work is done: Speak
 * is cleared, today's mastery day is banked, and only a second day can seal
 * it. Without this the practice screen hands back the same Speak round every
 * time it is cleared, because `nextTier(6)` is 6 and the chunk stays
 * `learning` until Memorized.
 */
export async function awaitingSecondDay(chunk: Chunk, unitCount: number): Promise<boolean> {
  if (chunk.status === 'memorized' || nextTier(chunk.tier) !== chunk.tier) return false;
  const days = await masteryDays(chunk.id, unitCount);
  return days.size < 2 && days.has(localDay(new Date()));
}

/** Sub-line copy like "Chunk 4 of 12 · Blanks 50" (docs/07 §6). */
export function chunkProgressLabel(chunk: Chunk, total: number): string {
  const tier = nextTier(chunk.tier);
  return `Chunk ${chunk.orderIndex + 1} of ${total} · ${tierDef(tier).name}`;
}

export { TIERS };
