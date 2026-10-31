/**
 * The YouVersion catalog cache (docs/02-architecture.md §5): languages and
 * version metadata kept in the app database, so the registry can name every
 * version a goal uses without the network and the picker opens with what it
 * showed last time. Verse text is never stored — Platform versions are
 * ephemeral until a license says otherwise.
 */
import { Platform, Settings } from 'react-native';

import { getBook } from '@/services/bible/canon';
import type { LanguageInfo } from '@/services/bible/catalog';
import {
  getTranslation,
  registerTranslations,
  registeredTranslations,
  unregisterTranslation,
  youversionBibleId,
} from '@/services/bible/registry';
import type { Translation } from '@/services/bible/types';
import {
  fetchAllBibles,
  fetchBible,
  fetchBookChapters,
  fetchLanguages,
  youversionKeyConfigured,
} from '@/services/bible/youversion';

/** Catalog metadata is refetched after this long. */
const STALE_MS = 7 * 24 * 60 * 60 * 1000;
/** settings row: when the whole version list was last fetched. */
const CATALOG_FETCHED_KEY = 'yv.catalog';

let languagesMemory: LanguageInfo[] = [];
let languagesLocale: string | null = null;
let languagesFetchedAt = 0;
let catalogFetchedAt = 0;
let loading: Promise<void> | null = null;

function dbModule() {
  return import('@/services/db');
}

const byName = (a: LanguageInfo, b: LanguageInfo) => a.name.localeCompare(b.name);

function chunk<T>(list: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

type TranslationRow = {
  id: string;
  abbrev: string;
  name: string;
  languageCode: string;
  licenseType: Translation['licenseType'];
  source: Translation['source'];
  isDownloaded: boolean;
  attribution: string;
  booksJson: string | null;
  textDirection: 'ltr' | 'rtl' | null;
};

function rowToTranslation(row: TranslationRow): Translation {
  const books = row.booksJson ? (JSON.parse(row.booksJson) as string[]) : undefined;
  return {
    id: row.id,
    abbrev: row.abbrev,
    name: row.name,
    languageCode: row.languageCode,
    licenseType: row.licenseType,
    source: row.source,
    isDownloaded: row.isDownloaded,
    attribution: row.attribution,
    ...(books ? { books } : {}),
    ...(row.textDirection ? { textDirection: row.textDirection } : {}),
  };
}

function translationToRow(t: Translation, fetchedAt: Date) {
  return {
    id: t.id,
    abbrev: t.abbrev,
    name: t.name,
    languageCode: t.languageCode,
    licenseType: t.licenseType,
    source: t.source,
    isDownloaded: t.isDownloaded,
    attribution: t.attribution,
    booksJson: t.books ? JSON.stringify(t.books) : null,
    textDirection: t.textDirection ?? null,
    fetchedAt,
  };
}

/** Reads the cache into memory and the registry. Runs once per launch. */
export function loadCatalog(): Promise<void> {
  loading ??= (async () => {
    const { db, tables } = await dbModule();
    const { eq } = await import('drizzle-orm');
    const rows = await db
      .select()
      .from(tables.translations)
      .where(eq(tables.translations.source, 'youversion'));
    registerTranslations(rows.map(rowToTranslation));
    const langs = await db.select().from(tables.languages);
    languagesMemory = langs
      .map((l) => ({ id: l.id, name: l.name, textDirection: l.textDirection }))
      .sort(byName);
    languagesLocale = langs[0]?.locale ?? null;
    languagesFetchedAt = langs[0]?.fetchedAt.getTime() ?? 0;
    const fetched = await db
      .select()
      .from(tables.settings)
      .where(eq(tables.settings.key, CATALOG_FETCHED_KEY));
    catalogFetchedAt = Number(fetched[0]?.value ?? 0) || 0;
  })().catch((e: unknown) => {
    loading = null;
    throw e;
  });
  return loading;
}

export function languagesById(): Map<string, LanguageInfo> {
  return new Map(languagesMemory.map((l) => [l.id, l]));
}

/** True once the full version list has been fetched at least once. */
export function catalogFetched(): boolean {
  return catalogFetchedAt > 0;
}

/**
 * The device's preferred language, without a native module. On iOS the
 * system keeps it in user defaults under AppleLanguages ('es-MX' first for
 * a Spanish phone); Hermes's Intl only reports the region ('en-MX'), so it
 * is the fallback, and Android's answer.
 */
export function deviceLocale(): string {
  if (Platform.OS === 'ios') {
    try {
      const languages = Settings.get('AppleLanguages') as unknown;
      const first = Array.isArray(languages) ? languages[0] : null;
      if (typeof first === 'string' && first.length > 0) return first;
    } catch {
      // Fall through to Intl.
    }
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
  } catch {
    return 'en-US';
  }
}

/**
 * Every language the Platform has Bibles for, named in `locale`. One request,
 * then a week from the cache; a locale change refetches for the new names.
 */
export async function ensureLanguages(
  locale: string,
  options: { force?: boolean } = {},
): Promise<LanguageInfo[]> {
  await loadCatalog();
  const fresh = Date.now() - languagesFetchedAt < STALE_MS;
  if (!options.force && languagesMemory.length > 0 && fresh && languagesLocale === locale) {
    return languagesMemory;
  }
  if (!youversionKeyConfigured()) return languagesMemory;
  const list = await fetchLanguages(locale);
  const now = new Date();
  const { db, tables } = await dbModule();
  await db.delete(tables.languages);
  for (const batch of chunk(list, 150)) {
    await db.insert(tables.languages).values(
      batch.map((l) => ({
        id: l.id,
        name: l.name,
        locale,
        textDirection: l.textDirection,
        fetchedAt: now,
      })),
    );
  }
  languagesMemory = [...list].sort(byName);
  languagesLocale = locale;
  languagesFetchedAt = now.getTime();
  return languagesMemory;
}

async function storeTranslations(list: readonly Translation[]): Promise<void> {
  if (list.length === 0) return;
  registerTranslations(list);
  const { db, tables } = await dbModule();
  const { sql } = await import('drizzle-orm');
  const now = new Date();
  for (const batch of chunk(list, 50)) {
    await db
      .insert(tables.translations)
      .values(batch.map((t) => translationToRow(t, now)))
      .onConflictDoUpdate({
        target: tables.translations.id,
        set: {
          abbrev: sql`excluded.abbrev`,
          name: sql`excluded.name`,
          languageCode: sql`excluded.languageCode`,
          licenseType: sql`excluded.licenseType`,
          attribution: sql`excluded.attribution`,
          booksJson: sql`excluded.booksJson`,
          textDirection: sql`excluded.textDirection`,
          fetchedAt: sql`excluded.fetchedAt`,
        },
      });
  }
}

let catalogLoading: Promise<void> | null = null;

/**
 * The language names and every version this app key may read, in one pass:
 * from the cache when fetched within the week (and in this locale), else
 * from the Platform. The picker lists only languages that have a version,
 * so nobody taps a language to find it empty.
 *
 * `versionsMaxAge` refetches the version list sooner than the week: the
 * picker passes a few minutes, so a license accepted in the portal shows up
 * the next time someone opens it. The language names stay weekly.
 */
export function ensureCatalog(
  locale: string,
  options: { force?: boolean; versionsMaxAge?: number } = {},
): Promise<void> {
  catalogLoading ??= (async () => {
    await loadCatalog();
    if (!youversionKeyConfigured()) return;
    const fresh = Date.now() - catalogFetchedAt < (options.versionsMaxAge ?? STALE_MS);
    const sameLocale = languagesLocale === locale;
    await ensureLanguages(locale, { force: options.force });
    if (!options.force && fresh && sameLocale) return;
    const list = await fetchAllBibles(undefined, locale);
    await storeTranslations(list);
    await pruneTranslations(new Set(list.map((t) => t.id)));
    const now = Date.now();
    const { db, tables } = await dbModule();
    await db
      .insert(tables.settings)
      .values({ key: CATALOG_FETCHED_KEY, value: String(now) })
      .onConflictDoUpdate({ target: tables.settings.key, set: { value: String(now) } });
    catalogFetchedAt = now;
  })().finally(() => {
    catalogLoading = null;
  });
  return catalogLoading;
}

/**
 * Drops cached versions the Platform no longer lists for this key — except
 * any a goal still names, which keep their metadata (the goal's text fetch
 * will say 403 on its own). An empty list is a failed fetch, not a key
 * with nothing: it prunes nothing.
 */
async function pruneTranslations(keep: ReadonlySet<string>): Promise<void> {
  if (keep.size === 0) return;
  const { db, tables } = await dbModule();
  const { inArray } = await import('drizzle-orm');
  const goals = await db.select({ translationId: tables.goals.translationId }).from(tables.goals);
  const named = new Set(goals.map((g) => g.translationId));
  const stale = registeredTranslations()
    .map((t) => t.id)
    .filter((id) => !keep.has(id) && !named.has(id));
  if (stale.length === 0) return;
  for (const batch of chunk(stale, 200)) {
    await db.delete(tables.translations).where(inArray(tables.translations.id, batch));
  }
  for (const id of stale) unregisterTranslation(id);
}

/** Chapter lists already fetched this launch, by `${translationId}.${bookId}`. */
const chapterLists = new Map<string, Promise<number[]>>();

function allChapters(bookId: string): number[] {
  return Array.from({ length: getBook(bookId).chapters }, (_, i) => i + 1);
}

/**
 * The chapters a version has of a book. Bundled and ESV text has every
 * chapter; a Platform version may be a portion, so its list is fetched once
 * per launch (metadata only, never text). Offline or failing, it falls back
 * to the canon's chapters and lets the chapter fetch say what is missing.
 */
export function availableChapters(translationId: string, bookId: string): Promise<number[]> {
  const bibleId = youversionBibleId(translationId);
  if (bibleId === null || !youversionKeyConfigured()) {
    return Promise.resolve(allChapters(bookId));
  }
  const key = `${translationId}.${bookId}`;
  let list = chapterLists.get(key);
  if (!list) {
    list = fetchBookChapters(bibleId, getBook(bookId).usfm).then(
      (chapters) => (chapters.length > 0 ? chapters : allChapters(bookId)),
      (e: unknown) => {
        chapterLists.delete(key);
        throw e;
      },
    );
    chapterLists.set(key, list);
  }
  return list.catch(() => allChapters(bookId));
}

/** Fills in a version the registry only holds a placeholder for. */
export async function ensureTranslation(
  translationId: string,
  locale?: string,
): Promise<Translation> {
  await loadCatalog();
  const known = registeredTranslations().find((t) => t.id === translationId);
  if (known) return known;
  const bibleId = youversionBibleId(translationId);
  if (bibleId === null || !youversionKeyConfigured()) return getTranslation(translationId);
  const t = await fetchBible(bibleId, undefined, locale);
  await storeTranslations([t]);
  return t;
}

/**
 * Goals in Platform versions the cache has never seen (a reinstall, a
 * challenge accepted offline) get their metadata in the background.
 */
export async function fillPlaceholders(): Promise<void> {
  await loadCatalog();
  if (!youversionKeyConfigured()) return;
  const { db, tables } = await dbModule();
  const goals = await db.select({ translationId: tables.goals.translationId }).from(tables.goals);
  const known = new Set(registeredTranslations().map((t) => t.id));
  const missing = new Set(
    goals
      .map((g) => g.translationId)
      .filter((id) => youversionBibleId(id) !== null && !known.has(id)),
  );
  const locale = deviceLocale();
  for (const id of missing) {
    try {
      await ensureTranslation(id, locale);
    } catch {
      // Offline or unlicensed: the placeholder stays until next launch.
    }
  }
}
