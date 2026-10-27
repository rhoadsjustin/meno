import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';

import {
  chapterSlice,
  coveredByRetained,
  PURGE_UNREFERENCED_SQL,
  retainedOnly,
  retainedRangesOf,
  type RangeRow,
} from '@/services/bible/retention';
import type { RefRange } from '@/services/bible/types';

const range = (bookId: string, sc: number, sv: number, ec: number, ev: number): RefRange => ({
  start: { bookId, chapter: sc, verse: sv },
  end: { bookId, chapter: ec, verse: ev },
});

const row = (r: RefRange, status: string): RangeRow & { status: string } => ({
  startBookId: r.start.bookId,
  startChapter: r.start.chapter,
  startVerse: r.start.verse,
  endBookId: r.end.bookId,
  endChapter: r.end.chapter,
  endVerse: r.end.verse,
  status,
});

describe('retainedRangesOf', () => {
  const goalRange = range('Rom', 8, 1, 8, 39);
  const chunks = [
    row(range('Rom', 8, 1, 8, 4), 'memorized'),
    row(range('Rom', 8, 5, 8, 8), 'learning'),
    row(range('Rom', 8, 9, 8, 11), 'memorized'),
    row(range('Rom', 8, 12, 8, 39), 'locked'),
  ];

  it('keeps the whole range of a goal still practiced or reviewed', () => {
    expect(retainedRangesOf(row(goalRange, 'active'), chunks)).toEqual([goalRange]);
    expect(retainedRangesOf(row(goalRange, 'completed'), chunks)).toEqual([goalRange]);
  });

  it('keeps only the memorized chunks of a stopped goal', () => {
    expect(retainedRangesOf(row(goalRange, 'stopped'), chunks)).toEqual([
      range('Rom', 8, 1, 8, 4),
      range('Rom', 8, 9, 8, 11),
    ]);
  });

  it('keeps nothing for an archived goal', () => {
    expect(retainedRangesOf(row(goalRange, 'archived'), chunks)).toEqual([]);
  });

  it('lets a stopped goal cover a review of one of its chunks, but not the gap between them', () => {
    const kept = retainedRangesOf(row(goalRange, 'stopped'), chunks);
    expect(coveredByRetained(range('Rom', 8, 9, 8, 11), kept)).toBe(true);
    expect(coveredByRetained(range('Rom', 8, 5, 8, 8), kept)).toBe(false);
    expect(coveredByRetained(range('Rom', 8, 1, 8, 11), kept)).toBe(false);
  });
});

describe('chapterSlice', () => {
  it('clips a multi-chapter range to each chapter', () => {
    const r = range('John', 3, 16, 5, 4);
    expect(chapterSlice(r, 3)).toEqual(range('John', 3, 16, 3, Number.MAX_SAFE_INTEGER));
    expect(chapterSlice(r, 4)).toEqual(range('John', 4, 1, 4, Number.MAX_SAFE_INTEGER));
    expect(chapterSlice(r, 5)).toEqual(range('John', 5, 1, 5, 4));
  });

  it('leaves a single-chapter range as it is', () => {
    const r = range('John', 3, 16, 3, 18);
    expect(chapterSlice(r, 3)).toEqual(r);
  });
});

describe('coveredByRetained', () => {
  const goals = [range('John', 3, 16, 3, 18), range('Rom', 8, 1, 9, 5)];

  it('covers a goal and anything inside it', () => {
    expect(coveredByRetained(range('John', 3, 16, 3, 18), goals)).toBe(true);
    expect(coveredByRetained(range('John', 3, 17, 3, 17), goals)).toBe(true);
    expect(coveredByRetained(chapterSlice(goals[1], 8), goals)).toBe(true);
  });

  it('does not cover a whole-chapter read around a goal, or a different book', () => {
    expect(coveredByRetained(range('John', 3, 1, 3, 999), goals)).toBe(false);
    expect(coveredByRetained(range('John', 3, 18, 3, 19), goals)).toBe(false);
    expect(coveredByRetained(range('Rom', 9, 1, 9, 999), goals)).toBe(false);
    expect(coveredByRetained(range('Gen', 3, 16, 3, 18), goals)).toBe(false);
    expect(coveredByRetained(range('John', 3, 16, 3, 18), [])).toBe(false);
  });

  it('does not stitch two adjacent goals into one cover', () => {
    const adjacent = [range('John', 3, 16, 3, 17), range('John', 3, 18, 3, 19)];
    expect(coveredByRetained(range('John', 3, 16, 3, 19), adjacent)).toBe(false);
  });
});

describe('retainedOnly', () => {
  it('keeps just the verses a goal covers out of a fetched chapter', () => {
    const chapter = Array.from({ length: 36 }, (_, i) => ({
      bookId: 'John',
      chapter: 3,
      verse: i + 1,
    }));
    const kept = retainedOnly(chapter, [range('John', 3, 16, 3, 18), range('John', 3, 30, 4, 2)]);
    expect(kept.map((v) => v.verse)).toEqual([16, 17, 18, 30, 31, 32, 33, 34, 35, 36]);
  });
});

describe('PURGE_UNREFERENCED_SQL', () => {
  function setup() {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE verses (translationId TEXT, bookId TEXT, chapter INTEGER, verse INTEGER, text TEXT,
        PRIMARY KEY (translationId, bookId, chapter, verse));
      CREATE TABLE goals (id TEXT PRIMARY KEY, translationId TEXT, startBookId TEXT, startChapter INTEGER,
        startVerse INTEGER, endBookId TEXT, endChapter INTEGER, endVerse INTEGER, status TEXT);
      CREATE TABLE chunks (id TEXT PRIMARY KEY, goalId TEXT, startBookId TEXT, startChapter INTEGER,
        startVerse INTEGER, endBookId TEXT, endChapter INTEGER, endVerse INTEGER, status TEXT);
    `);
    const addVerse = db.prepare("INSERT INTO verses VALUES ('esv', ?, ?, ?, 'text')");
    const addGoal = db.prepare('INSERT INTO goals VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const addChunk = db.prepare('INSERT INTO chunks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    return {
      db,
      cacheChapter(bookId: string, chapter: number, verses: number) {
        for (let v = 1; v <= verses; v++) addVerse.run(bookId, chapter, v);
      },
      goal(id: string, r: RefRange, status = 'active', translationId = 'esv') {
        addGoal.run(
          id,
          translationId,
          r.start.bookId,
          r.start.chapter,
          r.start.verse,
          r.end.bookId,
          r.end.chapter,
          r.end.verse,
          status,
        );
      },
      chunk(id: string, goalId: string, r: RefRange, status: string) {
        addChunk.run(
          id,
          goalId,
          r.start.bookId,
          r.start.chapter,
          r.start.verse,
          r.end.bookId,
          r.end.chapter,
          r.end.verse,
          status,
        );
      },
      purge: () => db.exec(PURGE_UNREFERENCED_SQL),
      cached: (bookId: string, chapter: number) =>
        (
          db
            .prepare('SELECT verse FROM verses WHERE bookId = ? AND chapter = ? ORDER BY verse')
            .all(bookId, chapter) as { verse: number }[]
        ).map((r) => r.verse),
    };
  }

  it('trims a cached chapter down to the goal inside it', () => {
    const t = setup();
    t.cacheChapter('John', 3, 36);
    t.goal('g1', range('John', 3, 16, 3, 18));
    t.purge();
    expect(t.cached('John', 3)).toEqual([16, 17, 18]);
  });

  it('removes chapters that were only browsed', () => {
    const t = setup();
    t.cacheChapter('Ps', 23, 6);
    t.cacheChapter('John', 3, 36);
    t.goal('g1', range('John', 3, 16, 3, 16));
    t.purge();
    expect(t.cached('Ps', 23)).toEqual([]);
    expect(t.cached('John', 3)).toEqual([16]);
  });

  it('removes everything once the last goal is gone', () => {
    const t = setup();
    t.cacheChapter('John', 3, 36);
    t.goal('g1', range('John', 3, 16, 3, 18));
    t.db.exec("DELETE FROM goals WHERE id = 'g1'");
    t.purge();
    expect(t.cached('John', 3)).toEqual([]);
  });

  it('keeps verses another goal still covers when one of two is deleted', () => {
    const t = setup();
    t.cacheChapter('John', 3, 36);
    t.goal('g1', range('John', 3, 14, 3, 17));
    t.goal('g2', range('John', 3, 16, 3, 18));
    t.db.exec("DELETE FROM goals WHERE id = 'g1'");
    t.purge();
    expect(t.cached('John', 3)).toEqual([16, 17, 18]);
  });

  it('handles a goal spanning chapters', () => {
    const t = setup();
    t.cacheChapter('Rom', 7, 25);
    t.cacheChapter('Rom', 8, 39);
    t.cacheChapter('Rom', 9, 33);
    t.cacheChapter('Rom', 10, 21);
    t.goal('g1', range('Rom', 7, 24, 9, 2));
    t.purge();
    expect(t.cached('Rom', 7)).toEqual([24, 25]);
    expect(t.cached('Rom', 8)).toHaveLength(39);
    expect(t.cached('Rom', 9)).toEqual([1, 2]);
    expect(t.cached('Rom', 10)).toEqual([]);
  });

  it('keeps text for completed goals and drops it for archived ones', () => {
    const t = setup();
    t.cacheChapter('John', 3, 36);
    t.cacheChapter('Ps', 23, 6);
    t.goal('done', range('John', 3, 16, 3, 16), 'completed');
    t.goal('old', range('Ps', 23, 1, 23, 6), 'archived');
    t.purge();
    expect(t.cached('John', 3)).toEqual([16]);
    expect(t.cached('Ps', 23)).toEqual([]);
  });

  it('trims a stopped goal to its memorized chunks', () => {
    const t = setup();
    t.cacheChapter('Ps', 119, 176);
    t.goal('g1', range('Ps', 119, 1, 119, 16), 'stopped');
    t.chunk('c1', 'g1', range('Ps', 119, 1, 119, 3), 'memorized');
    t.chunk('c3', 'g1', range('Ps', 119, 7, 119, 8), 'memorized');
    t.purge();
    expect(t.cached('Ps', 119)).toEqual([1, 2, 3, 7, 8]);
  });

  it('drops verses of a stopped goal’s chunks left unmemorized by an interrupted stop', () => {
    const t = setup();
    t.cacheChapter('Ps', 119, 176);
    t.goal('g1', range('Ps', 119, 1, 119, 8), 'stopped');
    t.chunk('c1', 'g1', range('Ps', 119, 1, 119, 3), 'memorized');
    t.chunk('c2', 'g1', range('Ps', 119, 4, 119, 6), 'learning');
    t.purge();
    expect(t.cached('Ps', 119)).toEqual([1, 2, 3]);
  });

  it('keeps a stopped goal’s dropped verses that another goal still covers', () => {
    const t = setup();
    t.cacheChapter('John', 3, 36);
    t.goal('stopped', range('John', 3, 14, 3, 21), 'stopped');
    t.chunk('c1', 'stopped', range('John', 3, 14, 3, 15), 'memorized');
    t.goal('again', range('John', 3, 16, 3, 18), 'active');
    t.purge();
    expect(t.cached('John', 3)).toEqual([14, 15, 16, 17, 18]);
  });

  it('only looks at chunks through their goal: status, translation and book must match', () => {
    const t = setup();
    t.cacheChapter('John', 3, 36);
    // A memorized chunk of an active goal is inside the goal range anyway.
    t.goal('active', range('John', 3, 1, 3, 2), 'active');
    t.chunk('a1', 'active', range('John', 3, 1, 3, 2), 'memorized');
    // An archived goal's memorized chunks keep nothing.
    t.goal('archived', range('John', 3, 10, 3, 12), 'archived');
    t.chunk('x1', 'archived', range('John', 3, 10, 3, 12), 'memorized');
    // A stopped goal in another translation keeps nothing of the ESV rows.
    t.goal('kjv', range('John', 3, 20, 3, 21), 'stopped', 'kjv');
    t.chunk('k1', 'kjv', range('John', 3, 20, 3, 21), 'memorized');
    // A chunk whose goal is gone keeps nothing.
    t.chunk('o1', 'gone', range('John', 3, 30, 3, 30), 'memorized');
    t.purge();
    expect(t.cached('John', 3)).toEqual([1, 2]);
  });

  it('ignores goals in another translation or another book', () => {
    const t = setup();
    t.cacheChapter('John', 3, 36);
    t.goal('kjv', range('John', 3, 16, 3, 18), 'active', 'kjv');
    t.goal('other', range('Gen', 3, 1, 3, 24));
    t.purge();
    expect(t.cached('John', 3)).toEqual([]);
  });
});
