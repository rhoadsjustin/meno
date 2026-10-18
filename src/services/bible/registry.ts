/**
 * Translation registry — the source of truth for which translations exist,
 * how they are licensed, and what may be persisted (docs/02-architecture.md §5).
 */
import { t } from '@/i18n';
import type { Translation } from '@/services/bible/types';

/**
 * Footer for a bundled public-domain translation, in the UI language. A
 * getter, so it is read when shown rather than frozen at module load (the
 * device language is applied after modules load). Translation names stay
 * as published — they are the titles of English Bibles.
 */
function publicDomainAttribution(this: Translation): string {
  return t('reader:publicDomainAttribution', { name: this.name, abbrev: this.abbrev });
}

export const TRANSLATIONS: readonly Translation[] = [
  {
    id: 'web',
    abbrev: 'WEB',
    name: 'World English Bible',
    languageCode: 'en-US',
    licenseType: 'public_domain',
    source: 'bundled',
    isDownloaded: true,
    get attribution() {
      return publicDomainAttribution.call(this);
    },
  },
  {
    id: 'kjv',
    abbrev: 'KJV',
    name: 'King James Version',
    languageCode: 'en-GB',
    licenseType: 'public_domain',
    source: 'bundled',
    isDownloaded: true,
    get attribution() {
      return publicDomainAttribution.call(this);
    },
  },
  {
    id: 'asv',
    abbrev: 'ASV',
    name: 'American Standard Version',
    languageCode: 'en-US',
    licenseType: 'public_domain',
    source: 'bundled',
    isDownloaded: true,
    get attribution() {
      return publicDomainAttribution.call(this);
    },
  },
  {
    id: 'esv',
    abbrev: 'ESV',
    name: 'English Standard Version',
    languageCode: 'en-US',
    licenseType: 'api_cached',
    source: 'esv_api',
    isDownloaded: false,
    // Crossway's required notice: kept verbatim in every UI language.
    attribution:
      'Scripture quotations are from the ESV® Bible, copyright © 2001 by Crossway. Used by permission. All rights reserved.',
  },
];

export const DEFAULT_TRANSLATION_ID = 'web';

export function getTranslation(id: string): Translation {
  const t = TRANSLATIONS.find((t) => t.id === id);
  if (!t) throw new Error(`Unknown translation: ${id}`);
  return t;
}

/** License rule 1 (02 §5): only these translations may have text persisted. */
export function mayPersistText(id: string): boolean {
  const t = getTranslation(id);
  return t.licenseType === 'public_domain' || t.licenseType === 'api_cached';
}
