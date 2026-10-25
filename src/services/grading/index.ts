/**
 * Grading — the heart of the app (docs/03-memory-engine.md §3–4).
 * Pure functions only; no async, no React Native imports (02 §8: grading
 * must run in <16ms on the UI path).
 */
import { gradeTokens, type GradeResult } from '@/services/grading/diff';
import { metaphone } from '@/services/grading/metaphone';
import { tokenize, type TokenizeOptions } from '@/services/grading/normalize';
import { isEnglish } from '@/services/grading/script';

export { normalize, tokenize, type TokenizeOptions } from '@/services/grading/normalize';
export {
  firstGrapheme,
  isEnglish,
  splitUnspaced,
  UNSPACED_SCRIPT,
} from '@/services/grading/script';
export {
  damerauLevenshtein,
  similarity,
  gradeTokens,
  errorBudget,
  MIN_PASS_ACCURACY,
  thresholdFor,
  meetsThreshold,
  ALMOST_BUDGET_FACTOR,
  MIN_ALMOST_ACCURACY,
  almostBudget,
  almostThresholdFor,
  gradeBand,
  slipCount,
  TYPO_SIMILARITY,
  type GradeResult,
  type GradedWord,
  type RoundBand,
  type WordTag,
} from '@/services/grading/diff';
export { metaphone } from '@/services/grading/metaphone';

/** What the graders need to know about the text: its language, for the English-only leniencies. */
export type GradeOptions = TokenizeOptions;

/** Grades typed (or arranged) input against the reference text. */
export function gradeTyped(
  referenceText: string,
  inputText: string,
  options: GradeOptions = {},
): GradeResult {
  return gradeTokens(tokenize(referenceText, options), tokenize(inputText, options));
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

/** English homophones count as matches; Metaphone knows no other language. */
const englishHomophones = (expected: string, said: string) =>
  expected === said || metaphone(expected) === metaphone(said);

/**
 * Grades a final speech transcript: same alignment as typing, plus — for
 * English — a phonetic-equivalence pass on substitutions (homophones count
 * as matches).
 */
export function gradeSpoken(
  referenceText: string,
  transcript: string,
  options: GradeOptions = {},
): GradeResult {
  const reference = tokenize(referenceText, options);
  const input = stripEdgeFillers(tokenize(transcript, options));
  return gradeTokens(reference, input, isEnglish(options.language) ? englishHomophones : undefined);
}
