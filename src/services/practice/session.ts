/**
 * Practice-session state machine (docs/03-memory-engine.md §8). Pure and
 * fully serializable so sessions survive an app kill (M2 acceptance:
 * killing the app mid-session resumes correctly).
 */
import { gradeBand, type RoundBand } from '@/services/grading';
import {
  blanksDensity,
  LADDER_ROUNDS,
  nextTier,
  tierDef,
  TIERS,
  type PracticeMode,
} from '@/services/practice/tiers';

export type RoundResult = {
  mode: PracticeMode;
  /** 0–1 for graded modes; null for read/self-report rounds. */
  accuracy: number | null;
  /** True for a pass or an almost: the round moved on. */
  passed: boolean;
  /** Which band the round landed in; self-report rounds are only ever `pass`
   * or `miss`. Absent on sessions persisted before the band existed. */
  band?: RoundBand;
};

export type SessionState = {
  goalId: string;
  chunkId: string;
  /** Tier being attempted (the chunk's highest cleared + 1). */
  tier: number;
  /** Modes to clear in order for this tier. */
  rounds: PracticeMode[];
  roundIndex: number;
  results: RoundResult[];
  /** Fails at the current tier this session (2 → suggest dropping a tier). */
  failCount: number;
  /** Bumps every graded attempt so blank/tile randomness varies on retry. */
  attemptNo: number;
  startedAt: number;
};

export type RoundOutcome = {
  state: SessionState;
  /** The round advanced — a pass or an almost. */
  passed: boolean;
  /** `almost` advances like a pass but is not one: it never counts toward
   * Memorized (docs/03 §1), so callers must not treat it as a clean clear. */
  band: RoundBand;
  /** Set when the whole tier was just cleared. */
  tierCleared: boolean;
  /** True when two fails suggest rebuilding at a lower tier (never forced). */
  suggestDropTier: boolean;
};

/** What a graded round reports. `unitCount` is the length the accuracy was
 * measured against — words for type/speak, blanks for a blanks round, tiles
 * for arrange — and sets how much slip the tier tolerates (grading/diff). */
export type RoundInput = {
  accuracy?: number;
  unitCount?: number;
  selfPass?: boolean;
};

export function startSession(input: {
  goalId: string;
  chunkId: string;
  highestClearedTier: number;
  now: number;
}): SessionState {
  const tier = nextTier(input.highestClearedTier);
  return {
    goalId: input.goalId,
    chunkId: input.chunkId,
    tier,
    rounds: [...tierDef(tier).modes],
    roundIndex: 0,
    results: [],
    failCount: 0,
    attemptNo: 0,
    startedAt: input.now,
  };
}

export function currentMode(state: SessionState): PracticeMode {
  return state.rounds[state.roundIndex];
}

export function isComplete(state: SessionState): boolean {
  return state.roundIndex >= state.rounds.length;
}

/**
 * Applies one round result. Graded modes pass `accuracy`; read and
 * first-letters rounds pass `selfPass` instead (completion / self-report).
 */
export function recordRound(state: SessionState, result: RoundInput): RoundOutcome {
  if (isComplete(state)) throw new Error('Session already complete');
  const mode = currentMode(state);
  const def = tierDef(state.tier);

  const selfBand: RoundBand = (result.selfPass ?? true) ? 'pass' : 'miss';
  const band =
    def.passThreshold === null
      ? selfBand
      : gradeBand(def.passThreshold, result.accuracy ?? 0, result.unitCount ?? 0);
  // An almost moves on up the ladder like a pass; what it does not do is
  // count toward Memorized, which is decided from the attempts themselves.
  const passed = band !== 'miss';

  const entry: RoundResult = { mode, accuracy: result.accuracy ?? null, passed, band };
  const next: SessionState = {
    ...state,
    results: [...state.results, entry],
    attemptNo: state.attemptNo + 1,
    roundIndex: passed ? state.roundIndex + 1 : state.roundIndex,
    failCount: passed ? state.failCount : state.failCount + 1,
  };

  return {
    state: next,
    passed,
    band,
    tierCleared: passed && next.roundIndex >= next.rounds.length,
    suggestDropTier: !passed && next.failCount >= 2 && next.tier > 0,
  };
}

/** Where a chunk stands after a round at the top of the ladder. */
export type TopTierStanding =
  /** Sealed: the second mastery day is in. */
  | 'memorized'
  /** Today's mastery day is banked; only another day can seal it. */
  | 'sealsTomorrow'
  /** Speak was cleared on an almost and no clean pass is banked today. */
  | 'needsCleanPass';

/**
 * What a cleared tier means for Memorized, or null below the top tier, where
 * the next tier is simply served.
 *
 * Tier 6 has nowhere to advance to, so the screen has to end the session
 * there rather than reload into the same Speak round — and what it may say
 * depends on the band. A pass banks today by definition. An almost banks
 * nothing, so the day only counts if a clean Type or Speak earlier today
 * already banked it (`dayBanked`); otherwise a clean recitation is still
 * owed and the screen must say so rather than promise tomorrow.
 */
export function topTierStanding(input: {
  tier: number;
  band: RoundBand;
  memorized: boolean;
  /** A clean Type/Speak attempt today already counts toward Memorized. */
  dayBanked: boolean;
}): TopTierStanding | null {
  if (input.band === 'miss') return null;
  if (input.memorized) return 'memorized';
  if (nextTier(input.tier) !== input.tier) return null;
  return input.band === 'pass' || input.dayBanked ? 'sealsTomorrow' : 'needsCleanPass';
}

/**
 * A fresh run at the tier just attempted — "try again" after an almost at
 * the top tier. Built here rather than by reloading so the retry is the same
 * chunk and the same round whatever else has become practiceable.
 */
export function retryTier(state: SessionState, now: number): SessionState {
  return {
    ...state,
    rounds: [...tierDef(state.tier).modes],
    roundIndex: 0,
    results: [],
    failCount: 0,
    attemptNo: state.attemptNo + 1,
    startedAt: now,
  };
}

export type LadderProgress = {
  /** Rounds behind the user on the whole ladder, Read through Speak. */
  done: number;
  total: number;
  /** Set while the current round is one of several passes of the same
   * exercise (First Letters runs twice), so the repeat reads as intended. */
  pass: { index: number; of: number } | null;
};

/**
 * Where the session sits on the chunk's whole ladder. A session only holds
 * one tier's rounds, so on its own it cannot say how much is left — and a
 * practice run that never shows its end reads as stuck.
 */
export function ladderProgress(state: SessionState): LadderProgress {
  const before = TIERS.filter((t) => t.tier < state.tier).reduce((n, t) => n + t.modes.length, 0);
  const done = before + Math.min(state.roundIndex, state.rounds.length);
  let pass: LadderProgress['pass'] = null;
  if (!isComplete(state)) {
    const mode = currentMode(state);
    const of = state.rounds.filter((m) => m === mode).length;
    if (of > 1) {
      const index = state.rounds.slice(0, state.roundIndex).filter((m) => m === mode).length + 1;
      pass = { index, of };
    }
  }
  return { done, total: LADDER_ROUNDS, pass };
}

/**
 * Rebuilds the session one tier lower (docs/03 §1: "failing a tier twice
 * suggests dropping one tier — suggestion, never forced"). Session-local:
 * the chunk's highest-cleared tier is untouched, so there is no penalty and
 * the harder tier is waiting again once this one clears.
 */
export function dropTier(state: SessionState): SessionState {
  const tier = Math.max(0, state.tier - 1);
  return {
    ...state,
    tier,
    rounds: [...tierDef(tier).modes],
    roundIndex: 0,
    failCount: 0,
    attemptNo: state.attemptNo + 1,
  };
}

/** Density for the current round when it is a blanks mode. */
export function currentBlanksDensity(state: SessionState): number {
  return blanksDensity(currentMode(state));
}

export function serializeSession(state: SessionState): string {
  return JSON.stringify(state);
}

export function deserializeSession(raw: string): SessionState | null {
  try {
    const s = JSON.parse(raw) as SessionState;
    if (typeof s.chunkId !== 'string' || !Array.isArray(s.rounds)) return null;
    return s;
  } catch {
    return null;
  }
}
