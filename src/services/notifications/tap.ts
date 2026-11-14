/**
 * Where a tapped notification goes (pure; the root layout applies it). The
 * app's own reminders carry `/`, `/wrapped` and `/review` (plan.ts). Pushing
 * that route onto whatever was open stacked a second review on the first and
 * left stale screens to walk back through, so a tap either stays put, pushes
 * from the tabs, or clears what is open first.
 */
export type TapNavigation =
  /** The target is already in front. */
  | 'stay'
  /** Nothing is open above the tabs, or what is open must not be dismissed. */
  | 'push'
  /** Dismiss what is open, then push. */
  | 'reset';

const TABS = new Set(['/', '/library', '/stats', '/settings']);

/**
 * Flows a tap never dismisses: first run, and the unlock quiz, whose only
 * exits are its own buttons (docs/04 §6).
 */
const BLOCKING = new Set(['/onboarding', '/unlock']);

/** The path of a route or URL, without query, fragment or trailing slash. */
function pathOf(url: string): string {
  const path = url.split(/[?#]/)[0].replace(/\/+$/, '');
  return path === '' ? '/' : path;
}

export function tapNavigation(currentPath: string, targetUrl: string): TapNavigation {
  const current = pathOf(currentPath);
  if (current === pathOf(targetUrl)) return 'stay';
  if (TABS.has(current) || BLOCKING.has(current)) return 'push';
  return 'reset';
}
