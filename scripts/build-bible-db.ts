/**
 * Compiles bundled public-domain translations into assets/bibles/web.db.
 *
 * Source: the `world-english-bible` npm package (WEB is public domain).
 * Run with: npm run build:bible
 *
 * The output schema matches docs/02-architecture.md §4:
 *   verses(translationId, bookId, chapter, verse, text)
 */
import Database from 'better-sqlite3';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BOOKS } from '../src/services/bible/canon';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, 'assets', 'bibles', 'web.db');

type WebItem = {
  type: string;
  chapterNumber?: number;
  verseNumber?: number;
  sectionNumber?: number;
  value?: string;
};

function buildWeb(db: Database.Database) {
  const insert = db.prepare(
    'INSERT INTO verses (translationId, bookId, chapter, verse, text) VALUES (?, ?, ?, ?, ?)'
  );
  let total = 0;

  for (const book of BOOKS) {
    const file = join(root, 'node_modules', 'world-english-bible', 'json', `${book.webSlug}.json`);
    const items: WebItem[] = JSON.parse(readFileSync(file, 'utf8'));

    // Verse text arrives split into pieces ('paragraph text' / 'line text')
    // in document order; join pieces per (chapter, verse).
    const verseText = new Map<string, string[]>();
    for (const item of items) {
      if (item.type !== 'paragraph text' && item.type !== 'line text') continue;
      if (!item.chapterNumber || !item.verseNumber || !item.value) continue;
      const key = `${item.chapterNumber}:${item.verseNumber}`;
      const pieces = verseText.get(key) ?? [];
      pieces.push(item.value);
      verseText.set(key, pieces);
    }

    const insertBook = db.transaction(() => {
      for (const [key, pieces] of verseText) {
        const [chapter, verse] = key.split(':').map(Number);
        const text = pieces.join(' ').replace(/\s+/g, ' ').trim();
        if (!text) continue;
        insert.run('web', book.id, chapter, verse, text);
        total += 1;
      }
    });
    insertBook();

    const maxChapter = db
      .prepare('SELECT MAX(chapter) AS c FROM verses WHERE translationId = ? AND bookId = ?')
      .get('web', book.id) as { c: number };
    if (maxChapter.c !== book.chapters) {
      throw new Error(
        `${book.name}: expected ${book.chapters} chapters, got ${maxChapter.c} — source data or canon table is wrong`
      );
    }
  }
  return total;
}

function main() {
  mkdirSync(dirname(outPath), { recursive: true });
  rmSync(outPath, { force: true });

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
  db.prepare('INSERT INTO translations VALUES (?, ?, ?, ?, ?, ?)').run(
    'web',
    'WEB',
    'World English Bible',
    'en-US',
    'public_domain',
    'bundled'
  );

  const total = buildWeb(db);

  // Sanity checks: canonical verse count and a known verse.
  if (total < 31000 || total > 31200) {
    throw new Error(`WEB verse count ${total} outside expected range`);
  }
  const john316 = db
    .prepare("SELECT text FROM verses WHERE translationId='web' AND bookId='John' AND chapter=3 AND verse=16")
    .get() as { text: string } | undefined;
  if (!john316 || !/loved the world/.test(john316.text)) {
    throw new Error('John 3:16 sanity check failed');
  }

  db.exec('VACUUM;');
  db.close();
  console.log(`Built ${outPath}: ${total} WEB verses. John 3:16 → "${john316.text}"`);
}

main();
