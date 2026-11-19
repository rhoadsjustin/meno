/**
 * Which first path segments a deep link may name. Host-style links
 * (`meno://practice`) surface their first segment as a URL host, not a path,
 * so `src/app/+native-intent.ts` re-roots them — but only for segments listed
 * here. Pure, so the lists can be checked against the route files in a test.
 */

/** Routes a link from outside the app is meant to open. */
export const LINKABLE_ROOTS = [
  'advent',
  'challenge',
  'help',
  'practice',
  'review',
  'reader',
  'stitch',
  'unlock',
  'library',
  'stats',
  'settings',
  'wrapped',
] as const;

/**
 * Routes the app opens itself (first run, the wizard sheet, lock setup).
 * Still re-rooted, as they always were, so a host-style link to one keeps
 * working; nothing outside the app is expected to send one.
 */
export const INTERNAL_ROOTS = ['goal-wizard', 'onboarding', 'lock-setup'] as const;

const KNOWN_ROOTS = new Set<string>([...LINKABLE_ROOTS, ...INTERNAL_ROOTS]);

/** Universal-link hosts (docs/10 §10.1); their paths are app routes. */
const LINK_HOST = /^(www\.)?meno-scripture\.org(?=[/?#]|$)/i;

/** An incoming system path as the route Expo Router should match. */
export function normalizeLinkPath(path: string): string {
  try {
    // Strip any scheme prefix, a universal-link host, and leading slashes, then re-root.
    const stripped = path
      .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
      .replace(LINK_HOST, '')
      .replace(/^\/+/, '');
    if (!stripped) return '/';
    const first = stripped.split(/[/?#]/)[0];
    if (KNOWN_ROOTS.has(first)) return `/${stripped}`;
    return path;
  } catch {
    return '/';
  }
}

/** The path of a route or URL, without query, fragment or trailing slash. */
function pathOf(url: string): string {
  const path = url.split(/[?#]/)[0].replace(/\/+$/, '');
  return path === '' ? '/' : path;
}

/**
 * The route a link from outside opens, or null to leave the app as it is.
 * The widget's `/practice` names "the session", not a new one: tapped while
 * a session is already in front (the app was left on it), it would push a
 * second session over the first.
 */
export function resolveIncomingLink(
  path: string,
  state: { initial: boolean; practiceInFront: boolean },
): string | null {
  const route = normalizeLinkPath(path);
  if (!state.initial && state.practiceInFront && pathOf(route) === '/practice') return null;
  return route;
}

/** The practice session's route name in the root stack. */
export const PRACTICE_SESSION_ROUTE = 'practice/[goalId]';

/**
 * For the `/practice` redirect, given the root stack's route names with the
 * redirect itself last: how many screens to dismiss to get back to a session
 * that is already open under something else (Help over a session), or null
 * when there is none and a session should be opened.
 */
export function screensAboveOpenSession(routeNames: readonly string[]): number | null {
  const at = routeNames.lastIndexOf(PRACTICE_SESSION_ROUTE);
  return at === -1 ? null : routeNames.length - 1 - at;
}

// Whether a practice session is the screen in front. Set by the session's
// route on focus; read where no hook can run (`+native-intent`).
let practiceInFront = false;

export function setPracticeInFront(inFront: boolean): void {
  practiceInFront = inFront;
}

export function isPracticeInFront(): boolean {
  return practiceInFront;
}
