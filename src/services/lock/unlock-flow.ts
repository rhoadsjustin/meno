/**
 * The unlock quiz as a state machine (docs/04 §4, §6): which actions the
 * screen offers in which phase. Pure, so the one rule that must never break
 * is a unit test: every phase in which a shield may still be up offers
 * Override, enabled.
 */

/** Forgiving threshold: friction-with-grace, not an exam (04 §4). */
export const UNLOCK_THRESHOLD = 0.85;

export type UnlockPhase =
  /** The verse is being looked up. */
  | { kind: 'loading' }
  /** Reciting or typing, the keyboard and the microphone included. */
  | { kind: 'quiz'; attempt: number }
  | { kind: 'failed'; attempt: number; accuracy: number }
  /** Shields are already cleared; the screen closes itself. */
  | { kind: 'success'; accuracy: number }
  /** The quiz could not start. */
  | { kind: 'error'; message: string };

export type UnlockActions = {
  /**
   * Override (04 §6). `quiet` is the text button in the top bar, which the
   * keyboard cannot cover; `prominent` is the screen's main button. `null`
   * only once the shields are cleared.
   */
  override: 'quiet' | 'prominent' | null;
  /** The one retry after a first miss (04 §4). */
  retry: boolean;
  /** A further go after the second miss, beside the prominent Override. */
  keepTrying: boolean;
};

export function unlockActions(phase: UnlockPhase): UnlockActions {
  switch (phase.kind) {
    case 'loading':
    case 'quiz':
      return { override: 'quiet', retry: false, keepTrying: false };
    case 'failed':
      // One retry, then Override is the prominent path: never a failed-quiz
      // loop (04 §4).
      return phase.attempt <= 1
        ? { override: 'quiet', retry: true, keepTrying: false }
        : { override: 'prominent', retry: false, keepTrying: phase.attempt === 2 };
    case 'error':
      return { override: 'prominent', retry: false, keepTrying: false };
    case 'success':
      return { override: null, retry: false, keepTrying: false };
  }
}

/** The phase a graded attempt leads to. */
export function phaseAfterAttempt(attempt: number, accuracy: number): UnlockPhase {
  return accuracy >= UNLOCK_THRESHOLD
    ? { kind: 'success', accuracy }
    : { kind: 'failed', attempt, accuracy };
}
