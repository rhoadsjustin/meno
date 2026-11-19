/**
 * The line of text that travels with a recap image (docs/10 §6, §8): one
 * sentence and the App Store link. The link carries Apple's campaign
 * parameters so App Store Connect can count installs that came from a shared
 * recap. Meno itself learns nothing: Apple does the counting, and only for
 * people who share analytics with developers.
 */
import { t } from '@/i18n';

/** Meno's provider token from App Store Connect; the same for every campaign. */
const PROVIDER_TOKEN = '118737961';

/** The App Store link for a recap of `year`, tagged `ct=wrapped<year>`. */
export function recapStoreLink(year: number): string {
  return `https://apps.apple.com/app/apple-store/id6806028621?pt=${PROVIDER_TOKEN}&ct=wrapped${year}&mt=8`;
}

export function recapShareText(year: number): string {
  return t('wrapped:share.text', { year, link: recapStoreLink(year) });
}
