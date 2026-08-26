/**
 * Translation registry — the source of truth for which translations exist,
 * how they are licensed, and what may be persisted (docs/02-architecture.md §5).
 */
import type { Translation } from '@/services/bible/types';

export const TRANSLATIONS: readonly Translation[] = [
  {
    id: 'web',
    abbrev: 'WEB',
    name: 'World English Bible',
    languageCode: 'en-US',
    licenseType: 'public_domain',
    source: 'bundled',
    isDownloaded: true,
    attribution: 'World English Bible (WEB), public domain.',
  },
  // KJV and ASV are bundled later in M2 (goal wizard supports WEB/KJV/ASV).
  // Licensed API translations (ESV, NIV, …) arrive in M6.
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
