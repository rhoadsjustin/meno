/**
 * Normalizes incoming deep links before Expo Router matches them.
 * Host-style links (`meno://practice`) surface their first segment as a URL
 * host, not a path — widgets, shields, and notifications all produce these.
 * The list of roots lives in `services/links`, where a test checks each one
 * against the route files.
 *
 * Returning null drops the link: a widget tap that names the practice
 * session while one is already in front must not open a second.
 */
import { isPracticeInFront, resolveIncomingLink } from '@/services/links';

export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}): string | null {
  return resolveIncomingLink(path, { initial, practiceInFront: isPracticeInFront() });
}
