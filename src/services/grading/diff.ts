/**
 * Token-level alignment and scoring (docs/03-memory-engine.md §3).
 * Levenshtein over word tokens; substitutions with high character similarity
 * count as typos at half weight. Scoring is language-agnostic; only the
 * VoiceOver summary below is UI copy.
 */
import { t } from '@/i18n';

export type WordTag = 'correct' | 'typo' | 'wrong' | 'missed';

export type GradedWord = {
  /** Reference word (original, pre-normalization casing not preserved here —
   * callers map indices back to display tokens). */
  word: string;
  index: number;
  tag: WordTag;
  /** What the user provided, for substitutions/typos. */
  said?: string;
};

export type GradeResult = {
  words: GradedWord[];
  /** User tokens that matched nothing in the reference, with the reference
   * index they were inserted before. */
  insertions: { word: string; beforeIndex: number }[];
  /** 0–1, floored at 0: 1 − weightedErrors / referenceWordCount. Always the
   * honest score — it is what the user is shown and what SM-2 consumes.
   * Pass/fail is decided by `meetsThreshold`, not by comparing this to a
   * tier threshold directly. */
  accuracy: number;
  /** Reference length the accuracy was measured against (0 for empty text). */
  unitCount: number;
};

type Op = 'match' | 'sub' | 'del' | 'ins';

/** Damerau-Levenshtein distance (optimal string alignment) on characters. */
export function damerauLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const d: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

/** Character-level similarity ratio in [0, 1]. */
export function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - damerauLevenshtein(a, b) / maxLen;
}

/** Similarity threshold at which a substitution counts as a typo (half weight). */
export const TYPO_SIMILARITY = 0.8;
const TYPO_WEIGHT = 0.5;

/**
 * Aligns user tokens against reference tokens and scores the attempt.
 * `isEquivalent` lets the speech grader add phonetic leniency without
 * duplicating the alignment.
 */
export function gradeTokens(
  reference: string[],
  input: string[],
  isEquivalent: (expected: string, said: string) => boolean = (e, s) => e === s,
): GradeResult {
  const m = reference.length;
  const n = input.length;

  // Levenshtein DP over word tokens.
  const d: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const subCost = isEquivalent(reference[i - 1], input[j - 1]) ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + subCost);
    }
  }

  // Backtrace into per-word ops.
  const ops: { op: Op; refIndex?: number; inputIndex?: number }[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      d[i][j] === d[i - 1][j - 1] + (isEquivalent(reference[i - 1], input[j - 1]) ? 0 : 1)
    ) {
      ops.push({
        op: isEquivalent(reference[i - 1], input[j - 1]) ? 'match' : 'sub',
        refIndex: i - 1,
        inputIndex: j - 1,
      });
      i--;
      j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      ops.push({ op: 'del', refIndex: i - 1 });
      i--;
    } else {
      ops.push({ op: 'ins', inputIndex: j - 1 });
      j--;
    }
  }
  ops.reverse();

  const words: GradedWord[] = [];
  const insertions: GradeResult['insertions'] = [];
  let weightedErrors = 0;
  let nextRefIndex = 0;

  for (const step of ops) {
    switch (step.op) {
      case 'match':
        words.push({ word: reference[step.refIndex!], index: step.refIndex!, tag: 'correct' });
        nextRefIndex = step.refIndex! + 1;
        break;
      case 'sub': {
        const expected = reference[step.refIndex!];
        const said = input[step.inputIndex!];
        const isTypo = similarity(expected, said) >= TYPO_SIMILARITY;
        words.push({
          word: expected,
          index: step.refIndex!,
          tag: isTypo ? 'typo' : 'wrong',
          said,
        });
        weightedErrors += isTypo ? TYPO_WEIGHT : 1;
        nextRefIndex = step.refIndex! + 1;
        break;
      }
      case 'del':
        words.push({ word: reference[step.refIndex!], index: step.refIndex!, tag: 'missed' });
        weightedErrors += 1;
        nextRefIndex = step.refIndex! + 1;
        break;
      case 'ins':
        insertions.push({ word: input[step.inputIndex!], beforeIndex: nextRefIndex });
        weightedErrors += 1;
        break;
    }
  }

  const accuracy = m === 0 ? 1 : Math.max(0, 1 - weightedErrors / m);
  return { words, insertions, accuracy, unitCount: m };
}

/**
 * No round passes below this, whatever the floor below would allow — a pass
 * has to have been a recitation. It only binds on very short chunks:
 * "Jesus wept." must be exact, while ~5 words up gets its one slip.
 */
const MAX_ERROR_FRACTION = 0.2;
export const MIN_PASS_ACCURACY = 1 - MAX_ERROR_FRACTION;

/**
 * Weighted errors a round may carry and still pass `threshold`.
 *
 * The proportional budget on its own — (1 − threshold) × length — demands a
 * literally word-perfect answer for anything under 20 words at the 95% tiers,
 * which is most single-verse goals (Phil 4:13 is 10 words, Ps 23:1 is 8). One
 * slipped word then fails every attempt, and since a failed round never
 * advances, the user recites the same verse forever. So the budget never
 * falls below one whole word, capped by MIN_PASS_ACCURACY.
 */
export function errorBudget(threshold: number, unitCount: number): number {
  if (unitCount <= 0) return 0;
  const proportional = (1 - threshold) * unitCount;
  return Math.min(Math.max(proportional, 1), unitCount * MAX_ERROR_FRACTION);
}

/**
 * `errorBudget` restated as the lowest honest accuracy that still passes.
 * With no length to scale to, fall back to the bare threshold — a caller
 * that forgets `unitCount` must get the strict rule, never a free pass.
 */
export function thresholdFor(threshold: number, unitCount: number): number {
  if (unitCount <= 0) return threshold;
  return Math.max(0, 1 - errorBudget(threshold, unitCount) / unitCount);
}

/** The pass test for every graded mode. `unitCount` is words for
 * type/speak, blanks for a blanks round, tiles for arrange. */
export function meetsThreshold(threshold: number, accuracy: number, unitCount: number): boolean {
  return accuracy >= thresholdFor(threshold, unitCount) - 1e-9;
}

/**
 * How a graded round landed. `almost` is the band just outside a pass: close
 * enough to move on up the ladder, not clean enough to count as one. Only
 * `pass` satisfies `meetsThreshold`, so the Memorized rule, reviews and SM-2
 * never see an almost as anything but a miss.
 */
export type RoundBand = 'pass' | 'almost' | 'miss';

/** The almost band reaches this many times the pass budget. */
export const ALMOST_BUDGET_FACTOR = 2;

/**
 * No almost below this, whatever twice the budget would allow. It binds on
 * short chunks, where the one-word floor already makes the pass budget a
 * large share of the text: doubled, a five-word verse would move on with two
 * words wrong (60%), which is not "almost".
 */
export const MIN_ALMOST_ACCURACY = 0.75;

/**
 * Weighted errors a round may carry and still land in the almost band.
 *
 * Twice the pass budget, never dropping below MIN_ALMOST_ACCURACY — and only
 * where that budget is a whole slipped word or more. Below that (chunks under five units) MAX_ERROR_FRACTION is what
 * set the budget, and it exists so that a handful of words has to be recited
 * as written: doubling it would let "Jesus swept" through. There the band is
 * empty and the answer is pass or miss, as before.
 */
export function almostBudget(threshold: number, unitCount: number): number {
  const budget = errorBudget(threshold, unitCount);
  if (budget < 1) return budget;
  // Twice the budget, held to MIN_ALMOST_ACCURACY — but never tighter than
  // the pass budget itself, or an almost would outrank a pass.
  const floored = Math.min(budget * ALMOST_BUDGET_FACTOR, unitCount * (1 - MIN_ALMOST_ACCURACY));
  return Math.max(budget, floored);
}

/** `almostBudget` restated as the lowest honest accuracy that is still an
 * almost. Without a length there is no band: it equals the bare threshold. */
export function almostThresholdFor(threshold: number, unitCount: number): number {
  if (unitCount <= 0) return threshold;
  return Math.max(0, 1 - almostBudget(threshold, unitCount) / unitCount);
}

/** The three-way outcome for every graded mode. `pass` is exactly
 * `meetsThreshold`; `almost` is the band beneath it. */
export function gradeBand(threshold: number, accuracy: number, unitCount: number): RoundBand {
  if (meetsThreshold(threshold, accuracy, unitCount)) return 'pass';
  return accuracy >= almostThresholdFor(threshold, unitCount) - 1e-9 ? 'almost' : 'miss';
}

/**
 * The band against a fixed pass line — one that does not bend with length,
 * as review feedback's 90% does not. A pass is `accuracy >= passAccuracy`,
 * exactly; beneath it the almost band is the one the ladder would give a
 * round of that length. For display: review scheduling takes the accuracy
 * itself and never sees a band.
 */
export function gradeBandAtLine(
  passAccuracy: number,
  accuracy: number,
  unitCount: number,
): RoundBand {
  if (accuracy >= passAccuracy) return 'pass';
  return accuracy >= almostThresholdFor(passAccuracy, unitCount) - 1e-9 ? 'almost' : 'miss';
}

/** Slips in an attempt as the user would count them: every reference word
 * that was not right, plus every extra word. Unweighted — a typo is one. */
export function slipCount(result: GradeResult): number {
  return result.words.filter((w) => w.tag !== 'correct').length + result.insertions.length;
}

/**
 * The word-by-word feedback as one spoken sentence, for VoiceOver: what was
 * missed, mistyped and added, by name. Read word by word instead, a verse is
 * dozens of swipes of "correct" with the slips buried among them.
 */
export function feedbackSummary(result: GradeResult): string {
  const list = (tag: WordTag) => result.words.filter((w) => w.tag === tag).map((w) => w.word);
  const parts: string[] = [];
  const missed = list('missed');
  const wrong = result.words
    .filter((w) => w.tag === 'wrong')
    .map((w) =>
      w.said ? t('practice:spokenFeedback.wrongSaid', { word: w.word, said: w.said }) : w.word,
    );
  const typos = list('typo');
  const extras = result.insertions.map((i) => i.word);
  if (missed.length > 0)
    parts.push(t('practice:spokenFeedback.missed', { words: missed.join(', ') }));
  if (wrong.length > 0) parts.push(t('practice:spokenFeedback.wrong', { words: wrong.join('; ') }));
  if (typos.length > 0) parts.push(t('practice:spokenFeedback.close', { words: typos.join(', ') }));
  if (extras.length > 0)
    parts.push(t('practice:spokenFeedback.added', { words: extras.join(', ') }));
  return parts.length > 0 ? parts.join(' ') : t('practice:spokenFeedback.allCorrect');
}

/** One mark in the word-by-word feedback: a reference word with its tag, or
 * a word the user added that the verse does not have. */
export type FeedbackToken =
  { kind: 'word'; word: GradedWord } | { kind: 'extra'; word: string; key: string };

/**
 * The reference words and the user's extra words in the order they were
 * said, for display. Extra words cost accuracy like any other slip, so a
 * result made only of them must still have something to show: without them
 * the feedback is a verse marked entirely correct under a failing score.
 */
export function feedbackSequence(result: GradeResult): FeedbackToken[] {
  const out: FeedbackToken[] = [];
  const extras = result.insertions.map((ins, i) => ({ ...ins, key: `extra-${i}` }));
  let next = 0;
  const flushBefore = (index: number) => {
    while (next < extras.length && extras[next].beforeIndex <= index) {
      out.push({ kind: 'extra', word: extras[next].word, key: extras[next].key });
      next++;
    }
  };
  for (const word of result.words) {
    flushBefore(word.index);
    out.push({ kind: 'word', word });
  }
  flushBefore(Infinity);
  return out;
}
