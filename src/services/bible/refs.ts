/** Pure Ref helpers — no React Native imports. */
import { bookOrder, getBook } from '@/services/bible/canon';
import type { Ref, RefRange } from '@/services/bible/types';

/** Total ordering over canonical references. */
export function compareRefs(a: Ref, b: Ref): number {
  const byBook = bookOrder(a.bookId) - bookOrder(b.bookId);
  if (byBook !== 0) return byBook;
  if (a.chapter !== b.chapter) return a.chapter - b.chapter;
  return a.verse - b.verse;
}

export function refEquals(a: Ref, b: Ref): boolean {
  return compareRefs(a, b) === 0;
}

export function refInRange(ref: Ref, range: RefRange): boolean {
  return compareRefs(range.start, ref) <= 0 && compareRefs(ref, range.end) <= 0;
}

/** Human-readable reference, e.g. "John 3:16" or "1 Cor 13:4". */
export function formatRef(ref: Ref): string {
  return `${getBook(ref.bookId).name} ${ref.chapter}:${ref.verse}`;
}

/** Range display, e.g. "Phil 1:1–11" or "John 3:16 – 4:2". */
export function formatRange(range: RefRange): string {
  const { start, end } = range;
  if (refEquals(start, end)) return formatRef(start);
  const book = getBook(start.bookId);
  if (start.bookId === end.bookId) {
    if (start.chapter === end.chapter) {
      return `${book.name} ${start.chapter}:${start.verse}–${end.verse}`;
    }
    return `${book.name} ${start.chapter}:${start.verse}–${end.chapter}:${end.verse}`;
  }
  return `${formatRef(start)} – ${formatRef(end)}`;
}

/** OSIS-style machine id, e.g. "John.3.16" (used in routes and storage keys). */
export function refToOsis(ref: Ref): string {
  return `${ref.bookId}.${ref.chapter}.${ref.verse}`;
}

export function parseOsisRef(osis: string): Ref {
  const parts = osis.split('.');
  if (parts.length !== 3) throw new Error(`Invalid OSIS ref: ${osis}`);
  const [bookId, chapterStr, verseStr] = parts;
  const chapter = Number(chapterStr);
  const verse = Number(verseStr);
  const book = getBook(bookId); // throws on unknown book
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) {
    throw new Error(`Invalid chapter in OSIS ref: ${osis}`);
  }
  if (!Number.isInteger(verse) || verse < 1) {
    throw new Error(`Invalid verse in OSIS ref: ${osis}`);
  }
  return { bookId, chapter, verse };
}
