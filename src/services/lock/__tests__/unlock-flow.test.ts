import { describe, expect, it } from 'vitest';

import {
  phaseAfterAttempt,
  unlockActions,
  UNLOCK_THRESHOLD,
  type UnlockPhase,
} from '@/services/lock/unlock-flow';

/** Every phase in which a shield may still be up. */
const LOCKED_PHASES: UnlockPhase[] = [
  { kind: 'loading' },
  { kind: 'quiz', attempt: 1 },
  { kind: 'quiz', attempt: 2 },
  { kind: 'quiz', attempt: 3 },
  { kind: 'failed', attempt: 1, accuracy: 0.5 },
  { kind: 'failed', attempt: 2, accuracy: 0.5 },
  { kind: 'failed', attempt: 3, accuracy: 0 },
  { kind: 'failed', attempt: 99, accuracy: 0.84 },
  { kind: 'error', message: 'x' },
];

describe('unlockActions', () => {
  it('offers Override in every phase before the shields are cleared (04 §6)', () => {
    for (const phase of LOCKED_PHASES) {
      expect(unlockActions(phase).override, JSON.stringify(phase)).not.toBeNull();
    }
  });

  it('drops Override only once the shields are cleared', () => {
    expect(unlockActions({ kind: 'success', accuracy: 1 })).toEqual({
      override: null,
      retry: false,
      keepTrying: false,
    });
  });

  it('keeps Override in the bar while loading and reciting', () => {
    expect(unlockActions({ kind: 'loading' }).override).toBe('quiet');
    expect(unlockActions({ kind: 'quiz', attempt: 1 }).override).toBe('quiet');
    expect(unlockActions({ kind: 'quiz', attempt: 3 }).override).toBe('quiet');
  });

  it('offers one retry after the first miss, with Override still there', () => {
    expect(unlockActions({ kind: 'failed', attempt: 1, accuracy: 0.6 })).toEqual({
      override: 'quiet',
      retry: true,
      keepTrying: false,
    });
  });

  it('makes Override the main action after the second miss (04 §4)', () => {
    expect(unlockActions({ kind: 'failed', attempt: 2, accuracy: 0.6 })).toEqual({
      override: 'prominent',
      retry: false,
      keepTrying: true,
    });
    expect(unlockActions({ kind: 'failed', attempt: 3, accuracy: 0.6 })).toEqual({
      override: 'prominent',
      retry: false,
      keepTrying: false,
    });
  });

  it('makes Override the main action when the quiz cannot start', () => {
    expect(unlockActions({ kind: 'error', message: 'x' }).override).toBe('prominent');
  });

  it('never leaves a failed attempt without a way forward', () => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const actions = unlockActions({ kind: 'failed', attempt, accuracy: 0 });
      expect(actions.override).not.toBeNull();
      expect(actions.retry && actions.keepTrying).toBe(false);
    }
  });
});

describe('phaseAfterAttempt', () => {
  it('passes at the forgiving threshold', () => {
    expect(phaseAfterAttempt(1, UNLOCK_THRESHOLD)).toEqual({ kind: 'success', accuracy: 0.85 });
    expect(phaseAfterAttempt(2, 1)).toEqual({ kind: 'success', accuracy: 1 });
  });

  it('fails below it and remembers the attempt', () => {
    expect(phaseAfterAttempt(2, 0.84)).toEqual({ kind: 'failed', attempt: 2, accuracy: 0.84 });
  });
});
