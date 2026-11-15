/**
 * Display-token utilities for practice modes. These work on the ORIGINAL
 * text (casing and punctuation preserved) — grading normalizes separately.
 * Words are letters, marks and digits in any script; a script written
 * without spaces is split into words (or letters) the same way grading
 * splits it, so blanks and tiles line up with graded tokens.
 */
import { tokenize, type TokenizeOptions } from '@/services/grading/normalize';
import { firstGrapheme, splitUnspaced, UNSPACED_SCRIPT } from '@/services/grading/script';

export type DisplayToken = {
  /** The word as displayed, without surrounding punctuation. */
  word: string;
  /** Punctuation/space glued before and after the word. */
  prefix: string;
  suffix: string;
};

const EDGE_PUNCTUATION = /^[^\p{L}\p{M}\p{N}’']+|[^\p{L}\p{M}\p{N}’']+$/gu;
const WORD_RUN = /[\p{L}\p{M}\p{N}’']+/gu;

/** Splits text into displayable word tokens with attached punctuation. */
export function displayTokens(text: string): DisplayToken[] {
  const tokens: DisplayToken[] = [];
  const re = /(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const raw = match[1];
    const core = raw.replace(EDGE_PUNCTUATION, '');
    if (!core) {
      // Pure punctuation token — glue onto the previous word's suffix.
      if (tokens.length > 0) tokens[tokens.length - 1].suffix += ` ${raw}`;
      continue;
    }
    const start = raw.indexOf(core);
    const prefix = raw.slice(0, start);
    const suffix = raw.slice(start + core.length);
    if (!UNSPACED_SCRIPT.test(core)) {
      tokens.push({ word: core, prefix, suffix });
      continue;
    }
    // "神爱世人，甚至" is several words; punctuation between runs rides on
    // the word before it, as it would after a space.
    const parts: DisplayToken[] = [];
    let last = 0;
    for (const run of core.matchAll(WORD_RUN)) {
      const between = core.slice(last, run.index);
      if (between && parts.length > 0) parts[parts.length - 1].suffix += between;
      for (const word of splitUnspaced(run[0])) parts.push({ word, prefix: '', suffix: '' });
      last = run.index + run[0].length;
    }
    if (parts.length === 0) continue;
    parts[0].prefix = prefix;
    parts[parts.length - 1].suffix += suffix;
    tokens.push(...parts);
  }
  return tokens;
}

/**
 * First-letters rendering (03 §1): first letter of each word, punctuation
 * kept — `"Do not be anxious…"` → `"D n b a…"`. A "letter" is a grapheme:
 * "él" keeps its accent, a Hindi conjunct stays whole.
 */
export function firstLetters(text: string): string {
  return displayTokens(text)
    .map((t) => `${t.prefix}${firstGrapheme(t.word)}${t.suffix}`)
    .join(' ');
}

/**
 * The same letters for a screen reader, one per word and no punctuation:
 * joined with commas they are spoken one by one, where the cipher itself
 * ("D n b a,") would be read as a word or skipped.
 */
export function firstLetterList(text: string): string[] {
  return displayTokens(text).map((t) => firstGrapheme(t.word));
}

/** Words-only view of the display tokens. */
export function displayWords(text: string): string[] {
  return displayTokens(text).map((t) => t.word);
}

/**
 * The display token behind each graded word, for marking a result in the
 * verse's own casing and punctuation. Graded words carry only the normalized
 * token and its index in the normalized reference; this maps that index back
 * to the original text, in the order `words` came in.
 *
 * The two tokenizations do not always line up: grading splits a hyphenated
 * word in two and folds English number words into digits. An entry is null
 * wherever the display token cannot be shown to be that graded word, and the
 * caller prints the graded word itself there — never a neighbour's.
 */
export function displayTokensForGraded(
  text: string,
  words: readonly { word: string; index: number }[],
  options: TokenizeOptions = {},
): (DisplayToken | null)[] {
  const byIndex = new Map<number, { token: DisplayToken; normalized: string }>();
  let cursor = 0;
  for (const token of displayTokens(text)) {
    const normalized = tokenize(token.word, options);
    if (normalized.length === 1) byIndex.set(cursor, { token, normalized: normalized[0] });
    cursor += normalized.length;
  }
  return words.map((w) => {
    const hit = byIndex.get(w.index);
    return hit && hit.normalized === w.word ? hit.token : null;
  });
}
