/**
 * Starter verses — the quick start offered before a user has picked a
 * passage of their own (Today's empty state, the end of onboarding).
 *
 * References only: no verse text lives here. Text is read through
 * services/bible like everything else, so the licensing rules in
 * docs/02-architecture.md §5 apply unchanged. Pure — no React Native imports.
 */
import type { RefRange, Verse } from '@/services/bible/types';

export type StarterVerse = {
  /** Stable key (React lists, in-flight dedupe). */
  id: string;
  range: RefRange;
};

function starter(bookId: string, chapter: number, verse: number, endVerse = verse): StarterVerse {
  return {
    id: `${bookId}.${chapter}.${verse}${endVerse === verse ? '' : `-${endVerse}`}`,
    range: { start: { bookId, chapter, verse }, end: { bookId, chapter, verse: endVerse } },
  };
}

/** Well-known single verses and short ranges; the first is the default. */
export const STARTER_VERSES: readonly StarterVerse[] = [
  starter('John', 3, 16),
  starter('Ps', 23, 1),
  starter('Phil', 4, 13),
  starter('Rom', 8, 28),
  starter('Prov', 3, 5, 6),
  starter('Josh', 1, 9),
  starter('Isa', 40, 31),
  starter('Matt', 11, 28),
];

/** What "Try it with …" starts when there is no card to choose from. */
export const DEFAULT_STARTER: StarterVerse = STARTER_VERSES[0];

/** Starter verses read in ESV when it can be had… */
export const STARTER_TRANSLATION_ID = 'esv';
/** …and in bundled KJV otherwise, so the quick start always works offline. */
export const STARTER_FALLBACK_TRANSLATION_ID = 'kjv';

/** How long the preferred translation gets before the fallback is used. */
export const STARTER_FETCH_TIMEOUT_MS = 4000;

export type StarterPassage = {
  starter: StarterVerse;
  /** The translation the text actually came from. */
  translationId: string;
  verses: Verse[];
};

type ReadPassage = (translationId: string, range: RefRange) => Promise<Verse[]>;

/**
 * Reads every starter in the preferred translation, or — if it is not
 * available, any read fails or comes back empty, or the lot takes longer
 * than `timeoutMs` — every starter in the bundled fallback. All or nothing,
 * so a set of cards never mixes translations.
 */
export async function resolveStarterPassages(
  starters: readonly StarterVerse[],
  options: {
    /** False skips the preferred translation entirely (no key, or the caller already fell back). */
    preferredAvailable: boolean;
    read: ReadPassage;
    timeoutMs?: number;
  }
): Promise<StarterPassage[]> {
  const { preferredAvailable, read, timeoutMs = STARTER_FETCH_TIMEOUT_MS } = options;
  const readAll = (translationId: string) =>
    Promise.all(
      starters.map(async (s) => {
        const verses = await read(translationId, s.range);
        if (verses.length === 0) throw new Error(`No text for starter ${s.id} (${translationId})`);
        return { starter: s, translationId, verses };
      })
    );

  if (preferredAvailable) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        readAll(STARTER_TRANSLATION_ID),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Starter fetch timed out')), timeoutMs);
        }),
      ]);
    } catch {
      // Offline, slow, or the API said no — the bundled text is right here.
    } finally {
      clearTimeout(timer);
    }
  }
  return readAll(STARTER_FALLBACK_TRANSLATION_ID);
}
