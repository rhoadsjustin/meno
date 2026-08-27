/**
 * Display-token utilities for practice modes. These work on the ORIGINAL
 * text (casing and punctuation preserved) — grading normalizes separately.
 */

export type DisplayToken = {
  /** The word as displayed, without surrounding punctuation. */
  word: string;
  /** Punctuation/space glued before and after the word. */
  prefix: string;
  suffix: string;
};

/** Splits text into displayable word tokens with attached punctuation. */
export function displayTokens(text: string): DisplayToken[] {
  const tokens: DisplayToken[] = [];
  const re = /(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const raw = match[1];
    const core = raw.replace(/^[^A-Za-z0-9’']+|[^A-Za-z0-9’']+$/g, '');
    if (!core) {
      // Pure punctuation token — glue onto the previous word's suffix.
      if (tokens.length > 0) tokens[tokens.length - 1].suffix += ` ${raw}`;
      continue;
    }
    const start = raw.indexOf(core);
    tokens.push({
      word: core,
      prefix: raw.slice(0, start),
      suffix: raw.slice(start + core.length),
    });
  }
  return tokens;
}

/**
 * First-letters rendering (03 §1): first letter of each word, punctuation
 * kept — `"Do not be anxious…"` → `"D n b a…"`.
 */
export function firstLetters(text: string): string {
  return displayTokens(text)
    .map((t) => `${t.prefix}${t.word[0]}${t.suffix}`)
    .join(' ');
}

/** Words-only view of the display tokens. */
export function displayWords(text: string): string[] {
  return displayTokens(text).map((t) => t.word);
}
