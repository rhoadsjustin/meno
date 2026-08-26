/**
 * Passage → chunks (docs/03-memory-engine.md §5). Pure and deterministic:
 * the same passage + translation always yields the same chunks, and chunk
 * ids are stable across reinstalls.
 *
 * Rules: target 2–4 verses per chunk, min 15 / max ~60 words; long single
 * verses stand alone; very short verses merge with neighbors; never cross
 * chapter boundaries; prefer breaking after sentence-final punctuation.
 */
import { refToOsis } from '@/services/bible/refs';
import type { Ref, Verse } from '@/services/bible/types';

export type ChunkPlan = {
  /** Stable id: `${translationId}:${startOsis}-${endOsis}`. */
  id: string;
  orderIndex: number;
  start: Ref;
  end: Ref;
  verseCount: number;
  wordCount: number;
};

export const MIN_WORDS = 15;
export const MAX_WORDS = 60;
export const MAX_VERSES = 4;

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function endsSentence(text: string): boolean {
  return /[.!?]["”’']*\s*$/.test(text);
}

type Acc = { verses: Verse[]; words: number };

export function chunkPassage(verses: Verse[]): ChunkPlan[] {
  if (verses.length === 0) return [];
  const translationId = verses[0].translationId;

  const chunks: Acc[] = [];
  let acc: Acc = { verses: [], words: 0 };

  const flush = () => {
    if (acc.verses.length > 0) chunks.push(acc);
    acc = { verses: [], words: 0 };
  };

  for (const verse of verses) {
    const words = wordCount(verse.text);
    const sameChapter =
      acc.verses.length === 0 ||
      (acc.verses[0].bookId === verse.bookId &&
        acc.verses[acc.verses.length - 1].chapter === verse.chapter);

    // Never cross chapter boundaries.
    if (!sameChapter) flush();

    // Adding this verse would blow the word cap — close first (unless the
    // chunk is still tiny, in which case an oversized chunk beats a sliver).
    if (acc.verses.length > 0 && acc.words + words > MAX_WORDS && acc.words >= MIN_WORDS) {
      flush();
    }

    acc.verses.push(verse);
    acc.words += words;

    const full = acc.verses.length >= MAX_VERSES || acc.words >= MAX_WORDS;
    const comfortable =
      acc.verses.length >= 2 && acc.words >= MIN_WORDS && endsSentence(verse.text);
    // A single long verse stands alone once it already meets the cap.
    const loneLongVerse = acc.verses.length === 1 && acc.words >= MAX_WORDS;

    if (full || comfortable || loneLongVerse) flush();
  }
  flush();

  // Merge a trailing sliver (under MIN_WORDS) into its predecessor when they
  // share a chapter and the merge stays near the cap.
  for (let i = chunks.length - 1; i > 0; i--) {
    const cur = chunks[i];
    const prev = chunks[i - 1];
    const sameChapter =
      prev.verses[0].bookId === cur.verses[0].bookId &&
      prev.verses[prev.verses.length - 1].chapter === cur.verses[0].chapter;
    if (cur.words < MIN_WORDS && sameChapter && prev.words + cur.words <= MAX_WORDS + 10) {
      prev.verses.push(...cur.verses);
      prev.words += cur.words;
      chunks.splice(i, 1);
    }
  }

  return chunks.map((c, orderIndex) => {
    const start = toRef(c.verses[0]);
    const end = toRef(c.verses[c.verses.length - 1]);
    return {
      id: `${translationId}:${refToOsis(start)}-${refToOsis(end)}`,
      orderIndex,
      start,
      end,
      verseCount: c.verses.length,
      wordCount: c.words,
    };
  });
}

function toRef(v: Verse): Ref {
  return { bookId: v.bookId, chapter: v.chapter, verse: v.verse };
}
