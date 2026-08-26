/**
 * Text normalization ahead of any comparison (docs/03-memory-engine.md §2).
 * Pure TypeScript — no React Native imports.
 *
 * Pipeline: lowercase → NFKD → strip diacritics → strip punctuation (keeping
 * intra-word apostrophes) → collapse whitespace → number-word ↔ digit
 * canonicalization. Archaic forms (thee/thou/thy/thine) are deliberately NOT
 * normalized away — the user must actually say them.
 */

/** Single number words → digit strings. Compounds are joined per-token after
 * punctuation stripping ("forty-two" → "forty two" → "42"). */
const UNITS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const SCALES: Record<string, number> = {
  hundred: 100,
  thousand: 1000,
};

function isNumberWord(token: string): boolean {
  return token in UNITS || token in TENS || token in SCALES || /^\d+$/.test(token);
}

/**
 * Folds a run of number words into digits ("a hundred forty four thousand" is
 * out of scope — Scripture text spells large figures in ways translations
 * vary on anyway; we handle unit/tens/hundred/thousand runs, which covers
 * "forty", "seventy times seven"-style cases token by token).
 */
function foldNumberRun(tokens: string[]): string {
  let total = 0;
  let current = 0;
  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      current += Number(token);
      continue;
    }
    if (token in UNITS) {
      current += UNITS[token];
    } else if (token in TENS) {
      current += TENS[token];
    } else if (token === 'hundred') {
      current = Math.max(current, 1) * 100; // multiplier: "hundred forty four" builds on
    } else if (token in SCALES) {
      total += Math.max(current, 1) * SCALES[token]; // flush: "…thousand" closes the group
      current = 0;
    }
  }
  return String(total + current);
}

/** Normalizes a full string for grading; returns a single spaced string. */
export function normalize(text: string): string {
  return tokenize(text).join(' ');
}

/** Normalized word tokens for alignment. */
export function tokenize(text: string): string[] {
  const base = text
    .toLowerCase()
    .normalize('NFKD')
    // strip combining diacritics
    .replace(/[\u0300-\u036f]/g, '')
    // typographic apostrophes → ASCII before the punctuation pass
    .replace(/[‘’]/g, "'")
    // strip everything but letters, digits, apostrophes and whitespace
    .replace(/[^a-z0-9'\s]+/g, ' ')
    // drop apostrophes not inside a word (quote marks), keep "god's"
    .replace(/(^|\s)'+|'+(\s|$)/g, '$1 $2');

  const rawTokens = base.split(/\s+/).filter(Boolean);

  // Canonicalize number-word runs to digits so "forty" == "40".
  const out: string[] = [];
  let i = 0;
  while (i < rawTokens.length) {
    if (isNumberWord(rawTokens[i])) {
      let j = i;
      while (j < rawTokens.length && isNumberWord(rawTokens[j])) j++;
      // Consecutive digit tokens are distinct numbers, not a run; only fold
      // word-form runs together with at most one trailing scale/digit merge.
      const run = rawTokens.slice(i, j);
      if (run.length === 1) {
        out.push(/^\d+$/.test(run[0]) ? run[0] : foldNumberRun(run));
      } else if (run.every((t) => /^\d+$/.test(t))) {
        out.push(...run);
      } else {
        out.push(foldNumberRun(run));
      }
      i = j;
    } else {
      out.push(rawTokens[i]);
      i++;
    }
  }
  return out;
}
