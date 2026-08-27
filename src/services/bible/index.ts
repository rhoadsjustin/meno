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
import type { Ref, RefRange, Translation, Verse } from '@/services/bible/types';

export { BOOKS, getBook, isValidBookId, bookOrder } from '@/services/bible/canon';
export * from '@/services/bible/refs';
export { TRANSLATIONS, DEFAULT_TRANSLATION_ID, getTranslation, mayPersistText } from '@/services/bible/registry';
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
    return getEsvPassage(translation, range);
  }
  throw new Error(`Translation ${translation.abbrev} is not available yet`);
}

/** Number of verses in a chapter (goal wizard, chunking). */
export async function getChapterVerseCount(translationId: string, bookId: string, chapter: number): Promise<number> {
  const translation = getTranslation(translationId);
  const book = getBook(bookId);
  if (chapter < 1 || chapter > book.chapters) {
    throw new Error(`${book.name} has no chapter ${chapter}`);
  }
  if (translation.source === 'bundled') {
    const db = await openBundledDb();
    const row = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM verses WHERE translationId = ? AND bookId = ? AND chapter = ?',
      translation.id,
      bookId,
      chapter
    );
    return row?.n ?? 0;
  }
  if (translation.source === 'esv_api') {
    const verses = await esvChapterCached(bookId, chapter);
    return verses.length;
  }
  throw new Error(`Translation ${translation.abbrev} is not available yet`);
}

/**
 * ESV, cache-first (02 §5): verses persist to the app database only under
 * `api_cached` license, are fetched chapter-at-a-time on miss, and are
 * purged when the goals referencing them are deleted.
 */
async function getEsvPassage(translation: Translation, range: RefRange): Promise<Verse[]> {
  const out: Verse[] = [];
  for (const chapter of chaptersInRange(range.start, range.end)) {
    const verses = await esvChapterCached(range.start.bookId, chapter);
    for (const v of verses) {
      if (refInRange({ bookId: v.bookId, chapter: v.chapter, verse: v.verse }, range)) out.push(v);
    }
  }
  return out;
}

async function esvChapterCached(bookId: string, chapter: number): Promise<Verse[]> {
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
  const fetched = await fetchEsvChapter(bookId, chapter);
  if (fetched.length > 0 && mayPersistText('esv')) {
    await db.insert(tables.verses).values(fetched).onConflictDoNothing();
  }
  return fetched;
}
