/**
 * The one door to Scripture (docs/02-architecture.md §2.4).
 * Nothing outside services/bible reads translation data; licensing rules
 * from 02 §5 are enforced here, not in UI.
 */
import * as SQLite from 'expo-sqlite';

import { getBook } from '@/services/bible/canon';
import { compareRefs } from '@/services/bible/refs';
import { getTranslation } from '@/services/bible/registry';
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

/** Single verse text, e.g. for the Today hero card. */
export async function getVerse(translationId: string, ref: Ref): Promise<Verse> {
  const translation = requireReadable(translationId);
  const db = await openBundledDb();
  const row = await db.getFirstAsync<VerseRow>(
    'SELECT bookId, chapter, verse, text FROM verses WHERE translationId = ? AND bookId = ? AND chapter = ? AND verse = ?',
    translation.id,
    ref.bookId,
    ref.chapter,
    ref.verse
  );
  if (!row) {
    throw new Error(`Verse not found: ${ref.bookId} ${ref.chapter}:${ref.verse} (${translation.abbrev})`);
  }
  return { ...row, translationId: translation.id };
}

/** All verses in an inclusive range, in canonical order. */
export async function getPassage(translationId: string, range: RefRange): Promise<Verse[]> {
  const translation = requireReadable(translationId);
  if (compareRefs(range.start, range.end) > 0) {
    throw new Error('Passage range start is after end');
  }
  const db = await openBundledDb();
  // Ranges within a single book cover the overwhelming case (goals are
  // book-scoped in v1); cross-book ranges walk book by book.
  if (range.start.bookId !== range.end.bookId) {
    throw new Error('Cross-book passages are not supported yet');
  }
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

/** Number of verses in a chapter (goal wizard, chunking). */
export async function getChapterVerseCount(translationId: string, bookId: string, chapter: number): Promise<number> {
  const translation = requireReadable(translationId);
  const book = getBook(bookId);
  if (chapter < 1 || chapter > book.chapters) {
    throw new Error(`${book.name} has no chapter ${chapter}`);
  }
  const db = await openBundledDb();
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM verses WHERE translationId = ? AND bookId = ? AND chapter = ?',
    translation.id,
    bookId,
    chapter
  );
  return row?.n ?? 0;
}

function requireReadable(translationId: string): Translation {
  const translation = getTranslation(translationId);
  if (translation.source !== 'bundled') {
    // API-backed translations (ESV, API.Bible) arrive in M6 with their own
    // licensing-aware fetch/cache path.
    throw new Error(`Translation ${translation.abbrev} is not available offline yet`);
  }
  return translation;
}
