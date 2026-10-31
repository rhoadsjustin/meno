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
  versionsStale,
  type TranslationSection,
} from '@/services/bible';

/**
 * `loading` and `error` are only ever shown when there is nothing cached to
 * show instead. A refresh over a cached catalog reports through `refresh`.
 */
type CatalogStatus = 'loading' | 'ready' | 'error';

/**
 * A refresh of the version list over a cached catalog, shown at the top of
 * the picker: checking, then how many versions it added, or why it failed.
 */
export type CatalogRefreshState =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'done'; added: number }
  | { state: 'failed'; reason: string | null };

type LoadOptions = { force?: boolean; versionsMaxAge?: number };

type CatalogState = {
  status: CatalogStatus;
  refresh: CatalogRefreshState;
  version: number;
  load: (options?: LoadOptions) => Promise<void>;
};

/**
 * How old the version list may be when the picker opens. Short, so a version
 * licensed in the portal appears on the next open rather than a week later;
 * not zero, so closing and reopening the picker doesn't refetch every time.
 * The refresh button passes zero.
 */
export const PICKER_VERSIONS_MAX_AGE = 5 * 60 * 1000;

/** The error's own words when it has any; the row adds a connection hint otherwise. */
function reasonOf(error: unknown): string | null {
  return error instanceof Error && error.message.trim() ? error.message.trim() : null;
}

export const useTranslationCatalog = create<CatalogState>((set, get) => ({
  status: youversionKeyConfigured() && !catalogFetched() ? 'loading' : 'ready',
  refresh: { state: 'idle' },
  version: 0,
  load: async (options) => {
    if (!youversionKeyConfigured()) {
      set({ status: 'ready' });
      return;
    }
    if (get().refresh.state === 'checking') return;
    // Over a cached list, say so while the Platform is asked; the first load
    // of all has its own row under the list.
    const hadCatalog = catalogFetched();
    const willFetch = options?.force || versionsStale(options?.versionsMaxAge);
    if (!hadCatalog) set({ status: 'loading' });
    else if (willFetch) set({ refresh: { state: 'checking' } });
    try {
      const result = await ensureCatalog(deviceLocale(), options);
      set((s) => ({
        status: 'ready',
        version: s.version + 1,
        refresh: hadCatalog && result.fetched ? { state: 'done', added: result.added } : s.refresh,
      }));
    } catch (error) {
      set((s) => ({
        status: catalogFetched() ? 'ready' : 'error',
        version: s.version + 1,
        refresh: hadCatalog ? { state: 'failed', reason: reasonOf(error) } : s.refresh,
      }));
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
