/**
 * Normalizes incoming deep links before Expo Router matches them.
 * Host-style links (`meno://practice`) surface their first segment as a URL
 * host, not a path — widgets, shields, and notifications all produce these.
 */
const KNOWN_ROOTS = new Set([
  'challenge',
  'practice',
  'review',
  'reader',
  'stitch',
  'unlock',
  'goal-wizard',
  'onboarding',
  'lock-setup',
  'library',
  'stats',
  'settings',
]);

/** Universal-link hosts (docs/10 §10.1); their paths are app routes. */
const LINK_HOST = /^(www\.)?meno-scripture\.org(?=[/?#]|$)/i;

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
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
