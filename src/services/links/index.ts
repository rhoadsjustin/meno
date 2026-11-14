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
