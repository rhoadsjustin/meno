/**
 * Pagination for the Reader's book pose: a chapter becomes one string of
 * text (the "flow"), the system lays it out once at page width, and the
 * measured lines are cut into pages that each fit the page height. Pure —
 * no React, no layout — so the cutting is unit-tested.
 */
import type { Verse } from '@/services/bible';

/** A stretch of the flow: a verse number or that verse's text. */
export type Segment = { start: number; end: number; verse: number; kind: 'num' | 'text' };

export type Flow = { text: string; segments: Segment[] };

/** Character range of the flow shown on one page, end exclusive. */
export type Page = { start: number; end: number };

/** A measured line, as `onTextLayout` reports it. */
export type MeasuredLine = { text: string; height: number };

/** A piece of a page with a single style. */
export type Run = { key: string; kind: Segment['kind']; verse: number; text: string };

const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/**
 * A verse number as superscript digits ("¹²"), docs/07 §4. React Native's
 * Text has no baseline offset, so the raised numerals are the Unicode ones:
 * they sit in the line as ordinary characters, which keeps the measured
 * flow and what each page draws identical.
 */
export function superscript(n: number): string {
  return String(n).replace(/\d/g, (d) => SUPERSCRIPT_DIGITS[Number(d)]);
}

/**
 * A verse number as it is set before its verse: raised, and tied to the
 * first word by a no-break space so it never ends a line on its own.
 */
export function verseMark(verse: number): string {
  return `${superscript(verse)}\u00A0`;
}

/** The chapter as one string: "¹ In the beginning… ² The same was… ". */
export function buildFlow(verses: Verse[]): Flow {
  let text = '';
  const segments: Segment[] = [];
  for (const v of verses) {
    const num = verseMark(v.verse);
    segments.push({
      start: text.length,
      end: text.length + num.length,
      verse: v.verse,
      kind: 'num',
    });
    text += num;
    const body = `${v.text} `;
    segments.push({
      start: text.length,
      end: text.length + body.length,
      verse: v.verse,
      kind: 'text',
    });
    text += body;
  }
  return { text, segments };
}

/**
 * Cuts measured lines into pages no taller than `pageHeight`. Every page
 * starts at the start of a line, so the same text laid out again on its own
 * breaks the same way. A page always takes at least one line.
 */
export function paginate(text: string, lines: MeasuredLine[], pageHeight: number): Page[] {
  // Where each line starts in the flow. Platforms differ on whether a line's
  // text carries its trailing whitespace, so lines are located by content.
  const starts: number[] = [];
  let cursor = 0;
  for (const line of lines) {
    const content = line.text.trim();
    const found = content ? text.indexOf(content, cursor) : -1;
    const start = found < 0 ? cursor : found;
    starts.push(start);
    cursor = start + content.length;
  }

  const pages: Page[] = [];
  let pageStart = 0;
  let used = 0;
  for (let i = 0; i < lines.length; i++) {
    if (used > 0 && used + lines[i].height > pageHeight) {
      pages.push({ start: pageStart, end: starts[i] });
      pageStart = starts[i];
      used = 0;
    }
    used += lines[i].height;
  }
  if (lines.length > 0) pages.push({ start: pageStart, end: text.length });
  return pages;
}

/** The styled runs that make up one page. */
export function pageRuns(flow: Flow, page: Page): Run[] {
  const runs: Run[] = [];
  for (const s of flow.segments) {
    if (s.end <= page.start) continue;
    if (s.start >= page.end) break;
    const text = flow.text.slice(Math.max(s.start, page.start), Math.min(s.end, page.end));
    if (text) runs.push({ key: `${s.verse}:${s.kind}`, kind: s.kind, verse: s.verse, text });
  }
  return runs;
}

/** Two pages to a spread. */
export function spreadCount(pages: Page[]): number {
  return Math.ceil(pages.length / 2);
}

/**
 * The spread showing the character at `anchor`. The reader keeps its place
 * as an anchor rather than a spread number, so re-paginating (a different
 * fold, text size or window) lands on the same words.
 */
export function spreadFor(pages: Page[], anchor: number): number {
  if (pages.length === 0) return 0;
  let index = pages.findIndex((p) => anchor < p.end);
  if (index < 0) index = pages.length - 1;
  return Math.floor(index / 2);
}
