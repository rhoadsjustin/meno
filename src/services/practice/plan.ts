/**
 * What tapping Practice does next for a goal (docs/03-memory-engine.md §5,
 * "Practice order"). Pure: the goals repo reads the chunks and their mastery
 * days, this decides — which chunk comes first, what the step is called, and
 * whether a verse waiting on its second-day seal is the next thing or an
 * optional check beside new work.
 */
import { nextTier, tierDef } from '@/services/practice/tiers';

/** A chunk as the plan sees it. */
export type ChunkStanding = {
  id: string;
  orderIndex: number;
  /** Highest tier cleared; -1 = untouched (as `chunks.tier`). */
  tier: number;
  status: 'locked' | 'active' | 'learning' | 'memorized';
  /**
   * Distinct local days with a mastery pass (03 §1), as days before today:
   * 0 = today, 1 = yesterday. Only read for a chunk that has topped the
   * ladder, so the repo may leave it empty for one still climbing.
   */
  masteryDaysAgo: readonly number[];
};

export type PracticeStep =
  /** A verse not yet practiced: the ladder from Read. */
  | { kind: 'start'; chunkId: string; tier: number }
  /** A verse part-way up the ladder, picking up at `tier`. */
  | { kind: 'continue'; chunkId: string; tier: number }
  /** Topped the ladder on an earlier day: one clean pass makes it Memorized. */
  | { kind: 'seal'; chunkId: string; tier: number }
  /** Topped the ladder today: nothing to do until a second day can seal it. */
  | { kind: 'rest'; chunkId: string };

export type SealStep = Extract<PracticeStep, { kind: 'seal' }>;

export type PracticePlan = {
  /** What the main Practice button does; null once every chunk is memorized. */
  next: PracticeStep | null;
  /** A seal offered beside new work rather than ahead of it. */
  optionalSeal: SealStep | null;
  /** When `next` is a seal: the new work that follows it, if any. */
  then: PracticeStep | null;
  /** Every unfinished chunk's step, in passage order. */
  steps: PracticeStep[];
};

/**
 * How long a seal may wait behind new work. A verse whose last mastery day
 * was yesterday (or today) is offered as an optional check; left any longer
 * it comes first again, so tapping only the main button still seals it.
 */
export const SEAL_GRACE_DAYS = 1;

const DAY_MS = 24 * 60 * 60 * 1000;

function localMidnight(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Attempt timestamps → distinct local-day offsets before `now`, nearest first. */
export function daysAgo(dates: readonly Date[], now: Date): number[] {
  const today = localMidnight(now);
  // Rounded so a daylight-saving day (23 or 25 hours) still counts as one;
  // a clock set backwards reads as today rather than a negative day.
  const offsets = dates.map((d) => Math.max(0, Math.round((today - localMidnight(d)) / DAY_MS)));
  return [...new Set(offsets)].sort((a, b) => a - b);
}

/** One chunk's step today; null when it is locked or already memorized. */
export function stepFor(chunk: ChunkStanding): PracticeStep | null {
  if (chunk.status === 'locked' || chunk.status === 'memorized') return null;
  const tier = nextTier(chunk.tier);
  if (chunk.tier < 0) return { kind: 'start', chunkId: chunk.id, tier };
  // Still climbing: the next tier is new ground.
  if (tier !== chunk.tier) return { kind: 'continue', chunkId: chunk.id, tier };

  // At the top of the ladder, where only mastery days move it on. Memorized
  // takes two of them, and a pass today adds today's.
  const days = chunk.masteryDaysAgo;
  if (days.length === 0) return { kind: 'continue', chunkId: chunk.id, tier };
  if (days.length === 1 && days[0] === 0) return { kind: 'rest', chunkId: chunk.id };
  return { kind: 'seal', chunkId: chunk.id, tier };
}

/**
 * Orders a goal's unfinished chunks into what happens next.
 *
 * New work (start or continue) comes first, lowest chunk first. A seal waits
 * beside it as an optional check for `SEAL_GRACE_DAYS`; one left longer than
 * that goes ahead of the new work. With no new work the seal is simply next,
 * and with nothing but resting chunks the lowest-order one stands in so
 * callers still have the goal's current verse.
 */
export function planPractice(chunks: readonly ChunkStanding[]): PracticePlan {
  const ordered = [...chunks].sort((a, b) => a.orderIndex - b.orderIndex);
  const steps: PracticeStep[] = [];
  let work: PracticeStep | null = null;
  let freshSeal: SealStep | null = null;
  let overdueSeal: SealStep | null = null;
  let rest: PracticeStep | null = null;

  for (const chunk of ordered) {
    const step = stepFor(chunk);
    if (!step) continue;
    steps.push(step);
    if (step.kind === 'seal') {
      const overdue = Math.min(...chunk.masteryDaysAgo) > SEAL_GRACE_DAYS;
      if (overdue) overdueSeal ??= step;
      else freshSeal ??= step;
    } else if (step.kind === 'rest') {
      rest ??= step;
    } else {
      work ??= step;
    }
  }

  if (overdueSeal) return { next: overdueSeal, optionalSeal: null, then: work, steps };
  if (work) return { next: work, optionalSeal: freshSeal, then: null, steps };
  if (freshSeal) return { next: freshSeal, optionalSeal: null, then: null, steps };
  return { next: rest, optionalSeal: null, then: null, steps };
}

export type PracticeStepCopy = {
  /** Button label where the reference is already beside it. */
  verb: string;
  /** Button label on its own: says what happens and to which reference. */
  button: string;
  /** One line under the button. */
  subline: string;
  /** The full sentence for VoiceOver. */
  spoken: string;
};

/**
 * Words for a step. `reference` is the chunk's formatted range; `thenReference`
 * is the verse that follows when a seal goes ahead of new work. A `rest` step
 * has no action, so its `button` reads as a status line instead.
 */
export function describeStep(
  step: PracticeStep,
  reference: string,
  thenReference?: string,
): PracticeStepCopy {
  switch (step.kind) {
    case 'start': {
      const first = tierDef(step.tier).name;
      return {
        verb: 'Start',
        button: `Start ${reference}`,
        subline: `New verse · begins with ${first}`,
        spoken: `Start ${reference}, a new verse. Begins with ${first}.`,
      };
    }
    case 'continue': {
      const name = tierDef(step.tier).name;
      return {
        verb: 'Continue',
        button: `Continue ${reference}`,
        subline: `Next step · ${name}`,
        spoken: `Continue ${reference}. The next step is ${name}.`,
      };
    }
    case 'seal':
      return {
        verb: 'Seal',
        button: `Seal ${reference}`,
        subline: thenReference
          ? `One recitation · then on to ${thenReference}`
          : 'One recitation makes it memorized',
        spoken: thenReference
          ? `Seal ${reference}. One clean recitation makes it memorized, then on to ${thenReference}.`
          : `Seal ${reference}. One clean recitation makes it memorized.`,
      };
    case 'rest':
      return {
        verb: 'Seals tomorrow',
        button: `${reference} seals tomorrow`,
        subline: 'Nothing left today · one recitation tomorrow makes it memorized',
        spoken: `${reference} is done for today. One clean recitation tomorrow makes it memorized.`,
      };
  }
}
