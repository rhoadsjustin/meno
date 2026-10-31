/**
 * The translation picker's view of the catalog, shared by its two screens
 * (all languages, and one language's versions). Loads languages and every
 * version this app key may read in one pass (services/bible ensureCatalog),
 * and bumps `version` when the registry changes so the lists re-read it.
 */
import { useMemo } from 'react';
import { create } from 'zustand';

import {
  availableTranslations,
  catalogFetched,
  deviceLocale,
  ensureCatalog,
  getTranslation,
  groupByLanguage,
  languageKey,
  languagesById,
  preferredLanguageIds,
  youversionKeyConfigured,
  type TranslationSection,
} from '@/services/bible';

/**
 * `loading` and `error` are only ever shown when there is nothing cached to
 * show instead; a weekly refresh over a cached catalog stays silent.
 */
type CatalogStatus = 'loading' | 'ready' | 'error';

type CatalogState = {
  status: CatalogStatus;
  version: number;
  load: (options?: { force?: boolean; versionsMaxAge?: number }) => Promise<void>;
};

/**
 * How old the version list may be when the picker opens. Short, so a version
 * licensed in the portal appears on the next open rather than a week later;
 * not zero, so closing and reopening the picker doesn't refetch every time.
 */
export const PICKER_VERSIONS_MAX_AGE = 5 * 60 * 1000;

export const useTranslationCatalog = create<CatalogState>((set) => ({
  status: youversionKeyConfigured() && !catalogFetched() ? 'loading' : 'ready',
  version: 0,
  load: async (options) => {
    if (!youversionKeyConfigured()) {
      set({ status: 'ready' });
      return;
    }
    if (!catalogFetched()) set({ status: 'loading' });
    try {
      await ensureCatalog(deviceLocale(), options);
      set((s) => ({ status: 'ready', version: s.version + 1 }));
    } catch {
      set((s) => ({ status: catalogFetched() ? 'ready' : 'error', version: s.version + 1 }));
    }
  },
}));

/** The language a translation id belongs to, or null for an unknown id. */
export function languageOf(translationId: string | undefined): string | null {
  if (!translationId) return null;
  try {
    return languageKey(getTranslation(translationId).languageCode);
  } catch {
    return null;
  }
}

/**
 * Every language with at least one translation, as picker sections. The
 * featured languages lead, in order: the current choice's language (so the
 * check mark is on screen when the picker opens), the device's language,
 * then English.
 */
type CatalogSections = {
  sections: TranslationSection[];
  featured: string[];
  /** The catalog version these sections were read at. */
  version: number;
};

export function useCatalogSections(selected: string | undefined): CatalogSections {
  const version = useTranslationCatalog((s) => s.version);
  return useMemo(() => catalogSections(version, selected), [version, selected]);
}

/**
 * Reads the registry as it stands. The registry is a plain module, so
 * `version` is passed through as a real input and output: a memo that only
 * mentions it (`void version`) can be compiled away by the React Compiler,
 * which left the list empty after the first catalog load.
 */
function catalogSections(version: number, selected: string | undefined): CatalogSections {
  const preferred = preferredLanguageIds(deviceLocale());
  const current = languageOf(selected);
  const order = current ? [current, ...preferred.filter((id) => id !== current)] : preferred;
  const sections = groupByLanguage(availableTranslations(), languagesById(), order);
  const present = new Set(sections.map((s) => s.languageId));
  return { sections, featured: order.filter((id) => present.has(id)), version };
}
