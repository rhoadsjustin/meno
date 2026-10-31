/**
 * Personas (docs/10 §3): an identity drawn from *when* and *how* someone
 * practiced — never how well, never against anyone else (06 §6).
 * First matching rule wins. Names and wording live in i18n (wrapped:persona).
 */
import type { Ref } from '@/services/bible/types';
import type { AttemptMode, PersonaCode } from '@/services/wrapped/types';

/** Fewer active days than this and the year is too short to describe. */
export const PERSONA_MIN_DAYS = 5;

export type PersonaFacts = {
  /** Local hour of each attempt, 0–23. */
  hours: readonly number[];
  modes: readonly AttemptMode[];
  activeDays: number;
  longestRun: number;
};

/** The verse each persona is paired with. Shown as text only when shareable. */
export const PERSONA_VERSES: Record<PersonaCode, Ref> = {
  morningWatch: { bookId: 'Ps', chapter: 5, verse: 3 },
  nightMeditator: { bookId: 'Ps', chapter: 63, verse: 6 },
  middayPause: { bookId: 'Ps', chapter: 55, verse: 17 },
  voiceInTheRoom: { bookId: 'Ps', chapter: 119, verse: 13 },
  faithfulKeeper: { bookId: 'Luke', chapter: 16, verse: 10 },
  steadyWalker: { bookId: 'Ps', chapter: 1, verse: 2 },
};

const isMorning = (h: number) => h >= 4 && h < 9;
const isNight = (h: number) => h >= 20 || h < 2;
const isMidday = (h: number) => h >= 11 && h < 14;

function share<T>(items: readonly T[], test: (item: T) => boolean): number {
  if (items.length === 0) return 0;
  return items.filter(test).length / items.length;
}

/** At most this many "also" personas join the main one (docs/10 §3). */
export const ALSO_PERSONAS_MAX = 2;

/**
 * Every persona the year earned, main one first: the time of day (at most
 * one: the windows don't overlap enough for two), then the voice, then
 * faithfulness. The Steady Walker only when nothing else fits. Empty when
 * the year is too short to describe.
 */
export function personasFor(facts: PersonaFacts): PersonaCode[] {
  if (facts.activeDays < PERSONA_MIN_DAYS || facts.hours.length === 0) return [];
  const earned: PersonaCode[] = [];
  if (share(facts.hours, isMorning) >= 0.5) earned.push('morningWatch');
  else if (share(facts.hours, isNight) >= 0.5) earned.push('nightMeditator');
  else if (share(facts.hours, isMidday) >= 0.4) earned.push('middayPause');
  if (share(facts.modes, (m) => m === 'speak') >= 0.3) earned.push('voiceInTheRoom');
  if (facts.longestRun >= 30) earned.push('faithfulKeeper');
  return earned.length > 0 ? earned : ['steadyWalker'];
}

/** The main persona, or null when the year is too short to describe. */
export function personaFor(facts: PersonaFacts): PersonaCode | null {
  return personasFor(facts)[0] ?? null;
}
