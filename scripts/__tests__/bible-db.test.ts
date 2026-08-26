/**
 * Validates the built bundled-translation database (assets/bibles/web.db).
 * Run `npm run build:bible` first; CI builds it before testing.
 */
import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { BOOKS } from '@/services/bible/canon';

const dbPath = join(__dirname, '..', '..', 'assets', 'bibles', 'web.db');

describe.skipIf(!existsSync(dbPath))('bundled WEB database', () => {
  const db = new Database(dbPath, { readonly: true });

  it('answers the M0 acceptance query for John 3:16', () => {
    const row = db
      .prepare(
        "SELECT text FROM verses WHERE translationId='web' AND bookId='John' AND chapter=3 AND verse=16"
      )
      .get() as { text: string };
    expect(row.text).toBe(
      'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.'
    );
  });

  it('contains all 66 books with correct chapter counts', () => {
    const rows = db
      .prepare(
        "SELECT bookId, MAX(chapter) AS chapters FROM verses WHERE translationId='web' GROUP BY bookId"
      )
      .all() as { bookId: string; chapters: number }[];
    const byId = new Map(rows.map((r) => [r.bookId, r.chapters]));
    expect(byId.size).toBe(66);
    for (const book of BOOKS) {
      expect(byId.get(book.id), book.id).toBe(book.chapters);
    }
  });

  it('has a plausible whole-Bible verse count', () => {
    const { n } = db.prepare('SELECT COUNT(*) AS n FROM verses').get() as { n: number };
    expect(n).toBeGreaterThan(31000);
    expect(n).toBeLessThan(31200);
  });

  it('registers WEB as public-domain and bundled', () => {
    const row = db.prepare("SELECT * FROM translations WHERE id='web'").get() as Record<
      string,
      unknown
    >;
    expect(row.licenseType).toBe('public_domain');
    expect(row.source).toBe('bundled');
  });
});
