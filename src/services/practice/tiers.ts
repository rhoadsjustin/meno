/**
 * The tier ladder (docs/03-memory-engine.md §1). `chunks.tier` stores the
 * highest tier cleared; 6 = memorized.
 */

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
  name: string;
  /** Rounds required to clear the tier, in order. */
  modes: PracticeMode[];
  /** Minimum accuracy per round (0–1); null = completion/self-report only. */
  passThreshold: number | null;
};

export const TIERS: readonly TierDef[] = [
  { tier: 0, name: 'Read', modes: ['read'], passThreshold: null },
  // Self-reported ≥ "mostly" 2× (03 §1).
  { tier: 1, name: 'First Letters', modes: ['firstLetters', 'firstLetters'], passThreshold: null },
  { tier: 2, name: 'Blanks 25', modes: ['blanks25'], passThreshold: 0.9 },
  { tier: 3, name: 'Blanks 50/75', modes: ['blanks50', 'blanks75'], passThreshold: 0.9 },
  { tier: 4, name: 'Arrange', modes: ['arrange'], passThreshold: 0.95 },
  { tier: 5, name: 'Type', modes: ['type'], passThreshold: 0.95 },
  { tier: 6, name: 'Speak', modes: ['speak'], passThreshold: 0.95 },
];

/** XP base points per tier (docs/06 §3): xp = basePoints × accuracy. */
export const TIER_BASE_POINTS = [5, 10, 15, 20, 30, 40, 50] as const;

export function tierDef(tier: number): TierDef {
  const def = TIERS[tier];
  if (!def) throw new Error(`Unknown tier: ${tier}`);
  return def;
}

/** The tier a chunk practices next (its tier value + 1, capped at Speak). */
export function nextTier(highestCleared: number): number {
  return Math.min(highestCleared + 1, 6);
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
