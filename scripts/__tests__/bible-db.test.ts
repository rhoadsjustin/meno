/**
 * Validates the built bundled-translation database (assets/bibles/bundled.db).
 * Run `npm run build:bible` first; CI builds it before testing.
 */
import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { BOOKS } from '@/services/bible/canon';

const dbPath = join(__dirname, '..', '..', 'assets', 'bibles', 'bundled.db');

describe.skipIf(!existsSync(dbPath))('bundled translations database', () => {
  const db = new Database(dbPath, { readonly: true });

  it('answers the M0 acceptance query for John 3:16 (WEB)', () => {
    const row = db
      .prepare(
        "SELECT text FROM verses WHERE translationId='web' AND bookId='John' AND chapter=3 AND verse=16"
      )
      .get() as { text: string };
    expect(row.text).toBe(
      'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.'
    );
  });

  it('serves KJV and ASV with distinctive renderings', () => {
    const kjv = db
      .prepare(
        "SELECT text FROM verses WHERE translationId='kjv' AND bookId='John' AND chapter=3 AND verse=16"
      )
      .get() as { text: string };
    expect(kjv.text).toContain('only begotten Son');
    expect(kjv.text).toContain('whosoever believeth');
    const asv = db
      .prepare(
        "SELECT text FROM verses WHERE translationId='asv' AND bookId='Ps' AND chapter=23 AND verse=1"
      )
      .get() as { text: string };
    expect(asv.text).toContain('Jehovah is my shepherd');
  });

  for (const id of ['web', 'kjv', 'asv']) {
    it(`contains all 66 books with correct chapter counts (${id})`, () => {
      const rows = db
        .prepare(
          'SELECT bookId, MAX(chapter) AS chapters FROM verses WHERE translationId=? GROUP BY bookId'
        )
        .all(id) as { bookId: string; chapters: number }[];
      const byId = new Map(rows.map((r) => [r.bookId, r.chapters]));
      expect(byId.size).toBe(66);
      for (const book of BOOKS) {
        expect(byId.get(book.id), `${id}/${book.id}`).toBe(book.chapters);
      }
    });

    it(`has a plausible whole-Bible verse count (${id})`, () => {
      const { n } = db
        .prepare('SELECT COUNT(*) AS n FROM verses WHERE translationId=?')
        .get(id) as { n: number };
      expect(n).toBeGreaterThan(31000);
      expect(n).toBeLessThan(31200);
    });
  }

  it('registers all three as public-domain and bundled', () => {
    const rows = db.prepare('SELECT * FROM translations ORDER BY id').all() as Record<
      string,
      unknown
    >[];
    expect(rows.map((r) => r.id)).toEqual(['asv', 'kjv', 'web']);
    for (const r of rows) {
      expect(r.licenseType).toBe('public_domain');
      expect(r.source).toBe('bundled');
    }
  });
});
