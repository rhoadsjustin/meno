/**
 * Classic Metaphone (Lawrence Philips, 1990) — used for the speech grader's
 * homophone leniency: metaphone(said) === metaphone(expected) counts as a
 * match ("their"/"there", "Saul"/"soul"). Pure TypeScript.
 */

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

function isVowel(s: string, i: number): boolean {
  return VOWELS.has(s[i] ?? '');
}

export function metaphone(input: string): string {
  let s = input.toUpperCase().replace(/[^A-Z]/g, '');
  if (!s) return '';

  // Initial-letter exceptions.
  if (/^(AE|GN|KN|PN|WR)/.test(s)) s = s.slice(1);
  else if (s.startsWith('X')) s = 'S' + s.slice(1);
  else if (s.startsWith('WH')) s = 'W' + s.slice(2);

  let out = '';
  const len = s.length;

  for (let i = 0; i < len; i++) {
    const c = s[i];
    const prev = s[i - 1] ?? '';
    const next = s[i + 1] ?? '';
    const next2 = s[i + 2] ?? '';

    // Skip doubled letters except C.
    if (c === prev && c !== 'C') continue;

    switch (c) {
      case 'A':
      case 'E':
      case 'I':
      case 'O':
      case 'U':
        if (i === 0) out += c;
        break;
      case 'B':
        // Silent -MB at end.
        if (!(i === len - 1 && prev === 'M')) out += 'B';
        break;
      case 'C':
        if (next === 'I' && next2 === 'A') out += 'X'; // -CIA-
        else if (next === 'H') {
          out += prev === 'S' ? 'K' : 'X'; // SCH → K, else CH → X
        } else if (next === 'I' || next === 'E' || next === 'Y') {
          if (prev !== 'S') out += 'S'; // -SCI/SCE/SCY- silent C
        } else out += 'K';
        break;
      case 'D':
        if (next === 'G' && (next2 === 'E' || next2 === 'Y' || next2 === 'I')) out += 'J';
        else out += 'T';
        break;
      case 'F':
        out += 'F';
        break;
      case 'G':
        if (next === 'H') {
          // GH: silent unless at start-ish position before a vowel.
          if (i + 2 < len && !isVowel(s, i + 2)) break;
          if (i > 0) break; // rough/night: silent
          out += 'K';
        } else if (next === 'N') {
          break; // GN(ED) silent
        } else if (next === 'E' || next === 'I' || next === 'Y') {
          out += 'J';
        } else out += 'K';
        break;
      case 'H':
        // Silent after vowel with no following vowel, and after C/S/P/T/G.
        if ('CSPTG'.includes(prev)) break;
        if (isVowel(s, i - 1) && !isVowel(s, i + 1)) break;
        out += 'H';
        break;
      case 'J':
        out += 'J';
        break;
      case 'K':
        if (prev !== 'C') out += 'K';
        break;
      case 'L':
        out += 'L';
        break;
      case 'M':
        out += 'M';
        break;
      case 'N':
        out += 'N';
        break;
      case 'P':
        out += next === 'H' ? 'F' : 'P';
        break;
      case 'Q':
        out += 'K';
        break;
      case 'R':
        out += 'R';
        break;
      case 'S':
        if (next === 'H') out += 'X';
        else if (next === 'I' && (next2 === 'O' || next2 === 'A')) out += 'X';
        else out += 'S';
        break;
      case 'T':
        if (next === 'H') out += '0';
        else if (next === 'I' && (next2 === 'O' || next2 === 'A')) out += 'X';
        else if (next === 'C' && next2 === 'H') break; // -TCH: T silent
        else out += 'T';
        break;
      case 'V':
        out += 'F';
        break;
      case 'W':
        if (isVowel(s, i + 1)) out += 'W';
        break;
      case 'X':
        out += 'KS';
        break;
      case 'Y':
        if (isVowel(s, i + 1)) out += 'Y';
        break;
      case 'Z':
        out += 'S';
        break;
    }

    // PH handled at P; skip the H it consumed.
    if (c === 'P' && next === 'H') i++;
    // TH consumed the H.
    else if (c === 'T' && next === 'H') i++;
    // SH consumed the H.
    else if (c === 'S' && next === 'H') i++;
    // CH consumed the H.
    else if (c === 'C' && next === 'H') i++;
  }

  return out;
}
