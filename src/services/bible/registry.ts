/**
 * Translation registry — the source of truth for which translations exist,
 * how they are licensed, and what may be persisted (docs/02-architecture.md §5).
 *
 * Bundled and ESV entries are static. YouVersion Platform versions are
 * registered at runtime from the catalog cache (services/bible/youversion-
 * catalog) — their metadata is the only thing stored; text never is.
 */
import { isValidBookId } from '@/services/bible/canon';
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
  {
    id: 'kjv',
    abbrev: 'KJV',
    name: 'King James Version',
    languageCode: 'en-GB',
    licenseType: 'public_domain',
    source: 'bundled',
    isDownloaded: true,
    attribution: 'King James Version (KJV), public domain.',
  },
  {
    id: 'asv',
    abbrev: 'ASV',
    name: 'American Standard Version',
    languageCode: 'en-US',
    licenseType: 'public_domain',
    source: 'bundled',
    isDownloaded: true,
    attribution: 'American Standard Version (ASV), public domain.',
  },
  {
    id: 'esv',
    abbrev: 'ESV',
    name: 'English Standard Version',
    languageCode: 'en-US',
    licenseType: 'api_cached',
    source: 'esv_api',
    isDownloaded: false,
    attribution:
      'Scripture quotations are from the ESV® Bible, copyright © 2001 by Crossway. Used by permission. All rights reserved.',
  },
];

export const DEFAULT_TRANSLATION_ID = 'web';

/** Translation ids of YouVersion Platform versions: `yv-` + the Platform's numeric Bible id. */
const YOUVERSION_ID_RE = /^yv-(\d+)$/;

export function youversionTranslationId(bibleId: number): string {
  return `yv-${bibleId}`;
}

/** The Platform's numeric Bible id behind a translation id, or null. */
export function youversionBibleId(translationId: string): number | null {
  const m = YOUVERSION_ID_RE.exec(translationId);
  return m ? Number(m[1]) : null;
}

/** Runtime-registered translations (YouVersion), by id. */
const registered = new Map<string, Translation>();

/** Adds or replaces runtime translations; the static set cannot be overridden. */
export function registerTranslations(list: readonly Translation[]): void {
  for (const t of list) {
    if (TRANSLATIONS.some((s) => s.id === t.id)) continue;
    registered.set(t.id, t);
  }
}

/** Drops every runtime translation (tests, catalog resets). */
export function clearRegisteredTranslations(): void {
  registered.clear();
}

/** Drops one runtime translation (a version the Platform no longer lists). */
export function unregisterTranslation(id: string): void {
  registered.delete(id);
}

/** Platform abbreviations that are the same text as a bundled translation. */
const BUNDLED_TWINS: Record<string, string> = { WEBUS: 'WEB' };

/**
 * Whether a Platform version duplicates text already on this device (the
 * public-domain ASV and WEB are on the Platform too). The bundled copy is
 * offline and cacheable, so the picker hides the Platform one.
 */
export function duplicatesBundled(t: Translation): boolean {
  if (t.source !== 'youversion') return false;
  const abbrev = BUNDLED_TWINS[t.abbrev.toUpperCase()] ?? t.abbrev.toUpperCase();
  return TRANSLATIONS.some((s) => s.source === 'bundled' && s.abbrev === abbrev);
}

export function registeredTranslations(): Translation[] {
  return [...registered.values()];
}

/**
 * Looks a translation up. A YouVersion id the catalog has not seen (a
 * challenge link from another device, a goal from before a reinstall) gets a
 * placeholder so labels still render; `youversion-catalog` fills it in.
 */
export function getTranslation(id: string): Translation {
  const t = TRANSLATIONS.find((t) => t.id === id) ?? registered.get(id);
  if (t) return t;
  if (youversionBibleId(id) !== null) return placeholder(id);
  throw new Error(`Unknown translation: ${id}`);
}

/** Named by number only: the Platform's marks stay out of the UI (its Terms of Use). */
function placeholder(id: string): Translation {
  const n = youversionBibleId(id);
  return {
    id,
    abbrev: `Bible ${n}`,
    name: `Translation ${n} (details not loaded yet)`,
    languageCode: 'und',
    licenseType: 'api_ephemeral',
    source: 'youversion',
    isDownloaded: false,
    attribution: '',
  };
}

/** License rule 1 (02 §5): only these translations may have text persisted. */
export function mayPersistText(id: string): boolean {
  const t = getTranslation(id);
  return t.licenseType === 'public_domain' || t.licenseType === 'api_cached';
}

/** Whether a translation has the book at all (partial Bibles are common). */
export function translationHasBook(t: Translation, bookId: string): boolean {
  if (!isValidBookId(bookId)) return false;
  return t.books ? t.books.includes(bookId) : true;
}
