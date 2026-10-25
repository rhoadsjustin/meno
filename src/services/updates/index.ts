/**
 * Over-the-air updates (EAS Update): the React Native side. The rules live in
 * ./policy (pure, unit-tested); this file wires them to expo-updates, AppState
 * and the router. Runbook: docs/ship/ota-updates.md.
 *
 * Debug builds load JS from Metro and never take updates (`isEnabled` is
 * false), so everything here is a no-op in development.
 */
import { useSegments } from 'expo-router';
import * as Updates from 'expo-updates';
import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, type AppStateStatus } from 'react-native';

import { palette, type ColorScheme } from '@/theme/tokens';

import {
  shouldCheckOnForeground,
  shouldOfferRestart,
  updateKey,
  type DownloadedUpdate,
} from './policy';

/** Whether this binary takes over-the-air updates at all (Release builds only). */
export const updatesEnabled = Updates.isEnabled && !__DEV__;

// expo-updates checks natively at every cold launch, so the first foreground
// check waits a full interval after module load (≈ that launch).
let lastCheckAt = Date.now();

async function checkAndDownload(): Promise<void> {
  try {
    const result = await Updates.checkForUpdateAsync();
    if (result.isAvailable || result.isRollBackToEmbedded) await Updates.fetchUpdateAsync();
  } catch {
    // Offline, or the update server is unreachable: the next return to the
    // app or the next cold launch tries again. Never surfaced to the user.
  }
}

/**
 * Reloads into the downloaded update behind a plain screen in Meno's surface
 * color (expo-updates' default is a white screen with a spinner).
 */
export async function restartIntoUpdate(scheme: ColorScheme): Promise<void> {
  if (!updatesEnabled) return;
  await Updates.reloadAsync({
    reloadScreenOptions: {
      backgroundColor: palette[scheme].surface,
      spinner: { enabled: false },
      fade: true,
    },
  });
}

function toDownloaded(info: Updates.UpdateInfo | undefined): DownloadedUpdate | undefined {
  if (!info) return undefined;
  if (info.type === Updates.UpdateInfoType.ROLLBACK) return { type: 'rollback' };
  return { type: 'new', updateId: info.updateId, manifest: info.manifest };
}

/**
 * Mounted once, in the root layout. Downloads updates when the user returns
 * to the app, and offers an immediate restart for a critical one — once per
 * update, and only from a top-level tab. Ordinary updates apply on the next
 * cold launch (the expo-updates default), with a quiet row in Settings.
 */
export function useUpdateLifecycle(scheme: ColorScheme): void {
  const segments = useSegments();
  const { downloadedUpdate, isUpdatePending } = Updates.useUpdates();
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const offered = useRef(new Set<string>());

  useEffect(() => {
    if (!updatesEnabled) return;
    const sub = AppState.addEventListener('change', (state) => {
      setAppState(state);
      if (state !== 'active') return;
      const now = Date.now();
      if (!shouldCheckOnForeground(now, lastCheckAt)) return;
      lastCheckAt = now;
      void checkAndDownload();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!updatesEnabled || !isUpdatePending) return;
    const update = toDownloaded(downloadedUpdate);
    const offer = shouldOfferRestart({
      update,
      segments,
      appActive: appState === 'active',
      alreadyOffered: offered.current,
    });
    if (!update || !offer) return;
    offered.current.add(updateKey(update));
    Alert.alert(
      'Meno has a fix ready',
      'Restart now to get it. Your verses and progress stay right where they are.',
      [
        { text: 'Later', style: 'cancel' },
        { text: 'Restart', onPress: () => void restartIntoUpdate(scheme) },
      ],
    );
  }, [isUpdatePending, downloadedUpdate, segments, appState, scheme]);
}

export type UpdateStatus = {
  /** A downloaded update is waiting for a restart. */
  pending: boolean;
  /** When the running update was published; null for the build's own bundle. */
  runningUpdateDate: Date | null;
};

/** For Settings: is an update waiting, and is Meno running one now. */
export function useUpdateStatus(): UpdateStatus {
  const { isUpdatePending, currentlyRunning } = Updates.useUpdates();
  if (!updatesEnabled) return { pending: false, runningUpdateDate: null };
  return {
    pending: isUpdatePending,
    runningUpdateDate: currentlyRunning.isEmbeddedLaunch
      ? null
      : (currentlyRunning.createdAt ?? null),
  };
}
