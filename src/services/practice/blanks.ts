/**
 * Blank selection for Blanks 25/50/75 (docs/03-memory-engine.md §1):
 * prefer content words at 25% density; random beyond stopwords at 50/75.
 * Deterministic per (chunkId, density, attemptNo).
 */
import { hashSeed, mulberry32, shuffle } from '@/services/practice/prng';
import { displayWords } from '@/services/practice/text';

/** Small function-word list — words we avoid blanking at low density. */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'nor', 'so', 'yet', 'for',
  'of', 'in', 'on', 'at', 'to', 'by', 'with', 'from', 'as', 'into',
  'unto', 'upon', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'do', 'does', 'did', 'have', 'has', 'had', 'shall', 'will', 'may',
  'that', 'this', 'these', 'those', 'it', 'its', 'he', 'she', 'his', 'her',
  'him', 'they', 'them', 'their', 'we', 'us', 'our', 'you', 'your', 'i',
  'me', 'my', 'not', 'no', 'if', 'then', 'than', 'there', 'who', 'whom',
  'which', 'what', 'when', 'also', 'even', 'ye', 'thee', 'thou', 'thy',
]);

/**
 * Returns the word indices (into displayWords(text)) to blank out.
 * Deterministic for a given (chunkId, density, attemptNo).
 */
export function selectBlanks(
  text: string,
  density: number,
  chunkId: string,
  attemptNo: number
): number[] {
  const words = displayWords(text);
  const count = Math.max(1, Math.round(words.length * density));
  const rand = mulberry32(hashSeed(chunkId, density, attemptNo));

  const indices = words.map((_, i) => i);
  const content = indices.filter((i) => !STOPWORDS.has(words[i].toLowerCase()));
  const stop = indices.filter((i) => STOPWORDS.has(words[i].toLowerCase()));

  // Content words first (shuffled), then stopwords if we still need more.
  const ordered = [...shuffle(content, rand), ...shuffle(stop, rand)];
  return ordered.slice(0, count).sort((a, b) => a - b);
}
