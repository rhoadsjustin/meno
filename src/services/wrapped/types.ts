/**
 * Year in the Word recap (docs/09 §2, docs/10). Plain data in, plain data
 * out: the repo loader (services/db/repos/wrapped) reads rows, `rollupYear`
 * turns them into a `YearRecap`, and the screens only render it.
 *
 * Nothing here carries verse text. The passage of the year is a reference;
 * whether its text may be shown on a share image is decided by
 * services/bible (`mayShareVerseText`), at render time.
 */
import type { RefRange } from '@/services/bible/types';
import type { attempts } from '@/services/db/schema';

export type AttemptMode = (typeof attempts.$inferSelect)['mode'];
export type AttemptSource = (typeof attempts.$inferSelect)['source'];

export type RecapAttempt = {
  goalId: string;
  mode: AttemptMode;
  source: AttemptSource;
  durationMs: number;
  createdAt: Date;
};

export type RecapChunk = {
  goalId: string;
  memorizedAt: Date | null;
  verses: number;
  /** Words in the chunk's text; null when the text couldn't be read (offline). */
  words: number | null;
};

export type RecapGoal = {
  id: string;
  title: string;
  translationId: string;
  range: RefRange;
};

export type RecapInput = {
  attempts: readonly RecapAttempt[];
  chunks: readonly RecapChunk[];
  goals: readonly RecapGoal[];
  /** Successful recite-to-unlock times (lockEvents `reciteSuccess`). Overrides are never read. */
  unlocks: readonly Date[];
  badges: readonly { code: string; earnedAt: Date }[];
  /** Local 'YYYY-MM-DD' days kept from deleted passages (services/stats/practice-days). */
  keptDays: readonly string[];
};

/** How the recap reads a moment in the user's own time zone. */
export type LocalClock = {
  /** Local calendar date, 'YYYY-MM-DD'. */
  dayOf(date: Date): string;
  /** Local hour, 0–23. */
  hourOf(date: Date): number;
};

export type PersonaCode =
  | 'morningWatch'
  | 'nightMeditator'
  | 'middayPause'
  | 'voiceInTheRoom'
  | 'faithfulKeeper'
  | 'steadyWalker';

export type CardId =
  | 'cover'
  | 'words'
  | 'passage'
  | 'days'
  | 'minutes'
  | 'spoken'
  | 'unlocks'
  | 'persona'
  | 'badges'
  | 'summary';

export type PassageOfYear = RecapGoal & {
  minutes: number;
  attempts: number;
};

export type YearRecap = {
  year: number;
  /**
   * 'year' reads "In 2026"; 'firstSeason' reads "Since you started in
   * October" (month 1–12) for people whose first day came late in the year.
   */
  span: { kind: 'year' } | { kind: 'firstSeason'; month: number };
  /** Enough to show a recap at all (docs/10 §4). */
  eligible: boolean;
  activeDays: number;
  /** Longest run of days within the year, by the streak's own grace rules. */
  longestRun: number;
  /** Missed days a grace day quietly bridged during the year. */
  graceDaysHonored: number;
  chunksMemorized: number;
  versesMemorized: number;
  /** Null when any memorized chunk's words couldn't be counted. */
  wordsMemorized: number | null;
  minutes: number;
  attempts: number;
  reviews: number;
  spokenRecitations: number;
  unlocks: number;
  /** Badge codes earned in the year, in the order they were earned. */
  badges: string[];
  passage: PassageOfYear | null;
  persona: PersonaCode | null;
  /** Up to two more personas the year also earned, in order (docs/10 §3). */
  alsoPersonas: PersonaCode[];
  /** The cards to show, in order; cards without enough data are left out. */
  cards: CardId[];
};
