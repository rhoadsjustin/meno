/**
 * Grading — the heart of the app (docs/03-memory-engine.md §3–4).
 * Pure functions only; no async, no React Native imports (02 §8: grading
 * must run in <16ms on the UI path).
 */
import { gradeTokens, type GradeResult } from '@/services/grading/diff';
import { metaphone } from '@/services/grading/metaphone';
import { tokenize } from '@/services/grading/normalize';

export { normalize, tokenize } from '@/services/grading/normalize';
export {
  damerauLevenshtein,
  similarity,
  gradeTokens,
  TYPO_SIMILARITY,
  type GradeResult,
  type GradedWord,
  type WordTag,
} from '@/services/grading/diff';
export { metaphone } from '@/services/grading/metaphone';

/** Grades typed (or arranged) input against the reference text. */
export function gradeTyped(referenceText: string, inputText: string): GradeResult {
  return gradeTokens(tokenize(referenceText), tokenize(inputText));
}

/** Leading/trailing fillers ignored in speech (mid-verse ones count — they
 * usually indicate paraphrase drift). */
const FILLERS = new Set(['um', 'uh', 'er', 'okay', 'ok']);

function stripEdgeFillers(tokens: string[]): string[] {
  let start = 0;
  let end = tokens.length;
  while (start < end && FILLERS.has(tokens[start])) start++;
  while (end > start && FILLERS.has(tokens[end - 1])) end--;
  return tokens.slice(start, end);
}

/**
 * Grades a final speech transcript: same alignment as typing, plus a
 * phonetic-equivalence pass on substitutions (homophones count as matches).
 */
export function gradeSpoken(referenceText: string, transcript: string): GradeResult {
  const reference = tokenize(referenceText);
  const input = stripEdgeFillers(tokenize(transcript));
  return gradeTokens(
    reference,
    input,
    (expected, said) => expected === said || metaphone(expected) === metaphone(said)
  );
}
