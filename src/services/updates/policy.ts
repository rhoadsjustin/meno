/**
 * Pure rules for over-the-air updates (EAS Update). No React Native or
 * expo-updates imports, so vitest can run them; ./index.ts feeds them what
 * expo-updates reports. Runbook: docs/ship/ota-updates.md.
 *
 * The default expo-updates behavior stays in charge of ordinary updates:
 * check on cold launch, download in the background, apply on the next cold
 * launch. These rules add two things on top:
 *   1. a check when the user comes back to the app, so a fix downloads
 *      without waiting for iOS to evict Meno, and
 *   2. an offer to restart right away when the update is critical.
 */

export type UpdatePriority = 'normal' | 'critical';

/**
 * How long after a check a return to the app may check again. The cold-launch
 * check is native and separate; this only throttles foregrounds, which come
 * in bursts during recite-to-unlock (shield → Meno → the app → Meno).
 */
export const FOREGROUND_CHECK_INTERVAL_MS = 15 * 60 * 1000;

export function shouldCheckOnForeground(
  now: number,
  lastCheckAt: number,
  interval: number = FOREGROUND_CHECK_INTERVAL_MS,
): boolean {
  return now - lastCheckAt >= interval;
}

/** The slice of expo-updates' UpdateInfo these rules read. */
export type DownloadedUpdate =
  { type: 'new'; updateId: string; manifest?: unknown } | { type: 'rollback' };

/**
 * Critical when the publisher said so (`npm run ota -- --critical` sets
 * `extra.updatePriority` in the app config the update carries), and always
 * for a rollback: `eas update:rollback` only happens when the running update
 * is the problem.
 */
export function updatePriority(update: DownloadedUpdate): UpdatePriority {
  if (update.type === 'rollback') return 'critical';
  const flag = readPath(update.manifest, ['extra', 'expoClient', 'extra', 'updatePriority']);
  return flag === 'critical' ? 'critical' : 'normal';
}

/** Identifies an update for "already offered"; rollbacks carry no id. */
export function updateKey(update: DownloadedUpdate): string {
  return update.type === 'rollback' ? 'rollback' : update.updateId;
}

/**
 * Whether a restart may be offered from this route: only on a top-level tab.
 * Never over practice, review, the unlock quiz, onboarding or a sheet — a
 * restart there throws away whatever the user is in the middle of.
 */
export function isCalmRoute(segments: readonly string[]): boolean {
  return segments[0] === '(tabs)';
}

/** Offer an immediate restart: critical, not yet offered, app in front, calm route. */
export function shouldOfferRestart(args: {
  update: DownloadedUpdate | undefined;
  segments: readonly string[];
  appActive: boolean;
  alreadyOffered: ReadonlySet<string>;
}): boolean {
  const { update, segments, appActive, alreadyOffered } = args;
  if (!update || !appActive) return false;
  if (updatePriority(update) !== 'critical') return false;
  if (alreadyOffered.has(updateKey(update))) return false;
  return isCalmRoute(segments);
}

function readPath(value: unknown, path: readonly string[]): unknown {
  let node = value;
  for (const key of path) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return node;
}
