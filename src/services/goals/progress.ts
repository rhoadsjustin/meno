/**
 * Where a passage in progress stands and what its button should do next,
 * shared by Today and Library so both name and open the same step
 * (services/practice/plan) instead of a fixed "Practice".
 */
import type { Href } from 'expo-router';

import { t } from '@/i18n';
import { formatRange } from '@/services/bible/refs';
import { practicePlan, type Chunk, type Goal } from '@/services/db/repos/goals';
import { stitchPlan } from '@/services/db/repos/stitch';
import { describeStep, type PracticeStep } from '@/services/practice/plan';

/** Where one passage in progress stands. */
export type GoalProgress = {
  goal: Goal;
  /** The chunk the main button opens, and what opening it does. */
  chunk: Chunk | null;
  step: PracticeStep | null;
  /** The verse that follows when `step` is a seal ahead of new work. */
  thenChunk: Chunk | null;
  /** A verse one recitation from memorized, offered beside the new work. */
  sealChunk: Chunk | null;
  totalChunks: number;
  stitchDue: boolean;
};

export async function progressFor(goal: Goal): Promise<GoalProgress> {
  const [{ plan, chunks }, stitch] = await Promise.all([
    practicePlan(goal.id),
    stitchPlan(goal.id),
  ]);
  const chunkOf = (step: PracticeStep | null) =>
    (step && chunks.find((c) => c.id === step.chunkId)) || null;
  return {
    goal,
    chunk: chunkOf(plan.next),
    step: plan.next,
    thenChunk: chunkOf(plan.then),
    sealChunk: chunkOf(plan.optionalSeal),
    totalChunks: chunks.length,
    stitchDue: stitch.due,
  };
}

export function chunkRangeLabel(chunk: Chunk): string {
  return formatRange({
    start: { bookId: chunk.startBookId, chapter: chunk.startChapter, verse: chunk.startVerse },
    end: { bookId: chunk.endBookId, chapter: chunk.endChapter, verse: chunk.endVerse },
  });
}

/** Button and sub-line copy for a passage's next step (services/practice/plan). */
export function stepCopy(p: GoalProgress & { chunk: Chunk; step: PracticeStep }) {
  const copy = describeStep(
    p.step,
    chunkRangeLabel(p.chunk),
    p.thenChunk ? chunkRangeLabel(p.thenChunk) : undefined,
  );
  // Where the verse sits in a longer passage (07 §6); a one-chunk goal has
  // nothing to place.
  const place =
    p.totalChunks > 1
      ? t('today:hero.chunkPlace', { index: p.chunk.orderIndex + 1, total: p.totalChunks })
      : '';
  return {
    ...copy,
    subline: place ? t('today:hero.placeAndDetail', { place, detail: copy.subline }) : copy.subline,
    // The sub-line is not read on its own (the button says it all), so the
    // spoken sentence carries the position too.
    spoken: place ? t('today:hero.spokenWithPlace', { spoken: copy.spoken, place }) : copy.spoken,
  };
}

export function practiceHref(goalId: string, chunk?: Chunk): Href {
  return chunk
    ? `/practice/${goalId}?chunk=${encodeURIComponent(chunk.id)}`
    : `/practice/${goalId}`;
}

/** What a passage's card offers: a step to open, or a status with nothing to open. */
export type GoalAction =
  | { kind: 'open'; label: string; spoken: string; href: Href }
  /** The verse topped the ladder today: nothing to do until tomorrow. */
  | { kind: 'resting'; label: string; spoken: string };

/**
 * The one action for a passage's card. A stitch outranks the next chunk; a
 * resting verse has a status in place of a button; a passage with every chunk
 * memorized and no stitch due has nothing to offer.
 */
export function goalAction(p: GoalProgress): GoalAction | null {
  if (p.stitchDue) {
    return {
      kind: 'open',
      label: t('today:others.stitch'),
      spoken: t('today:others.stitchSpoken', { title: p.goal.title }),
      href: `/stitch/${p.goal.id}`,
    };
  }
  if (!p.chunk || !p.step) return null;
  const copy = stepCopy({ ...p, chunk: p.chunk, step: p.step });
  const spoken = t('today:others.stepSpoken', { title: p.goal.title, spoken: copy.spoken });
  return p.step.kind === 'rest'
    ? { kind: 'resting', label: copy.verb, spoken }
    : { kind: 'open', label: copy.verb, spoken, href: practiceHref(p.goal.id) };
}
