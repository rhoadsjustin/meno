/**
 * Compiles the bundled public-domain translations (WEB, KJV, ASV) into
 * assets/bibles/bundled.db. Run with: npm run build:bible
 *
 * Sources:
 *  - WEB: the `world-english-bible` npm package (dev dependency).
 *  - KJV/ASV: scrollmapper/bible_databases JSON, pinned to a commit SHA and
 *    cached under node_modules/.cache/bible-src/.
 *
 * Output schema matches docs/02-architecture.md §4:
 *   translations(id, abbrev, name, languageCode, licenseType, source)
 *   verses(translationId, bookId, chapter, verse, text)
 */
import Database from 'better-sqlite3';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BOOKS } from '../src/services/bible/canon';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, 'assets', 'bibles', 'bundled.db');
const cacheDir = join(root, 'node_modules', '.cache', 'bible-src');

/** Pinned scrollmapper/bible_databases commit (KJV 1769, ASV). */
const SCROLLMAPPER_SHA = 'e1b254cef86d0e65b1a5d1a94b8b112d0f296a2c';

type WebItem = {
  type: string;
  chapterNumber?: number;
  verseNumber?: number;
  sectionNumber?: number;
  value?: string;
};

type ScrollmapperDoc = {
  translation: string;
  books: {
    name: string;
    chapters: { chapter: number; verses: { verse: number; text: string }[] }[];
  }[];
};

function insertVerses(
  db: Database.Database,
  translationId: string,
  rows: { bookId: string; chapter: number; verse: number; text: string }[]
) {
  const insert = db.prepare(
    'INSERT INTO verses (translationId, bookId, chapter, verse, text) VALUES (?, ?, ?, ?, ?)'
  );
  const run = db.transaction(() => {
    for (const r of rows) insert.run(translationId, r.bookId, r.chapter, r.verse, r.text);
  });
  run();
  return rows.length;
}

function checkChapterCounts(db: Database.Database, translationId: string) {
  for (const book of BOOKS) {
    const maxChapter = db
      .prepare('SELECT MAX(chapter) AS c FROM verses WHERE translationId = ? AND bookId = ?')
      .get(translationId, book.id) as { c: number };
    if (maxChapter.c !== book.chapters) {
      throw new Error(
        `${translationId}/${book.name}: expected ${book.chapters} chapters, got ${maxChapter.c}`
      );
    }
  }
}

function buildWeb(db: Database.Database): number {
  const rows: { bookId: string; chapter: number; verse: number; text: string }[] = [];
  for (const book of BOOKS) {
    const file = join(root, 'node_modules', 'world-english-bible', 'json', `${book.webSlug}.json`);
    const items: WebItem[] = JSON.parse(readFileSync(file, 'utf8'));
    const verseText = new Map<string, string[]>();
    for (const item of items) {
      if (item.type !== 'paragraph text' && item.type !== 'line text') continue;
      if (!item.chapterNumber || !item.verseNumber || !item.value) continue;
      const key = `${item.chapterNumber}:${item.verseNumber}`;
      const pieces = verseText.get(key) ?? [];
      pieces.push(item.value);
      verseText.set(key, pieces);
    }
    for (const [key, pieces] of verseText) {
      const [chapter, verse] = key.split(':').map(Number);
      const text = pieces.join(' ').replace(/\s+/g, ' ').trim();
      if (text) rows.push({ bookId: book.id, chapter, verse, text });
    }
  }
  const n = insertVerses(db, 'web', rows);
  checkChapterCounts(db, 'web');
  return n;
}

function fetchScrollmapper(abbrev: 'KJV' | 'ASV'): ScrollmapperDoc {
  mkdirSync(cacheDir, { recursive: true });
  const file = join(cacheDir, `${abbrev}-${SCROLLMAPPER_SHA.slice(0, 12)}.json`);
  if (!existsSync(file)) {
    const url = `https://raw.githubusercontent.com/scrollmapper/bible_databases/${SCROLLMAPPER_SHA}/formats/json/${abbrev}.json`;
    console.log(`Downloading ${abbrev} from scrollmapper@${SCROLLMAPPER_SHA.slice(0, 12)}…`);
    execFileSync('curl', ['-sL', '--fail', '-o', file, url], { stdio: 'inherit' });
  }
  return JSON.parse(readFileSync(file, 'utf8'));
}

function buildScrollmapper(db: Database.Database, translationId: string, abbrev: 'KJV' | 'ASV'): number {
  const doc = fetchScrollmapper(abbrev);
  if (doc.books.length !== 66) {
    throw new Error(`${abbrev}: expected 66 books, got ${doc.books.length}`);
  }
  const rows: { bookId: string; chapter: number; verse: number; text: string }[] = [];
  // Books arrive in canonical order — map to OSIS ids by index.
  doc.books.forEach((book, i) => {
    const bookId = BOOKS[i].id;
    for (const chapter of book.chapters) {
      for (const v of chapter.verses) {
        const text = v.text.replace(/\s+/g, ' ').trim();
        if (text) rows.push({ bookId, chapter: chapter.chapter, verse: v.verse, text });
      }
    }
  });
  const n = insertVerses(db, translationId, rows);
  checkChapterCounts(db, translationId);
  return n;
}

function main() {
  mkdirSync(dirname(outPath), { recursive: true });
  rmSync(outPath, { force: true });
  // Remove the pre-rename artifact so stale copies don't ship.
  rmSync(join(root, 'assets', 'bibles', 'web.db'), { force: true });

  const db = new Database(outPath);
  db.pragma('journal_mode = OFF');
  db.exec(`
    CREATE TABLE translations (
      id TEXT PRIMARY KEY,
      abbrev TEXT NOT NULL,
      name TEXT NOT NULL,
      languageCode TEXT NOT NULL,
      licenseType TEXT NOT NULL,
      source TEXT NOT NULL
    );
    CREATE TABLE verses (
      translationId TEXT NOT NULL,
      bookId TEXT NOT NULL,
      chapter INTEGER NOT NULL,
      verse INTEGER NOT NULL,
      text TEXT NOT NULL,
      PRIMARY KEY (translationId, bookId, chapter, verse)
    );
  `);
  const insertTranslation = db.prepare('INSERT INTO translations VALUES (?, ?, ?, ?, ?, ?)');
  insertTranslation.run('web', 'WEB', 'World English Bible', 'en-US', 'public_domain', 'bundled');
  insertTranslation.run('kjv', 'KJV', 'King James Version', 'en-GB', 'public_domain', 'bundled');
  insertTranslation.run('asv', 'ASV', 'American Standard Version', 'en-US', 'public_domain', 'bundled');

  const counts = {
    web: buildWeb(db),
    kjv: buildScrollmapper(db, 'kjv', 'KJV'),
    asv: buildScrollmapper(db, 'asv', 'ASV'),
  };

  for (const [id, n] of Object.entries(counts)) {
    if (n < 31000 || n > 31200) throw new Error(`${id} verse count ${n} outside expected range`);
  }
  const john316 = db
    .prepare("SELECT text FROM verses WHERE translationId='web' AND bookId='John' AND chapter=3 AND verse=16")
    .get() as { text: string } | undefined;
  if (!john316 || !/loved the world/.test(john316.text)) {
    throw new Error('John 3:16 sanity check failed');
  }
  const kjvPs23 = db
    .prepare("SELECT text FROM verses WHERE translationId='kjv' AND bookId='Ps' AND chapter=23 AND verse=1")
    .get() as { text: string } | undefined;
  if (!kjvPs23 || !/shepherd/.test(kjvPs23.text)) {
    throw new Error('KJV Psalm 23:1 sanity check failed');
  }

  db.exec('VACUUM;');
  db.close();
  console.log(`Built ${outPath}: web=${counts.web} kjv=${counts.kjv} asv=${counts.asv} verses.`);
}

main();
