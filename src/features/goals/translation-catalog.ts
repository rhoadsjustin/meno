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
  selectedFirst,
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
 * A check of the version list that the person asked for (the bar's refresh
 * button), shown at the top of the picker: checking, then how many versions
 * it added, or that it failed. The check the picker runs by itself on
 * opening reports nothing: new versions simply appear, and a failure leaves
 * the cached list, which works. The error's own words are never shown: they
 * are developer text, in English, and name the Platform (02 §5).
 */
export type CatalogRefreshState =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'done'; added: number }
  | { state: 'failed' };

type LoadOptions = {
  force?: boolean;
  versionsMaxAge?: number;
  /** Asked for by hand: say what the check is doing and what it found. */
  report?: boolean;
};

type CatalogState = {
  status: CatalogStatus;
  refresh: CatalogRefreshState;
  /** A check is in flight, reported or not; the refresh button waits on it. */
  checking: boolean;
  version: number;
  load: (options?: LoadOptions) => Promise<void>;
  /** Forgets the last reported check, so it is not shown again on the next open. */
  resetRefresh: () => void;
};

/**
 * How old the version list may be when the picker opens. Short, so a version
 * licensed in the portal appears on the next open rather than a week later;
 * not zero, so closing and reopening the picker doesn't refetch every time.
 * The refresh button passes zero.
 */
export const PICKER_VERSIONS_MAX_AGE = 5 * 60 * 1000;

export const useTranslationCatalog = create<CatalogState>((set, get) => ({
  status: youversionKeyConfigured() && !catalogFetched() ? 'loading' : 'ready',
  refresh: { state: 'idle' },
  checking: false,
  version: 0,
  load: async (options) => {
    if (!youversionKeyConfigured()) {
      set({ status: 'ready' });
      return;
    }
    if (get().checking) return;
    // Over a cached list a check asked for by hand says so while the
    // Platform is asked; the first load of all has its own row under the list.
    const hadCatalog = catalogFetched();
    const willFetch = options?.force || versionsStale(options?.versionsMaxAge);
    const report = hadCatalog && options?.report === true;
    if (!hadCatalog) set({ status: 'loading', checking: true });
    else if (willFetch) {
      set(report ? { checking: true, refresh: { state: 'checking' } } : { checking: true });
    }
    try {
      const result = await ensureCatalog(deviceLocale(), options);
      set((s) => ({
        status: 'ready',
        checking: false,
        version: s.version + 1,
        refresh: report && result.fetched ? { state: 'done', added: result.added } : s.refresh,
      }));
    } catch (error) {
      if (__DEV__) console.warn('Translation catalog refresh failed', error);
      set((s) => ({
        status: catalogFetched() ? 'ready' : 'error',
        checking: false,
        version: s.version + 1,
        refresh: report ? { state: 'failed' } : s.refresh,
      }));
    }
  },
  resetRefresh: () => {
    // A check still running keeps its row until it lands.
    if (get().refresh.state !== 'checking') set({ refresh: { state: 'idle' } });
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
 * featured languages lead, in order: the current choice's language, the
 * device's language, then English. The current choice is also the first row
 * of its language, on both screens, so the check mark is on screen when the
 * picker opens without any scrolling; the rest keep the catalog's order.
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
  const sections = groupByLanguage(availableTranslations(), languagesById(), order).map((s) =>
    selectedFirst(s, selected),
  );
  const present = new Set(sections.map((s) => s.languageId));
  return { sections, featured: order.filter((id) => present.has(id)), version };
}
