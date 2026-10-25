/**
 * The YouVersion catalog cache (docs/02-architecture.md §5): languages and
 * version metadata kept in the app database, so the registry can name every
 * version a goal uses without the network and the picker opens with what it
 * showed last time. Verse text is never stored — Platform versions are
 * ephemeral until a license says otherwise.
 */
import { languageKey, type LanguageInfo } from '@/services/bible/catalog';
import {
  getTranslation,
  registerTranslations,
  registeredTranslations,
  unregisterTranslation,
  youversionBibleId,
} from '@/services/bible/registry';
import type { Translation } from '@/services/bible/types';
import {
  fetchBible,
  fetchBibles,
  fetchLanguages,
  youversionKeyConfigured,
} from '@/services/bible/youversion';

/** Catalog metadata is refetched after this long. */
const STALE_MS = 7 * 24 * 60 * 60 * 1000;
/** settings rows: when each language's versions were last fetched. */
const BIBLES_FETCHED_KEY = 'yv.bibles.';

let languagesMemory: LanguageInfo[] = [];
let languagesLocale: string | null = null;
let languagesFetchedAt = 0;
const biblesFetchedAt = new Map<string, number>();
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
    const { eq, like } = await import('drizzle-orm');
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
      .where(like(tables.settings.key, `${BIBLES_FETCHED_KEY}%`));
    for (const row of fetched) {
      biblesFetchedAt.set(row.key.slice(BIBLES_FETCHED_KEY.length), Number(row.value));
    }
  })().catch((e: unknown) => {
    loading = null;
    throw e;
  });
  return loading;
}

/** The languages last fetched, alphabetical in the locale they were named in. */
export function cachedLanguages(): LanguageInfo[] {
  return languagesMemory;
}

export function languagesById(): Map<string, LanguageInfo> {
  return new Map(languagesMemory.map((l) => [l.id, l]));
}

/** Languages whose versions have been fetched at some point. */
export function browsedLanguageIds(): Set<string> {
  return new Set(biblesFetchedAt.keys());
}

function cachedTranslationsFor(languageId: string): Translation[] {
  return registeredTranslations().filter((t) => languageKey(t.languageCode) === languageId);
}

/** The device's locale, without a native module (Hermes ships Intl). */
export function deviceLocale(): string {
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

/**
 * The versions this app key may read in one language, from the cache when
 * it was fetched within the week, else from the Platform. Returns what was
 * fetched (or cached) for that language id.
 */
export async function ensureBibles(
  languageId: string,
  options: { force?: boolean; locale?: string } = {},
): Promise<Translation[]> {
  await loadCatalog();
  const at = biblesFetchedAt.get(languageId);
  if (!options.force && at !== undefined && Date.now() - at < STALE_MS) {
    return cachedTranslationsFor(languageId);
  }
  if (!youversionKeyConfigured()) return cachedTranslationsFor(languageId);
  const list = await fetchBibles(languageId, undefined, options.locale);
  await storeTranslations(list);
  await pruneTranslations(languageId, new Set(list.map((t) => t.id)));
  const now = Date.now();
  const { db, tables } = await dbModule();
  await db
    .insert(tables.settings)
    .values({ key: BIBLES_FETCHED_KEY + languageId, value: String(now) })
    .onConflictDoUpdate({ target: tables.settings.key, set: { value: String(now) } });
  biblesFetchedAt.set(languageId, now);
  return list;
}

/**
 * Drops cached versions of one language that the Platform no longer lists
 * for this key — except any a goal still names, which keep their metadata
 * (the goal's text fetch will say 403 on its own).
 */
async function pruneTranslations(languageId: string, keep: ReadonlySet<string>): Promise<void> {
  const { db, tables } = await dbModule();
  const { inArray } = await import('drizzle-orm');
  const goals = await db.select({ translationId: tables.goals.translationId }).from(tables.goals);
  const named = new Set(goals.map((g) => g.translationId));
  const stale = cachedTranslationsFor(languageId)
    .map((t) => t.id)
    .filter((id) => !keep.has(id) && !named.has(id));
  if (stale.length === 0) return;
  await db.delete(tables.translations).where(inArray(tables.translations.id, stale));
  for (const id of stale) unregisterTranslation(id);
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
