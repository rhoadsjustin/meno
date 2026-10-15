/**
 * The one door to Scripture (docs/02-architecture.md §2.4).
 * Nothing outside services/bible reads translation data; licensing rules
 * from 02 §5 are enforced here, not in UI.
 */
import * as SQLite from 'expo-sqlite';

import { getBook } from '@/services/bible/canon';
import { chaptersInRange, esvKeyConfigured, fetchEsvChapter } from '@/services/bible/esv';
import { compareRefs, refInRange } from '@/services/bible/refs';
import { getTranslation, mayPersistText, TRANSLATIONS } from '@/services/bible/registry';
import {
  resolveStarterPassages,
  STARTER_TRANSLATION_ID,
  STARTER_VERSES,
  type StarterPassage,
  type StarterVerse,
} from '@/services/bible/starters';
import type { Ref, RefRange, Translation, Verse } from '@/services/bible/types';

export { BOOKS, getBook, isValidBookId, bookOrder } from '@/services/bible/canon';
export * from '@/services/bible/refs';
export { TRANSLATIONS, DEFAULT_TRANSLATION_ID, getTranslation, mayPersistText } from '@/services/bible/registry';
export {
  DEFAULT_STARTER,
  STARTER_VERSES,
  trimUnbalancedQuotes,
} from '@/services/bible/starters';
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

/** Translations usable right now (bundled always; ESV once a key is set). */
export function availableTranslations(): Translation[] {
  return TRANSLATIONS.filter((t) => t.source === 'bundled' || (t.source === 'esv_api' && esvKeyConfigured()));
}

/** Single verse text, e.g. for the Today hero card. */
export async function getVerse(translationId: string, ref: Ref): Promise<Verse> {
  const rows = await getPassage(translationId, { start: ref, end: ref });
  if (!rows[0]) {
    throw new Error(`Verse not found: ${ref.bookId} ${ref.chapter}:${ref.verse} (${translationId})`);
  }
  return rows[0];
}

/** All verses in an inclusive range, in canonical order. */
export function getPassage(translationId: string, range: RefRange): Promise<Verse[]> {
  return readPassage(translationId, range, true);
}

/**
 * Passage text for display only, before the user has added it to a goal
 * (the starter cards). Bundled translations read as usual. ESV comes from
 * the cache when the chapter is already there; otherwise it is fetched and
 * held in memory for this launch, never written to `verses` (02 §5: cache
 * only what the user explicitly added to a goal).
 */
export function previewPassage(translationId: string, range: RefRange): Promise<Verse[]> {
  return readPassage(translationId, range, false);
}

async function readPassage(translationId: string, range: RefRange, persist: boolean): Promise<Verse[]> {
  const translation = getTranslation(translationId);
  if (compareRefs(range.start, range.end) > 0) {
    throw new Error('Passage range start is after end');
  }
  // Ranges within a single book cover the overwhelming case (goals are
  // book-scoped in v1); cross-book ranges walk book by book.
  if (range.start.bookId !== range.end.bookId) {
    throw new Error('Cross-book passages are not supported yet');
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
      range.end.verse
    );
    return rows.map((row) => ({ ...row, translationId: translation.id }));
  }
  if (translation.source === 'esv_api') {
    return getEsvPassage(range, persist);
  }
  throw new Error(`Translation ${translation.abbrev} is not available yet`);
}

function starterTranslationAvailable(): boolean {
  return availableTranslations().some((t) => t.id === STARTER_TRANSLATION_ID);
}

/**
 * The starter set with its text, for the cards on Today's empty state: ESV
 * when a key is configured and every verse arrives in time, bundled KJV
 * otherwise. Display only — see `previewPassage`.
 */
export function starterPassages(): Promise<StarterPassage[]> {
  return resolveStarterPassages(STARTER_VERSES, {
    preferredAvailable: starterTranslationAvailable(),
    read: previewPassage,
  });
}

/**
 * One starter the user has chosen to practice, about to become a goal — so
 * ESV goes through the normal cache-first path here. `preferEsv: false`
 * keeps a start in KJV when that is what the card showed.
 */
export async function starterPassage(
  starter: StarterVerse,
  options: { preferEsv?: boolean } = {}
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
export async function getChapter(translationId: string, bookId: string, chapter: number): Promise<Verse[]> {
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
 * ESV, cache-first (02 §5): verses persist to the app database only under
 * `api_cached` license, are fetched chapter-at-a-time on miss, and are
 * purged when the goals referencing them are deleted.
 */
async function getEsvPassage(range: RefRange, persist: boolean): Promise<Verse[]> {
  const out: Verse[] = [];
  for (const chapter of chaptersInRange(range.start, range.end)) {
    const verses = await esvChapterCached(range.start.bookId, chapter, persist);
    for (const v of verses) {
      if (refInRange({ bookId: v.bookId, chapter: v.chapter, verse: v.verse }, range)) out.push(v);
    }
  }
  return out;
}

/** Chapters fetched for display only (`persist: false`); gone when the app quits. */
const esvUnpersisted = new Map<string, Promise<Verse[]>>();

async function esvChapterCached(bookId: string, chapter: number, persist = true): Promise<Verse[]> {
  const { db, tables } = await import('@/services/db');
  const { and, eq } = await import('drizzle-orm');
  const cached = await db
    .select()
    .from(tables.verses)
    .where(
      and(
        eq(tables.verses.translationId, 'esv'),
        eq(tables.verses.bookId, bookId),
        eq(tables.verses.chapter, chapter)
      )
    )
    .orderBy(tables.verses.verse);
  if (cached.length > 0) {
    return cached.map((r) => ({ ...r, translationId: 'esv' }));
  }
  if (!persist) {
    const key = `${bookId}.${chapter}`;
    let pending = esvUnpersisted.get(key);
    if (!pending) {
      pending = fetchEsvChapter(bookId, chapter);
      esvUnpersisted.set(key, pending);
      // A failed fetch is retried next time rather than remembered.
      pending.catch(() => esvUnpersisted.delete(key));
    }
    return pending;
  }
  const fetched = await fetchEsvChapter(bookId, chapter);
  if (fetched.length > 0 && mayPersistText('esv')) {
    await db.insert(tables.verses).values(fetched).onConflictDoNothing();
  }
  return fetched;
}
