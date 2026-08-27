/**
 * Recite to Unlock — Screen Time integration (docs/04-phone-lock.md).
 *
 * Wraps react-native-device-activity (FamilyControls + ManagedSettings +
 * DeviceActivity). Physical iOS device only; everything is guarded so the
 * simulator and Android still run the rest of the app.
 *
 * Non-negotiable design rules (04 §6): Override always works, the kill
 * switch clears everything immediately, no shaming copy, ever.
 */
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { firstLetters } from '@/services/practice/text';

export const LOCK_SELECTION_ID = 'meno_lock_selection';
export const LOCK_SHIELD_ID = 'meno_shield';
export const ACTIVITY_DAILY = 'meno_lock_daily_meno_lock_selection';
export const ACTIVITY_RELOCK = 'meno_relock_meno_lock_selection';
export const ACTIVITY_SCHEDULE = 'meno_lock_schedule_meno_lock_selection';

type DeviceActivityModule = typeof import('react-native-device-activity');

let cachedModule: DeviceActivityModule | null | undefined;

/**
 * Screen Time APIs require a physical iOS device (04 §2) and the native
 * module (absent in builds without the entitlement).
 */
export function getLockModule(): DeviceActivityModule | null {
  if (cachedModule !== undefined) return cachedModule;
  if (Platform.OS !== 'ios' || !Device.isDevice) {
    cachedModule = null;
    return null;
  }
  try {
    // Runtime require so the app still runs where the native module is
    // absent (simulator, Android, builds without the entitlement).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require('react-native-device-activity') as DeviceActivityModule;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

export function isLockAvailable(): boolean {
  return getLockModule() !== null;
}

export type LockAuthStatus = 'notDetermined' | 'denied' | 'approved' | 'unavailable';

export async function getAuthorizationStatus(): Promise<LockAuthStatus> {
  const mod = getLockModule();
  if (!mod) return 'unavailable';
  try {
    const status = mod.getAuthorizationStatus();
    return normalizeStatus(status);
  } catch {
    return 'unavailable';
  }
}

export async function requestAuthorization(): Promise<LockAuthStatus> {
  const mod = getLockModule();
  if (!mod) return 'unavailable';
  await mod.requestAuthorization('individual');
  // The native status can lag behind the user's grant (package quirk) —
  // poll until it settles instead of reading once.
  const status = await mod.pollAuthorizationStatus({ pollIntervalMs: 500, maxAttempts: 40 });
  return normalizeStatus(status);
}

/** Fires when Screen Time authorization changes while the app is alive. */
export function onAuthStatusChange(listener: (status: LockAuthStatus) => void): { remove: () => void } {
  const mod = getLockModule();
  if (!mod) return { remove: () => {} };
  return mod.onAuthorizationStatusChange((event) =>
    listener(normalizeStatus(event.authorizationStatus))
  );
}

function normalizeStatus(status: unknown): LockAuthStatus {
  const s = String(status);
  if (s === 'approved' || s === '2') return 'approved';
  if (s === 'denied' || s === '1') return 'denied';
  return 'notDetermined';
}

/**
 * Shield appearance (04 §3): verse reference as the title, first-letters
 * hint as subtitle, primary "Recite to unlock" opens the app, secondary
 * "Override" clears the shields — always available (04 §6).
 */
export function configureShield(reference: string, verseText: string | null): void {
  const mod = getLockModule();
  if (!mod) return;
  mod.updateShield(
    {
      title: reference || 'Meno',
      subtitle: verseText
        ? `${firstLetters(verseText).slice(0, 120)}`
        : 'Recite your verse to continue.',
      primaryButtonLabel: 'Recite to unlock',
      secondaryButtonLabel: 'Override',
      iconSystemName: 'book.closed.fill',
    },
    {
      primary: {
        behavior: 'close',
        actions: [
          // Shield extensions can't open apps directly on modern iOS (the
          // NSExtensionContext.open trick is dead) — the sanctioned bounce
          // is a time-sensitive notification the user taps into the quiz.
          { type: 'openApp' }, // harmless no-op where blocked; direct open where it still works
          {
            type: 'sendNotification',
            payload: {
              identifier: 'meno-unlock',
              title: reference || 'Recite to unlock',
              body: 'Tap here to recite and continue.',
              sound: 'default',
              interruptionLevel: 'timeSensitive',
              userInfo: { url: '/unlock' },
            },
          },
        ],
      },
      secondary: {
        behavior: 'close',
        actions: [{ type: 'unblockSelection', familyActivitySelectionId: LOCK_SELECTION_ID }],
      },
    }
  );
}

let lastUnlockPushAt = 0;

/** Routes into the unlock quiz, debounced — the notification tap and the
 * foreground shield check can both fire within the same second. */
export function presentUnlock(): void {
  const now = Date.now();
  if (now - lastUnlockPushAt < 3000) return;
  lastUnlockPushAt = now;
  router.push('/unlock');
}

/** Applies shields to the user's selection immediately. */
export function armShields(): void {
  const mod = getLockModule();
  if (!mod) return;
  mod.blockSelection({ activitySelectionId: LOCK_SELECTION_ID }, 'meno-arm');
}

/** Clears shields for the selection immediately. */
export function clearShields(): void {
  const mod = getLockModule();
  if (!mod) return;
  mod.unblockSelection({ activitySelectionId: LOCK_SELECTION_ID }, 'meno-clear');
}

/**
 * First-pickup mode (04 §3): a daily DeviceActivity schedule re-arms the
 * shields at midnight; one successful recitation clears them for the day.
 */
export async function startFirstPickupMode(): Promise<void> {
  const mod = getLockModule();
  if (!mod) return;
  mod.configureActions({
    activityName: ACTIVITY_DAILY,
    callbackName: 'intervalDidStart',
    actions: [
      {
        type: 'blockSelection',
        familyActivitySelectionId: LOCK_SELECTION_ID,
        shieldId: LOCK_SHIELD_ID,
      },
    ],
  });
  await mod.startMonitoring(
    ACTIVITY_DAILY,
    {
      intervalStart: { hour: 0, minute: 0 },
      intervalEnd: { hour: 23, minute: 59 },
      repeats: true,
    },
    []
  );
  armShields();
}

/**
 * Every-pickup mode: shields re-arm N minutes after a successful unlock
 * via a one-shot DeviceActivity interval (04 §3).
 */
export async function scheduleRelock(minutes: number): Promise<void> {
  const mod = getLockModule();
  if (!mod) return;
  const now = new Date();
  const end = new Date(now.getTime() + minutes * 60 * 1000);
  mod.configureActions({
    activityName: ACTIVITY_RELOCK,
    callbackName: 'intervalDidEnd',
    actions: [
      {
        type: 'blockSelection',
        familyActivitySelectionId: LOCK_SELECTION_ID,
        shieldId: LOCK_SHIELD_ID,
      },
    ],
  });
  await mod.startMonitoring(
    ACTIVITY_RELOCK,
    {
      intervalStart: { hour: now.getHours(), minute: now.getMinutes(), second: now.getSeconds() },
      intervalEnd: { hour: end.getHours(), minute: end.getMinutes(), second: end.getSeconds() },
      repeats: false,
    },
    []
  );
}

/** Schedule mode: shields active during a single daily window (v1). */
export async function startScheduleMode(startHour: number, endHour: number): Promise<void> {
  const mod = getLockModule();
  if (!mod) return;
  mod.configureActions({
    activityName: ACTIVITY_SCHEDULE,
    callbackName: 'intervalDidStart',
    actions: [
      {
        type: 'blockSelection',
        familyActivitySelectionId: LOCK_SELECTION_ID,
        shieldId: LOCK_SHIELD_ID,
      },
    ],
  });
  mod.configureActions({
    activityName: ACTIVITY_SCHEDULE,
    callbackName: 'intervalDidEnd',
    actions: [{ type: 'unblockSelection', familyActivitySelectionId: LOCK_SELECTION_ID }],
  });
  await mod.startMonitoring(
    ACTIVITY_SCHEDULE,
    {
      intervalStart: { hour: startHour, minute: 0 },
      intervalEnd: { hour: endHour, minute: 0 },
      repeats: true,
    },
    []
  );
  const nowHour = new Date().getHours();
  if (nowHour >= startHour && nowHour < endHour) armShields();
}

/**
 * Kill switch (04 §6): disables all shields and schedules immediately.
 * Must work even if speech/permissions are broken.
 */
export function killSwitch(): void {
  const mod = getLockModule();
  if (!mod) return;
  try {
    mod.stopMonitoring();
  } catch {}
  try {
    mod.resetBlocks('meno-kill-switch');
  } catch {}
  try {
    mod.clearAllManagedSettingsStoreSettings();
  } catch {}
}

/** True while our shields are actively blocking something. */
export function shieldsActive(): boolean {
  const mod = getLockModule();
  if (!mod) return false;
  try {
    return mod.isShieldActive();
  } catch {
    return false;
  }
}

/**
 * Called on app foreground: when the user arrived via the shield's
 * "Recite to unlock" button, route into the unlock quiz (04 §4).
 */
export async function maybePresentUnlock(): Promise<void> {
  if (!isLockAvailable()) return;
  const { loadLockConfig } = await import('@/services/db/repos/lock');
  const config = await loadLockConfig();
  if (!config.enabled) return;
  if (shieldsActive()) {
    presentUnlock();
  }
}

/**
 * Re-publishes the shield config (appearance + actions) with the user's
 * current verse. Called on app foreground so the shield always shows the
 * verse being learned (04 §3) and picks up action changes after updates.
 */
export async function refreshShieldForCurrentVerse(): Promise<void> {
  if (!isLockAvailable()) return;
  const { loadLockConfig } = await import('@/services/db/repos/lock');
  const config = await loadLockConfig();
  if (!config.enabled) return;
  try {
    const { activeGoal, currentChunk } = await import('@/services/db/repos/goals');
    const { formatRange, getPassage } = await import('@/services/bible');
    const goal = await activeGoal();
    if (!goal) return configureShield('Meno', null);
    const chunk = await currentChunk(goal.id);
    if (!chunk) return configureShield('Meno', null);
    const range = {
      start: { bookId: chunk.startBookId, chapter: chunk.startChapter, verse: chunk.startVerse },
      end: { bookId: chunk.endBookId, chapter: chunk.endChapter, verse: chunk.endVerse },
    };
    const verses = await getPassage(goal.translationId, range);
    configureShield(formatRange(range), verses.map((v) => v.text).join(' '));
  } catch {
    // Shield refresh is best-effort; the existing config keeps working.
  }
}
