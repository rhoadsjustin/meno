import { describe, expect, it, vi } from 'vitest';

import {
  previousStep,
  relockChoice,
  switchLockMode,
  type LockMode,
  type LockModeOps,
} from '@/services/lock/setup-flow';

/** A mocked Screen Time module: records the order of the calls. */
function mockOps() {
  const calls: string[] = [];
  const ops: LockModeOps = {
    stopSchedules: vi.fn(() => void calls.push('stopSchedules')),
    armShields: vi.fn(() => void calls.push('armShields')),
    clearShields: vi.fn(() => void calls.push('clearShields')),
    startFirstPickup: vi.fn(async () => void calls.push('startFirstPickup')),
    startSchedule: vi.fn(async (start: number, end: number) => {
      calls.push(`startSchedule ${start}-${end}`);
    }),
  };
  return { ops, calls };
}

describe('switchLockMode', () => {
  it('stops the previous mode before anything else, whatever the mode', async () => {
    for (const mode of ['firstPickup', 'everyPickup', 'schedule'] as LockMode[]) {
      const { ops, calls } = mockOps();
      await switchLockMode(ops, mode);
      expect(calls[0], mode).toBe('stopSchedules');
      expect(ops.stopSchedules, mode).toHaveBeenCalledTimes(1);
    }
  });

  it('first pickup: starts the daily re-arm', async () => {
    const { ops, calls } = mockOps();
    await switchLockMode(ops, 'firstPickup');
    expect(calls).toEqual(['stopSchedules', 'startFirstPickup']);
  });

  it('every pickup: arms the shields and starts no schedule', async () => {
    const { ops, calls } = mockOps();
    await switchLockMode(ops, 'everyPickup');
    expect(calls).toEqual(['stopSchedules', 'armShields']);
  });

  it('schedule: clears shields left by the previous mode, then starts the window', async () => {
    const { ops, calls } = mockOps();
    await switchLockMode(ops, 'schedule');
    expect(calls).toEqual(['stopSchedules', 'clearShields', 'startSchedule 21-23']);
  });

  it('does not start a mode when the previous one could not be stopped', async () => {
    const { ops } = mockOps();
    ops.stopSchedules = () => {
      throw new Error('native');
    };
    await expect(switchLockMode(ops, 'firstPickup')).rejects.toThrow('native');
    expect(ops.startFirstPickup).not.toHaveBeenCalled();
  });
});

describe('previousStep', () => {
  it('walks back through the steps', () => {
    expect(previousStep('configure')).toBe('pick');
    expect(previousStep('pick')).toBe('explainer');
    expect(previousStep('authorize')).toBe('explainer');
  });

  it('has nothing behind the first step or the confirmation', () => {
    expect(previousStep('explainer')).toBeNull();
    expect(previousStep('done')).toBeNull();
  });
});

describe('relockChoice', () => {
  it('keeps a stored choice and falls back to 30 minutes', () => {
    expect(relockChoice(15)).toBe(15);
    expect(relockChoice(60)).toBe(60);
    expect(relockChoice(45)).toBe(30);
    expect(relockChoice(null)).toBe(30);
    expect(relockChoice(undefined)).toBe(30);
  });
});
