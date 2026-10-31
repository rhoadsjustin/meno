/**
 * The one door to Scripture (docs/02-architecture.md §2.4).
 * Nothing outside services/bible reads translation data; licensing rules
 * from 02 §5 are enforced here, not in UI.
 */
import * as SQLite from 'expo-sqlite';

import { getBook } from '@/services/bible/canon';
import { chaptersInRange, esvKeyConfigured, fetchEsvChapter } from '@/services/bible/esv';
import { compareRefs, refInRange } from '@/services/bible/refs';
import {
  chapterSlice,
  CHUNK_RETAINING_GOAL_STATUS,
  coveredByRetained,
  PURGE_UNREFERENCED_SQL,
  retainedOnly,
  retainedRangesOf,
  RETAINING_GOAL_STATUSES,
} from '@/services/bible/retention';
import {
  duplicatesBundled,
  getTranslation,
  mayPersistText,
  registeredTranslations,
  translationHasBook,
  TRANSLATIONS,
  youversionBibleId,
} from '@/services/bible/registry';
import {
  resolveStarterPassages,
  STARTER_TRANSLATION_ID,
  STARTER_VERSES,
  type StarterPassage,
  type StarterVerse,
} from '@/services/bible/starters';
import type { Ref, RefRange, Translation, Verse } from '@/services/bible/types';
import { fetchYouVersionChapter, youversionKeyConfigured } from '@/services/bible/youversion';

export { BOOKS, getBook, isValidBookId, bookOrder } from '@/services/bible/canon';
export * from '@/services/bible/refs';
export {
  TRANSLATIONS,
  DEFAULT_TRANSLATION_ID,
  getTranslation,
  mayPersistText,
  registerTranslations,
  translationHasBook,
  youversionBibleId,
  youversionTranslationId,
} from '@/services/bible/registry';
export * from '@/services/bible/catalog';
export {
  availableChapters,
  catalogFetched,
  deviceLocale,
  ensureCatalog,
  ensureLanguages,
  ensureTranslation,
  fillPlaceholders,
  languagesById,
  loadCatalog,
} from '@/services/bible/youversion-catalog';
export { youversionKeyConfigured, YouVersionError } from '@/services/bible/youversion';
export { DEFAULT_STARTER, STARTER_VERSES, trimUnbalancedQuotes } from '@/services/bible/starters';
export type { StarterPassage, StarterVerse } from '@/services/bible/starters';
export type { Ref, RefRange, Translation, Verse } from '@/services/bible/types';

// Bump the version suffix whenever bundled.db contents change, so devices
// that already imported an older copy re-import the new one.
const BUNDLED_DB_NAME = 'bundled-bibles-v2.db';

let bundledDbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Opens the read-only bundled-translations database, copying it out of the
 * app bundle on first use. Public-domain text only (02 §5 "Bundled").
 */
function openBundledDb(): Promise<SQLite.SQLiteDatabase> {
  bundledDbPromise ??= (async () => {
    await SQLite.importDatabaseFromAssetAsync(BUNDLED_DB_NAME, {
      assetId: require('@/assets/bibles/bundled.db'),
    });
    return SQLite.openDatabaseAsync(BUNDLED_DB_NAME);
  })();
  return bundledDbPromise;
}

/** Past any chapter's last verse (Psalm 119 has 176). */
const CHAPTER_END = 999;

type VerseRow = { bookId: string; chapter: number; verse: number; text: string };

/**
 * Translations usable right now: bundled always, ESV once its key is set,
 * and every YouVersion Platform version the catalog cache holds once that
 * key is set (02 §5).
 */
export function availableTranslations(): Translation[] {
  const out = TRANSLATIONS.filter(
    (t) => t.source === 'bundled' || (t.source === 'esv_api' && esvKeyConfigured()),
  );
  if (youversionKeyConfigured()) {
    out.push(...registeredTranslations().filter((t) => !duplicatesBundled(t)));
  }
  return out;
}

/** Single verse text, e.g. for the Today hero card. */
export async function getVerse(translationId: string, ref: Ref): Promise<Verse> {
  const rows = await getPassage(translationId, { start: ref, end: ref });
  if (!rows[0]) {
    throw new Error(
      `Verse not found: ${ref.bookId} ${ref.chapter}:${ref.verse} (${translationId})`,
    );
  }
  return rows[0];
}

/**
 * All verses in an inclusive range, in canonical order. A read never caches
 * licensed text outside a goal's range (see `getEsvPassage`).
 */
export async function getPassage(translationId: string, range: RefRange): Promise<Verse[]> {
  const translation = getTranslation(translationId);
  if (compareRefs(range.start, range.end) > 0) {
    throw new Error('Passage range start is after end');
  }
  // Ranges within a single book cover the overwhelming case (goals are
  // book-scoped in v1); cross-book ranges walk book by book.
  if (range.start.bookId !== range.end.bookId) {
    throw new Error('Cross-book passages are not supported yet');
  }
  if (!translationHasBook(translation, range.start.bookId)) {
    throw new Error(`${getBook(range.start.bookId).name} isn’t in the ${translation.abbrev}`);
  }
  if (translation.source === 'bundled') {
    const db = await openBundledDb();
    const rows = await db.getAllAsync<VerseRow>(
      `SELECT bookId, chapter, verse, text FROM verses
       WHERE translationId = ? AND bookId = ?
         AND (chapter > ? OR (chapter = ? AND verse >= ?))
         AND (chapter < ? OR (chapter = ? AND verse <= ?))
       ORDER BY chapter, verse`,
      translation.id,
      range.start.bookId,
      range.start.chapter,
      range.start.chapter,
      range.start.verse,
      range.end.chapter,
      range.end.chapter,
      range.end.verse,
    );
    return rows.map((row) => ({ ...row, translationId: translation.id }));
  }
  if (translation.source === 'esv_api') {
    return getEsvPassage(range);
  }
  if (translation.source === 'youversion') {
    return getYouVersionPassage(translation, range);
  }
  throw new Error(`Translation ${translation.abbrev} is not available yet`);
}

function starterTranslationAvailable(): boolean {
  return availableTranslations().some((t) => t.id === STARTER_TRANSLATION_ID);
}

/**
 * The starter set with its text, for the cards on Today's empty state: ESV
 * when a key is configured and every verse arrives in time, bundled KJV
 * otherwise. Display only: nothing here is cached.
 */
export function starterPassages(): Promise<StarterPassage[]> {
  return resolveStarterPassages(STARTER_VERSES, {
    preferredAvailable: starterTranslationAvailable(),
    read: getPassage,
  });
}

/**
 * One starter the user has chosen to practice, about to become a goal.
 * `preferEsv: false` keeps a start in KJV when that is what the card showed.
 * An ESV fetch that outlives the timeout lands in memory only, so a start
 * that fell back to KJV leaves no ESV text behind.
 */
export async function starterPassage(
  starter: StarterVerse,
  options: { preferEsv?: boolean } = {},
): Promise<StarterPassage> {
  const [passage] = await resolveStarterPassages([starter], {
    preferredAvailable: (options.preferEsv ?? true) && starterTranslationAvailable(),
    read: getPassage,
  });
  return passage;
}

/**
 * Every verse of one chapter, in order (the goal wizard's verse list). Take
 * the chapter's length from the last row's verse number, not the row count:
 * the ESV omits a few verses its base text lacks (John 5:4).
 */
export async function getChapter(
  translationId: string,
  bookId: string,
  chapter: number,
): Promise<Verse[]> {
  const book = getBook(bookId);
  if (chapter < 1 || chapter > book.chapters) {
    throw new Error(`${book.name} has no chapter ${chapter}`);
  }
  return getPassage(translationId, {
    start: { bookId, chapter, verse: 1 },
    end: { bookId, chapter, verse: CHAPTER_END },
  });
}

/**
 * ESV (02 §5). Text is cached in the app database only where a goal the
 * user still has covers it; everything else — the reader, the wizard's
 * verse list, the starter cards — is fetched a chapter at a time and held in
 * memory for this launch. So a read inside a goal works offline, and
 * browsing leaves nothing behind.
 */
async function getEsvPassage(range: RefRange): Promise<Verse[]> {
  const retained = await retainedRanges('esv');
  const out: Verse[] = [];
  for (const chapter of chaptersInRange(range.start, range.end)) {
    const slice = chapterSlice(range, chapter);
    const verses = coveredByRetained(slice, retained)
      ? await esvCached(slice, retained)
      : await esvChapter(slice.start.bookId, chapter);
    for (const v of verses) {
      if (refInRange(v, slice)) out.push(v);
    }
  }
  return out;
}

/**
 * Ranges that keep `translationId` text cached (see retention): whole goals
 * in progress or completed, and the memorized chunks of stopped goals.
 */
async function retainedRanges(translationId: string): Promise<RefRange[]> {
  const { db, tables } = await import('@/services/db');
  const { and, eq, inArray } = await import('drizzle-orm');
  const goals = await db
    .select()
    .from(tables.goals)
    .where(
      and(
        eq(tables.goals.translationId, translationId),
        inArray(tables.goals.status, [...RETAINING_GOAL_STATUSES, CHUNK_RETAINING_GOAL_STATUS]),
      ),
    );
  const stoppedIds = goals.filter((g) => g.status === CHUNK_RETAINING_GOAL_STATUS).map((g) => g.id);
  const chunks =
    stoppedIds.length > 0
      ? await db.select().from(tables.chunks).where(inArray(tables.chunks.goalId, stoppedIds))
      : [];
  return goals.flatMap((g) =>
    retainedRangesOf(
      g,
      chunks.filter((c) => c.goalId === g.id),
    ),
  );
}

/** Most chapters held in memory at once; a long reader session drops the oldest. */
const MEMORY_CHAPTERS = 40;

/** Chapters fetched this launch, never written anywhere; gone when the app quits. */
const chaptersInMemory = new Map<string, Promise<Verse[]>>();

function memoChapter(key: string, fetchChapter: () => Promise<Verse[]>): Promise<Verse[]> {
  let pending = chaptersInMemory.get(key);
  if (!pending) {
    pending = fetchChapter();
    chaptersInMemory.set(key, pending);
    // A failed fetch is retried next time rather than remembered.
    pending.catch(() => chaptersInMemory.delete(key));
    if (chaptersInMemory.size > MEMORY_CHAPTERS) {
      chaptersInMemory.delete(chaptersInMemory.keys().next().value as string);
    }
  }
  return pending;
}

function esvChapter(bookId: string, chapter: number): Promise<Verse[]> {
  return memoChapter(`esv.${bookId}.${chapter}`, () => fetchEsvChapter(bookId, chapter));
}

/**
 * YouVersion Platform versions (02 §5): ephemeral. Every chapter is read into
 * memory for this launch and nothing is written, so a goal in one of these
 * needs a connection to practice. The chapter is the unit the API serves,
 * as with ESV.
 */
async function getYouVersionPassage(translation: Translation, range: RefRange): Promise<Verse[]> {
  const bibleId = youversionBibleId(translation.id);
  if (bibleId === null) throw new Error(`Not a YouVersion translation: ${translation.id}`);
  const { bookId } = range.start;
  const out: Verse[] = [];
  for (const chapter of chaptersInRange(range.start, range.end)) {
    const verses = await memoChapter(`${translation.id}.${bookId}.${chapter}`, () =>
      fetchYouVersionChapter(translation.id, bibleId, bookId, chapter),
    );
    for (const v of verses) {
      if (refInRange(v, range)) out.push(v);
    }
  }
  return out;
}

/**
 * One chapter's slice of a goal, from the cache. `cachePassage` fills the
 * cache when a goal is created, so a miss means a database from before that
 * rule or a goal whose text was purged; fetch the chapter and keep what the
 * goals cover.
 */
async function esvCached(slice: RefRange, retained: readonly RefRange[]): Promise<Verse[]> {
  const { db, tables } = await import('@/services/db');
  const { and, between, eq } = await import('drizzle-orm');
  const cached = await db
    .select()
    .from(tables.verses)
    .where(
      and(
        eq(tables.verses.translationId, 'esv'),
        eq(tables.verses.bookId, slice.start.bookId),
        eq(tables.verses.chapter, slice.start.chapter),
        between(tables.verses.verse, slice.start.verse, slice.end.verse),
      ),
    )
    .orderBy(tables.verses.verse);
  if (cached.length > 0) return cached;
  const fetched = await esvChapter(slice.start.bookId, slice.start.chapter);
  await persistVerses(retainedOnly(fetched, retained));
  return fetched;
}

async function persistVerses(verses: Verse[]): Promise<void> {
  if (verses.length === 0 || !verses.every((v) => mayPersistText(v.translationId))) return;
  const { db, tables } = await import('@/services/db');
  await db.insert(tables.verses).values(verses).onConflictDoNothing();
}

/**
 * Caches a goal's text so the goal works offline. Call once the goal row
 * exists (the purge keeps only what a goal covers) and before relying on the
 * goal: reads inside it trust the cache to hold the whole range. A no-op for
 * bundled translations. Throws if the text cannot be had.
 */
export async function cachePassage(translationId: string, range: RefRange): Promise<void> {
  const translation = getTranslation(translationId);
  if (translation.source !== 'esv_api' || !mayPersistText(translationId)) return;
  const verses: Verse[] = [];
  for (const chapter of chaptersInRange(range.start, range.end)) {
    const fetched = await esvChapter(range.start.bookId, chapter);
    verses.push(...fetched.filter((v) => refInRange(v, range)));
  }
  if (verses.length === 0) throw new Error('Passage contains no verses');
  await persistVerses(verses);
}

/**
 * Removes cached licensed text that no goal the user still has covers (02
 * §5) — for a stopped goal, that its memorized chunks don't cover. Run after
 * a goal is deleted, stopped or archived, and once at launch to trim
 * anything an earlier version left behind. Local and cheap: one DELETE over
 * a table that holds only goal text. Bundled translations are in another
 * database and are never touched.
 */
export async function purgeUnreferencedText(): Promise<void> {
  const { db } = await import('@/services/db');
  const { sql } = await import('drizzle-orm');
  await db.run(sql.raw(PURGE_UNREFERENCED_SQL));
}
