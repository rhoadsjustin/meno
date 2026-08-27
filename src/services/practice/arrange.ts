/**
 * Arrange mode (docs/03-memory-engine.md §1): the chunk text split into
 * 6–12 phrase tiles, shuffled deterministically; graded on tile order
 * (position-exact, threshold ≥95% handled by the tier definition).
 */
import { hashSeed, mulberry32, shuffle } from '@/services/practice/prng';
import { displayTokens } from '@/services/practice/text';

export type ArrangeRound = {
  /** Tiles in correct order (the answer). */
  phrases: string[];
  /** Indices into `phrases`, in shuffled presentation order. */
  shuffledOrder: number[];
};

export const MIN_TILES = 6;
export const MAX_TILES = 12;

/**
 * Splits text into 6–12 phrase tiles, preferring punctuation boundaries.
 * Deterministic for the same text.
 */
export function splitPhrases(text: string): string[] {
  const tokens = displayTokens(text);
  if (tokens.length === 0) return [];

  const targetTiles = Math.min(MAX_TILES, Math.max(MIN_TILES, Math.round(tokens.length / 6)));
  const targetLen = tokens.length / targetTiles;

  const phrases: string[] = [];
  let current: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    current.push(`${t.prefix}${t.word}${t.suffix}`.trim());
    const boundary = /[,;:.!?]["”’']*$/.test(t.suffix);
    const remainingTokens = tokens.length - i - 1;
    const remainingTiles = targetTiles - phrases.length - 1;
    const mustBreak = remainingTokens <= remainingTiles; // keep ≥1 token per tile
    const wantBreak =
      current.length >= targetLen || (boundary && current.length >= Math.ceil(targetLen / 2));
    if ((mustBreak || wantBreak) && phrases.length < targetTiles - 1 && remainingTokens > 0) {
      phrases.push(current.join(' '));
      current = [];
    }
  }
  if (current.length > 0) phrases.push(current.join(' '));
  return phrases;
}

/** Builds the round; shuffle varies by attempt, tiles do not. */
export function buildArrangeRound(text: string, chunkId: string, attemptNo: number): ArrangeRound {
  const phrases = splitPhrases(text);
  const rand = mulberry32(hashSeed(chunkId, 'arrange', attemptNo));
  let shuffledOrder = shuffle(
    phrases.map((_, i) => i),
    rand
  );
  // Never present the tiles already in solved order.
  if (phrases.length > 1 && shuffledOrder.every((v, i) => v === i)) {
    shuffledOrder = [...shuffledOrder.slice(1), shuffledOrder[0]];
  }
  return { phrases, shuffledOrder };
}

/** Accuracy = fraction of tiles placed in their correct position. */
export function gradeArrangement(round: ArrangeRound, placedOrder: number[]): number {
  const n = round.phrases.length;
  if (n === 0) return 1;
  let correct = 0;
  for (let i = 0; i < Math.min(n, placedOrder.length); i++) {
    if (placedOrder[i] === i) correct++;
  }
  return correct / n;
}
