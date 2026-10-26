/**
 * Script-aware text helpers shared by grading and the practice modes
 * (docs/03-memory-engine.md §2). Pure TypeScript — no React Native imports.
 *
 * Meno began English-only. These are what let one engine handle the
 * YouVersion catalog's thirty scripts: which marks are pronunciation hints
 * rather than letters, which scripts write without spaces, and what "the
 * first letter" of a word is when a letter can carry several marks.
 */

/** Is this BCP 47 tag English — the only language with number-word folding and homophone leniency? */
export function isEnglish(language?: string | null): boolean {
  return !language || /^en(?:[-_]|$)/i.test(language);
}

/**
 * Marks dropped before comparing: Latin, Greek and Cyrillic combining
 * accents (é → e, so "Jesús" matches "Jesus"), Hebrew points and
 * cantillation, Arabic harakat and tatweel. Indic vowel signs are letters in
 * their own right and stay.
 */
export const OPTIONAL_MARKS = /[\u0300-\u036f\u0591-\u05c7\u0640\u064b-\u0652\u0670]/g;

/** Scripts written without spaces between words. */
const UNSPACED =
  '\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Thai}\\p{Script=Lao}\\p{Script=Khmer}\\p{Script=Myanmar}\\p{Script=Tibetan}';
export const UNSPACED_SCRIPT = new RegExp(`[${UNSPACED}]`, 'u');

const MARK = /^\p{M}$/u;
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

/** Indic viramas: the next letter joins the cluster (क + ् + य → one conjunct). */
const VIRAMAS = new Set([
  '\u094d',
  '\u09cd',
  '\u0a4d',
  '\u0acd',
  '\u0b4d',
  '\u0bcd',
  '\u0c4d',
  '\u0ccd',
  '\u0d4d',
]);

export type TextSegmenter = {
  segment(input: string): Iterable<{ segment: string; isWordLike?: boolean }>;
};

type SegmenterCtor = new (locale?: string, options?: { granularity: string }) => TextSegmenter;

function makeSegmenter(granularity: 'word' | 'grapheme'): TextSegmenter | null {
  try {
    const Ctor = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;
    return Ctor ? new Ctor(undefined, { granularity }) : null;
  } catch {
    return null;
  }
}

/** Hermes has no Intl.Segmenter yet (Node does), so both paths are kept and tested. */
export const wordSegmenter = makeSegmenter('word');
export const graphemeSegmenter = makeSegmenter('grapheme');

/** Base characters with the marks that follow them; the fallback's idea of a letter. */
function baseAndMarks(text: string): string[] {
  const out: string[] = [];
  for (const cp of Array.from(text)) {
    if (MARK.test(cp) && out.length > 0) out[out.length - 1] += cp;
    else out.push(cp);
  }
  return out;
}

/**
 * Splits a space-delimited token of an unspaced script into words — with
 * a dictionary segmenter where the runtime has one, else one unit per
 * letter, which is a fair reading of Chinese and a rough one of Thai.
 * Punctuation inside the token is dropped; tokens of other scripts come
 * back whole.
 */
export function splitUnspaced(
  token: string,
  segmenter: TextSegmenter | null = wordSegmenter,
): string[] {
  if (!UNSPACED_SCRIPT.test(token)) return [token];
  if (segmenter) {
    const out: string[] = [];
    for (const s of segmenter.segment(token)) {
      if (s.isWordLike === false || s.segment.trim().length === 0) continue;
      out.push(s.segment);
    }
    return out;
  }
  const out: string[] = [];
  let other = '';
  for (const unit of baseAndMarks(token)) {
    if (!LETTER_OR_DIGIT.test(unit)) continue;
    if (UNSPACED_SCRIPT.test(unit)) {
      if (other) out.push(other);
      other = '';
      out.push(unit);
    } else {
      other += unit;
    }
  }
  if (other) out.push(other);
  return out;
}

/**
 * The first letter of a word for First Letters mode: a grapheme cluster,
 * so "él" gives "é", Hindi "क्योंकि" gives the conjunct "क्यों", and an
 * Arabic letter keeps its vowel marks.
 */
export function firstGrapheme(
  word: string,
  segmenter: TextSegmenter | null = graphemeSegmenter,
): string {
  if (word.length === 0) return '';
  if (segmenter) {
    for (const s of segmenter.segment(word)) return s.segment;
    return '';
  }
  const cps = Array.from(word);
  let out = cps[0];
  let i = 1;
  while (i < cps.length && MARK.test(cps[i])) {
    const mark = cps[i];
    out += mark;
    i++;
    if (VIRAMAS.has(mark) && i < cps.length && !MARK.test(cps[i])) {
      out += cps[i];
      i++;
    }
  }
  return out;
}
