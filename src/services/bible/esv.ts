/**
 * ESV via the Crossway ESV API (docs/02 §5, docs/00-decisions.md #4).
 *
 * License rules enforced here: cache only verses the user explicitly added
 * to goals (`licenseType='api_cached'`), purge on goal deletion, attribute
 * everywhere. The free key is non-commercial; the app is free (decision #3).
 *
 * The key lives in .env as EXPO_PUBLIC_ESV_API_KEY (never committed).
 */
import type { Ref, Verse } from '@/services/bible/types';
import { getBook } from '@/services/bible/canon';

const API_BASE = 'https://api.esv.org/v3/passage/text/';

export function esvKeyConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_ESV_API_KEY);
}

/**
 * Splits an ESV API passage (include-verse-numbers=true) into verses.
 * Markers look like `[16]`; leading chapter markers render as `[16:1]`? No —
 * with passage-references off and first-verse-numbers on, every verse is
 * `[n]`. Pure so tests can cover it offline.
 */
export function parseEsvPassage(passage: string, bookId: string, chapter: number): Verse[] {
  const verses: Verse[] = [];
  const re = /\[(\d+)\]\s*/g;
  let match: RegExpExecArray | null;
  let lastVerse: number | null = null;
  let lastIndex = 0;
  while ((match = re.exec(passage)) !== null) {
    if (lastVerse !== null) {
      const text = passage.slice(lastIndex, match.index).replace(/\s+/g, ' ').trim();
      if (text) {
        verses.push({ translationId: 'esv', bookId, chapter, verse: lastVerse, text });
      }
    }
    lastVerse = Number(match[1]);
    lastIndex = re.lastIndex;
  }
  if (lastVerse !== null) {
    const text = passage.slice(lastIndex).replace(/\s+/g, ' ').trim();
    if (text) verses.push({ translationId: 'esv', bookId, chapter, verse: lastVerse, text });
  }
  return verses;
}

/** Fetches one whole chapter from the ESV API (well under the 500-verse
 * per-query limit). Throws offline or on HTTP errors. */
export async function fetchEsvChapter(bookId: string, chapter: number): Promise<Verse[]> {
  const key = process.env.EXPO_PUBLIC_ESV_API_KEY;
  if (!key) throw new Error('ESV API key not configured');
  const book = getBook(bookId);
  const params = new URLSearchParams({
    q: `${book.name} ${chapter}`,
    'include-passage-references': 'false',
    'include-verse-numbers': 'true',
    'include-first-verse-numbers': 'true',
    'include-footnotes': 'false',
    'include-headings': 'false',
    'include-short-copyright': 'false',
    'include-selahs': 'true',
    'indent-poetry': 'false',
    'indent-paragraphs': '0',
  });
  const res = await fetch(`${API_BASE}?${params}`, {
    headers: { Authorization: `Token ${key}` },
  });
  if (!res.ok) {
    throw new Error(`ESV API error ${res.status}${res.status === 401 ? ' — check your API key' : ''}`);
  }
  const json = (await res.json()) as { passages?: string[] };
  const passage = json.passages?.[0];
  if (!passage) throw new Error(`ESV API returned no text for ${book.name} ${chapter}`);
  return parseEsvPassage(passage, bookId, chapter);
}

/** Refs covered by a single-book inclusive range, chapter by chapter. */
export function chaptersInRange(start: Ref, end: Ref): number[] {
  const chapters: number[] = [];
  for (let c = start.chapter; c <= end.chapter; c++) chapters.push(c);
  return chapters;
}
