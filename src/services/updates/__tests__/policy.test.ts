import { describe, expect, it } from 'vitest';

import {
  changesWhatRuns,
  FOREGROUND_CHECK_INTERVAL_MS,
  isCalmRoute,
  isEmbeddedManifest,
  isRollback,
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

/** A rollback as the cold-launch check reports it: the embedded manifest as a new update. */
const EMBEDDED_AS_NEW: DownloadedUpdate = {
  type: 'new',
  updateId: '399a86b6-5588-4e53-b95a-27be777d13ca',
  manifest: { id: '399a86b6-5588-4e53-b95a-27be777d13ca', commitTime: 1792948056450, assets: [] },
};

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

  it('treats the embedded manifest arriving as a new update as a rollback', () => {
    // What the cold-launch check hands JS after update:roll-back-to-embedded
    // (shape taken from the simulator build's EXUpdates.bundle/app.manifest).
    const embedded = {
      type: 'new' as const,
      updateId: '399a86b6-5588-4e53-b95a-27be777d13ca',
      manifest: {
        id: '399a86b6-5588-4e53-b95a-27be777d13ca',
        commitTime: 1792948056450,
        assets: [],
      },
    };
    expect(updatePriority(embedded)).toBe('critical');
  });
});

describe('isEmbeddedManifest', () => {
  it('recognizes the binary manifest and nothing served by EAS Update', () => {
    expect(isEmbeddedManifest({ id: 'a', commitTime: 1, assets: [] })).toBe(true);
    expect(
      isEmbeddedManifest({
        id: 'b',
        createdAt: '2026-10-25T17:10:15.000Z',
        runtimeVersion: '1.0.0',
        launchAsset: { key: 'bundle' },
        assets: [],
      }),
    ).toBe(false);
    expect(isEmbeddedManifest({ commitTime: 1, launchAsset: {} })).toBe(false);
    expect(isEmbeddedManifest({ commitTime: '1' })).toBe(false);
    expect(isEmbeddedManifest(undefined)).toBe(false);
    expect(isEmbeddedManifest(null)).toBe(false);
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
  const base = {
    runningEmbedded: false,
    segments: TODAY,
    appActive: true,
    alreadyOffered: new Set<string>(),
  };

  it('offers a critical update on a tab while Meno is in front', () => {
    expect(shouldOfferRestart({ ...base, update: published('x', 'critical') })).toBe(true);
    expect(shouldOfferRestart({ ...base, update: { type: 'rollback' } })).toBe(true);
    expect(shouldOfferRestart({ ...base, update: EMBEDDED_AS_NEW })).toBe(true);
  });

  it('never offers a rollback while Meno already runs its own code', () => {
    const embedded = { ...base, runningEmbedded: true };
    expect(shouldOfferRestart({ ...embedded, update: { type: 'rollback' } })).toBe(false);
    expect(shouldOfferRestart({ ...embedded, update: EMBEDDED_AS_NEW })).toBe(false);
    // A real critical update still reaches a fresh install.
    expect(shouldOfferRestart({ ...embedded, update: published('x', 'critical') })).toBe(true);
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

describe('isRollback and changesWhatRuns', () => {
  it('recognizes both shapes of a rollback', () => {
    expect(isRollback({ type: 'rollback' })).toBe(true);
    expect(isRollback(EMBEDDED_AS_NEW)).toBe(true);
    expect(isRollback(published('x', 'critical'))).toBe(false);
  });

  it('says a rollback changes nothing when the build already runs its own code', () => {
    expect(changesWhatRuns({ type: 'rollback' }, true)).toBe(false);
    expect(changesWhatRuns(EMBEDDED_AS_NEW, true)).toBe(false);
    expect(changesWhatRuns({ type: 'rollback' }, false)).toBe(true);
    expect(changesWhatRuns(EMBEDDED_AS_NEW, false)).toBe(true);
    expect(changesWhatRuns(published('x'), true)).toBe(true);
  });
});
