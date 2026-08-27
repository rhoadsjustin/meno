/**
 * Practice-session state machine (docs/03-memory-engine.md §8). Pure and
 * fully serializable so sessions survive an app kill (M2 acceptance:
 * killing the app mid-session resumes correctly).
 */
import { blanksDensity, nextTier, tierDef, type PracticeMode } from '@/services/practice/tiers';

export type RoundResult = {
  mode: PracticeMode;
  /** 0–1 for graded modes; null for read/self-report rounds. */
  accuracy: number | null;
  passed: boolean;
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
  passed: boolean;
  /** Set when the whole tier was just cleared. */
  tierCleared: boolean;
  /** True when two fails suggest rebuilding at a lower tier (never forced). */
  suggestDropTier: boolean;
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
export function recordRound(
  state: SessionState,
  result: { accuracy?: number; selfPass?: boolean }
): RoundOutcome {
  if (isComplete(state)) throw new Error('Session already complete');
  const mode = currentMode(state);
  const def = tierDef(state.tier);

  const passed =
    def.passThreshold === null
      ? (result.selfPass ?? true)
      : (result.accuracy ?? 0) >= def.passThreshold;

  const entry: RoundResult = { mode, accuracy: result.accuracy ?? null, passed };
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
    tierCleared: passed && next.roundIndex >= next.rounds.length,
    suggestDropTier: !passed && next.failCount >= 2 && next.tier > 0,
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
