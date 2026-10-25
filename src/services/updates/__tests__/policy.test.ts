import { describe, expect, it } from 'vitest';

import {
  FOREGROUND_CHECK_INTERVAL_MS,
  isCalmRoute,
  shouldCheckOnForeground,
  shouldOfferRestart,
  updateKey,
  updatePriority,
  type DownloadedUpdate,
} from '@/services/updates/policy';

/** The shape EAS Update manifests carry: the publish-time app config in extra.expoClient. */
function published(updateId: string, priority?: string): DownloadedUpdate {
  return {
    type: 'new',
    updateId,
    manifest: {
      id: updateId,
      extra: { expoClient: { name: 'Meno', extra: priority ? { updatePriority: priority } : {} } },
    },
  };
}

const TODAY = ['(tabs)'];
const LIBRARY = ['(tabs)', 'library'];

describe('shouldCheckOnForeground', () => {
  it('waits a full interval after the last check', () => {
    const last = 1_000_000;
    expect(shouldCheckOnForeground(last + FOREGROUND_CHECK_INTERVAL_MS - 1, last)).toBe(false);
    expect(shouldCheckOnForeground(last + FOREGROUND_CHECK_INTERVAL_MS, last)).toBe(true);
  });

  it('honors a custom interval', () => {
    expect(shouldCheckOnForeground(5_000, 0, 10_000)).toBe(false);
    expect(shouldCheckOnForeground(10_000, 0, 10_000)).toBe(true);
  });
});

describe('updatePriority', () => {
  it('reads the publish-time flag from the manifest', () => {
    expect(updatePriority(published('a', 'critical'))).toBe('critical');
    expect(updatePriority(published('b', 'normal'))).toBe('normal');
  });

  it('treats a missing or unknown flag as normal', () => {
    expect(updatePriority(published('c'))).toBe('normal');
    expect(updatePriority(published('d', 'CRITICAL'))).toBe('normal');
    expect(updatePriority({ type: 'new', updateId: 'e' })).toBe('normal');
    expect(updatePriority({ type: 'new', updateId: 'f', manifest: { extra: null } })).toBe(
      'normal',
    );
  });

  it('treats a rollback as critical', () => {
    expect(updatePriority({ type: 'rollback' })).toBe('critical');
  });
});

describe('updateKey', () => {
  it('uses the update id, or a fixed key for rollbacks', () => {
    expect(updateKey(published('abc'))).toBe('abc');
    expect(updateKey({ type: 'rollback' })).toBe('rollback');
  });
});

describe('isCalmRoute', () => {
  it('allows only the top-level tabs', () => {
    expect(isCalmRoute(TODAY)).toBe(true);
    expect(isCalmRoute(LIBRARY)).toBe(true);
    expect(isCalmRoute(['practice', '[goalId]'])).toBe(false);
    expect(isCalmRoute(['unlock'])).toBe(false);
    expect(isCalmRoute(['onboarding'])).toBe(false);
    expect(isCalmRoute(['goal-wizard'])).toBe(false);
    expect(isCalmRoute([])).toBe(false);
  });
});

describe('shouldOfferRestart', () => {
  const base = { segments: TODAY, appActive: true, alreadyOffered: new Set<string>() };

  it('offers a critical update on a tab while Meno is in front', () => {
    expect(shouldOfferRestart({ ...base, update: published('x', 'critical') })).toBe(true);
    expect(shouldOfferRestart({ ...base, update: { type: 'rollback' } })).toBe(true);
  });

  it('never offers a normal update', () => {
    expect(shouldOfferRestart({ ...base, update: published('x') })).toBe(false);
  });

  it('waits while the user is mid-practice or Meno is in the background', () => {
    const update = published('x', 'critical');
    expect(shouldOfferRestart({ ...base, update, segments: ['practice', '[goalId]'] })).toBe(false);
    expect(shouldOfferRestart({ ...base, update, appActive: false })).toBe(false);
  });

  it('offers each update once', () => {
    const update = published('x', 'critical');
    const alreadyOffered = new Set(['x']);
    expect(shouldOfferRestart({ ...base, update, alreadyOffered })).toBe(false);
    expect(
      shouldOfferRestart({ ...base, update: published('y', 'critical'), alreadyOffered }),
    ).toBe(true);
  });

  it('does nothing without a downloaded update', () => {
    expect(shouldOfferRestart({ ...base, update: undefined })).toBe(false);
  });
});
