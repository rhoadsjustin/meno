import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { chunkPassage, MAX_VERSES, MAX_WORDS, MIN_WORDS } from '@/services/chunking';
import type { Verse } from '@/services/bible/types';

function verse(chapter: number, verseNo: number, words: number, opts?: { end?: boolean }): Verse {
  const text = Array.from({ length: words }, (_, i) => `w${i}`).join(' ') + (opts?.end === false ? ',' : '.');
  return { translationId: 'web', bookId: 'John', chapter, verse: verseNo, text };
}

describe('chunkPassage (synthetic)', () => {
  it('groups 2–4 verses within word limits', () => {
    const verses = Array.from({ length: 8 }, (_, i) => verse(1, i + 1, 12));
    const chunks = chunkPassage(verses);
    for (const c of chunks) {
      expect(c.verseCount).toBeLessThanOrEqual(MAX_VERSES);
      expect(c.wordCount).toBeLessThanOrEqual(MAX_WORDS + 10);
    }
    // coverage: chunks tile the passage in order with no gaps
    expect(chunks[0].start.verse).toBe(1);
    expect(chunks[chunks.length - 1].end.verse).toBe(8);
  });

  it('lets a long single verse stand alone', () => {
    const chunks = chunkPassage([verse(1, 1, 70), verse(1, 2, 10), verse(1, 3, 10)]);
    expect(chunks[0].verseCount).toBe(1);
    expect(chunks[0].wordCount).toBe(70);
  });

  it('never crosses chapter boundaries', () => {
    const verses = [verse(1, 50, 8), verse(1, 51, 8), verse(2, 1, 8), verse(2, 2, 8)];
    const chunks = chunkPassage(verses);
    for (const c of chunks) expect(c.start.chapter).toBe(c.end.chapter);
  });

  it('merges a trailing sliver into its predecessor', () => {
    const verses = [verse(1, 1, 20), verse(1, 2, 20), verse(1, 3, 6)];
    const chunks = chunkPassage(verses);
    expect(chunks[chunks.length - 1].wordCount).toBeGreaterThanOrEqual(MIN_WORDS);
  });

  it('produces stable ids from translation and range', () => {
    const chunks = chunkPassage([verse(3, 16, 20), verse(3, 17, 20)]);
    expect(chunks[0].id).toBe('web:John.3.16-John.3.17');
  });
});

const dbPath = join(__dirname, '..', '..', '..', '..', 'assets', 'bibles', 'bundled.db');

describe.skipIf(!existsSync(dbPath))('chunkPassage on real WEB text (M1 acceptance)', () => {
  const db = new Database(dbPath, { readonly: true });
  const rows = db
    .prepare(
      "SELECT bookId, chapter, verse, text FROM verses WHERE translationId='web' AND bookId='John' AND chapter <= 3 ORDER BY chapter, verse"
    )
    .all() as { bookId: string; chapter: number; verse: number; text: string }[];
  const verses: Verse[] = rows.map((r) => ({ ...r, translationId: 'web' }));

  it('is deterministic', () => {
    const a = chunkPassage(verses);
    const b = chunkPassage(verses);
    expect(a).toEqual(b);
  });

  it('is boundary-correct over John 1–3', () => {
    const chunks = chunkPassage(verses);
    // Tiles the passage exactly: starts at 1:1, ends at 3:36, contiguous.
    expect(chunks[0].start).toEqual({ bookId: 'John', chapter: 1, verse: 1 });
    expect(chunks[chunks.length - 1].end).toEqual({ bookId: 'John', chapter: 3, verse: 36 });
    for (let i = 1; i < chunks.length; i++) {
      const prev = chunks[i - 1].end;
      const cur = chunks[i].start;
      const contiguous =
        (cur.chapter === prev.chapter && cur.verse === prev.verse + 1) ||
        (cur.chapter === prev.chapter + 1 && cur.verse === 1);
      expect(contiguous, `gap between chunk ${i - 1} and ${i}`).toBe(true);
    }
    // No chunk crosses a chapter.
    for (const c of chunks) expect(c.start.chapter).toBe(c.end.chapter);
    // Sane sizes.
    for (const c of chunks) {
      expect(c.verseCount).toBeLessThanOrEqual(MAX_VERSES);
      if (c.verseCount > 1) expect(c.wordCount).toBeLessThanOrEqual(MAX_WORDS + 10);
    }
  });
});
