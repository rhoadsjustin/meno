import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { getBook, isValidBookId } from '@/services/bible/canon';
import { compareRefs, formatRange } from '@/services/bible/refs';
import { TRANSLATIONS } from '@/services/bible/registry';
import {
  trimUnbalancedQuotes,
  DEFAULT_STARTER,
  resolveStarterPassages,
  STARTER_FALLBACK_TRANSLATION_ID,
  STARTER_TRANSLATION_ID,
  STARTER_VERSES,
} from '@/services/bible/starters';
import type { RefRange, Verse } from '@/services/bible/types';

const dbPath = join(__dirname, '..', '..', '..', '..', 'assets', 'bibles', 'bundled.db');

describe('starter verses', () => {
  it('is a small set led by John 3:16', () => {
    expect(STARTER_VERSES).toHaveLength(8);
    expect(formatRange(DEFAULT_STARTER.range)).toBe('John 3:16');
    expect(new Set(STARTER_VERSES.map((s) => s.id)).size).toBe(STARTER_VERSES.length);
  });

  it('uses canonical refs: known books, real chapters, short single-chapter ranges', () => {
    for (const { range } of STARTER_VERSES) {
      expect(isValidBookId(range.start.bookId)).toBe(true);
      expect(range.end.bookId).toBe(range.start.bookId);
      expect(range.end.chapter).toBe(range.start.chapter);
      expect(range.start.chapter).toBeLessThanOrEqual(getBook(range.start.bookId).chapters);
      expect(compareRefs(range.start, range.end)).toBeLessThanOrEqual(0);
      expect(range.end.verse - range.start.verse).toBeLessThan(3);
    }
  });

  it('prefers a licensed translation and falls back to a bundled one', () => {
    const byId = new Map(TRANSLATIONS.map((t) => [t.id, t]));
    expect(byId.get(STARTER_TRANSLATION_ID)?.source).toBe('esv_api');
    expect(byId.get(STARTER_FALLBACK_TRANSLATION_ID)?.source).toBe('bundled');
  });
});

describe.skipIf(!existsSync(dbPath))('starter verses in the bundled translations', () => {
  const db = new Database(dbPath, { readonly: true });
  const bundled = TRANSLATIONS.filter((t) => t.source === 'bundled');

  it('resolves every starter to real text in every bundled translation', () => {
    const query = db.prepare(
      `SELECT COUNT(*) AS n, MIN(LENGTH(text)) AS shortest FROM verses
       WHERE translationId = ? AND bookId = ? AND chapter = ? AND verse BETWEEN ? AND ?`
    );
    for (const t of bundled) {
      for (const { id, range } of STARTER_VERSES) {
        const row = query.get(
          t.id,
          range.start.bookId,
          range.start.chapter,
          range.start.verse,
          range.end.verse
        ) as { n: number; shortest: number | null };
        expect(row.n, `${id} in ${t.abbrev}`).toBe(range.end.verse - range.start.verse + 1);
        expect(row.shortest, `${id} in ${t.abbrev}`).toBeGreaterThan(10);
      }
    }
  });
});

describe('resolveStarterPassages', () => {
  const verse = (translationId: string, range: RefRange): Verse[] => [
    { ...range.start, translationId, text: `${translationId} text` },
  ];
  const starters = STARTER_VERSES.slice(0, 3);

  it('uses the preferred translation when every read succeeds', async () => {
    const read = vi.fn(async (id: string, range: RefRange) => verse(id, range));
    const out = await resolveStarterPassages(starters, { preferredAvailable: true, read });
    expect(out.map((p) => p.translationId)).toEqual(['esv', 'esv', 'esv']);
    expect(out.map((p) => p.starter)).toEqual(starters);
    expect(read).toHaveBeenCalledTimes(3);
  });

  it('never touches the preferred translation when it is unavailable', async () => {
    const read = vi.fn(async (id: string, range: RefRange) => verse(id, range));
    const out = await resolveStarterPassages(starters, { preferredAvailable: false, read });
    expect(out.map((p) => p.translationId)).toEqual(['kjv', 'kjv', 'kjv']);
    expect(read.mock.calls.every(([id]) => id === 'kjv')).toBe(true);
  });

  it('falls back as a whole set when one preferred read fails (offline)', async () => {
    const read = vi.fn(async (id: string, range: RefRange) => {
      if (id === 'esv' && range.start.bookId === 'Ps') throw new Error('Network request failed');
      return verse(id, range);
    });
    const out = await resolveStarterPassages(starters, { preferredAvailable: true, read });
    expect(out.map((p) => p.translationId)).toEqual(['kjv', 'kjv', 'kjv']);
  });

  it('falls back when the preferred translation returns no verses', async () => {
    const read = async (id: string, range: RefRange) => (id === 'esv' ? [] : verse(id, range));
    const out = await resolveStarterPassages(starters, { preferredAvailable: true, read });
    expect(out.map((p) => p.translationId)).toEqual(['kjv', 'kjv', 'kjv']);
  });

  it('falls back when the preferred translation is too slow', async () => {
    const read = (id: string, range: RefRange) =>
      id === 'esv' ? new Promise<Verse[]>(() => {}) : Promise.resolve(verse(id, range));
    const out = await resolveStarterPassages(starters, {
      preferredAvailable: true,
      read,
      timeoutMs: 5,
    });
    expect(out.map((p) => p.translationId)).toEqual(['kjv', 'kjv', 'kjv']);
  });

  it('rejects only if the bundled fallback itself cannot be read', async () => {
    const read = async () => {
      throw new Error('database unavailable');
    };
    await expect(
      resolveStarterPassages(starters, { preferredAvailable: true, read })
    ).rejects.toThrow('database unavailable');
  });
});

describe('trimUnbalancedQuotes', () => {
  it('drops an opening quotation the verse never closes', () => {
    expect(trimUnbalancedQuotes('“For God so loved the world.')).toBe('For God so loved the world.');
  });

  it('drops a closing quotation the verse never opened', () => {
    expect(trimUnbalancedQuotes('wherever you go.”')).toBe('wherever you go.');
  });

  it('leaves balanced quotations, inner marks and apostrophes alone', () => {
    const balanced = 'He said, “Follow me,” and they followed.';
    expect(trimUnbalancedQuotes(balanced)).toBe(balanced);
    expect(trimUnbalancedQuotes('“Come to me.”')).toBe('“Come to me.”');
    expect(trimUnbalancedQuotes('The LORD’s shepherd')).toBe('The LORD’s shepherd');
  });

  it('handles a straight double quote at either edge', () => {
    expect(trimUnbalancedQuotes('"For God so loved')).toBe('For God so loved');
    expect(trimUnbalancedQuotes('you go."')).toBe('you go.');
  });
});
