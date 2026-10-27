/**
 * The tier ladder (docs/03-memory-engine.md §1). `chunks.tier` stores the
 * highest tier cleared; 6 = memorized.
 */
import { t } from '@/i18n';

export type PracticeMode =
  | 'read'
  | 'firstLetters'
  | 'blanks25'
  | 'blanks50'
  | 'blanks75'
  | 'arrange'
  | 'type'
  | 'speak';

export type TierDef = {
  tier: number;
  /** Catalog key under `practice:tiers`. */
  key: TierKey;
  /** Display name in the UI language, read at call time. */
  readonly name: string;
  /** Rounds required to clear the tier, in order. */
  modes: PracticeMode[];
  /** Minimum accuracy per round (0–1); null = completion/self-report only. */
  passThreshold: number | null;
};

export type TierKey = 'read' | 'firstLetters' | 'blanks25' | 'blanks50' | 'arrange' | 'type' | 'speak';

function tier(
  n: number,
  key: TierKey,
  modes: PracticeMode[],
  passThreshold: number | null,
): TierDef {
  return {
    tier: n,
    key,
    // A getter so the name follows the UI language, which is applied at
    // startup after this module has loaded.
    get name() {
      return t(`practice:tiers.${key}`);
    },
    modes,
    passThreshold,
  };
}

export const TIERS: readonly TierDef[] = [
  tier(0, 'read', ['read'], null),
  // Self-reported ≥ "mostly" 2× (03 §1).
  tier(1, 'firstLetters', ['firstLetters', 'firstLetters'], null),
  tier(2, 'blanks25', ['blanks25'], 0.9),
  tier(3, 'blanks50', ['blanks50', 'blanks75'], 0.9),
  tier(4, 'arrange', ['arrange'], 0.95),
  tier(5, 'type', ['type'], 0.95),
  tier(6, 'speak', ['speak'], 0.95),
];

/**
 * Where a day's work on a fresh chunk naturally ends (docs/03 §5: the pace is
 * one new chunk a day reaching Tier 3, which is also what unlocks the next
 * chunk). The practice screen offers to stop here instead of running the
 * whole ladder in one sitting.
 */
export const REST_TIER = 3;

/**
 * The first tier whose clean passes count toward Memorized (docs/03 §1: a
 * Type or Speak pass on two separate days).
 */
export const MASTERY_TIER = 5;

/** Rounds on the whole ladder for one chunk, Read through Speak. */
export const LADDER_ROUNDS = TIERS.reduce((n, d) => n + d.modes.length, 0);

/** XP base points per tier (docs/06 §3): xp = basePoints × accuracy. */
export const TIER_BASE_POINTS = [5, 10, 15, 20, 30, 40, 50] as const;

export function tierDef(tier: number): TierDef {
  const def = TIERS[tier];
  if (!def) throw new Error(`Unknown tier: ${tier}`);
  return def;
}

/** The tier a chunk practices next (its highest-cleared + 1, capped at
 * Speak). A fresh chunk has highestCleared = -1 and starts at Read. */
/** A tier's display name in the UI language. */
export function tierName(n: number): string {
  return tierDef(n).name;
}

/** "Chunk 4 of 12 · Blanks 50/75" (docs/07 §6); `index` is 1-based. */
export function chunkProgressCopy(index: number, total: number, tier: number): string {
  return t('practice:chunkProgress', { index, total, tier: tierName(tier) });
}

export function nextTier(highestCleared: number): number {
  return Math.min(Math.max(highestCleared + 1, 0), 6);
}

/** Blanks density for a blanks mode. */
export function blanksDensity(mode: PracticeMode): number {
  switch (mode) {
    case 'blanks25':
      return 0.25;
    case 'blanks50':
      return 0.5;
    case 'blanks75':
      return 0.75;
    default:
      throw new Error(`Not a blanks mode: ${mode}`);
  }
}
