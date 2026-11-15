/**
 * Normalizes incoming deep links before Expo Router matches them.
 * Host-style links (`meno://practice`) surface their first segment as a URL
 * host, not a path — widgets, shields, and notifications all produce these.
 * The list of roots lives in `services/links`, where a test checks each one
 * against the route files.
 */
import { normalizeLinkPath } from '@/services/links';

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return normalizeLinkPath(path);
}
