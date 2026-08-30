/**
 * Challenge link codec (docs/06 §5, backendless slice). A challenge link
 * carries references only — never verse text — so links are license-safe
 * for every translation (02 §5). Pure: no React Native or database imports.
 *
 * Link shape: meno://challenge?v=1&c=CODE&t=web&s=Phil.4.4&e=Phil.4.9&n=Title&d=2026-12-25
 * The `c` code is the shared identifier both participants' goals store in
 * `goals.challengeId`, so M8's server sync can join them later.
 */
import { compareRefs, formatRange, parseOsisRef, refToOsis } from '@/services/bible/refs';
import { getTranslation } from '@/services/bible/registry';
import type { RefRange } from '@/services/bible/types';

export type Challenge = {
  /** Shared code linking participants' goals (goals.challengeId). */
  code: string;
  translationId: string;
  range: RefRange;
  title: string;
  /** Local ISO date (YYYY-MM-DD); absent when the goal has no target. */
  targetDate?: string;
};

export const CHALLENGE_VERSION = 1;
export const CHALLENGE_URL_ROOT = 'meno://challenge';

const CODE_RE = /^[A-Z0-9]{4,16}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TITLE_MAX = 80;

/** Thrown for links we can't honor; `message` is safe to show the user. */
export class ChallengeLinkError extends Error {}

export function encodeChallengeUrl(challenge: Challenge): string {
  const params: [string, string][] = [
    ['v', String(CHALLENGE_VERSION)],
    ['c', challenge.code],
    ['t', challenge.translationId],
    ['s', refToOsis(challenge.range.start)],
    ['e', refToOsis(challenge.range.end)],
    ['n', challenge.title],
  ];
  if (challenge.targetDate) params.push(['d', challenge.targetDate]);
  const query = params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return `${CHALLENGE_URL_ROOT}?${query}`;
}

type RawParams = Record<string, string | string[] | undefined>;

/**
 * Parses and validates the search params of a challenge link (the shape
 * expo-router's useLocalSearchParams provides). Throws ChallengeLinkError
 * with user-presentable messages.
 */
export function parseChallengeParams(params: RawParams): Challenge {
  const version = Number(first(params.v));
  if (!Number.isInteger(version) || version < 1) {
    throw new ChallengeLinkError('This challenge link is missing or malformed.');
  }
  if (version > CHALLENGE_VERSION) {
    throw new ChallengeLinkError('This challenge needs a newer version of Meno. Update the app and try the link again.');
  }

  const code = (first(params.c) ?? '').toUpperCase();
  if (!CODE_RE.test(code)) {
    throw new ChallengeLinkError('This challenge link is missing or malformed.');
  }

  const translationId = first(params.t) ?? '';
  try {
    getTranslation(translationId);
  } catch {
    throw new ChallengeLinkError('This challenge uses a translation this version of Meno doesn’t know.');
  }

  const startOsis = first(params.s);
  const endOsis = first(params.e);
  if (!startOsis || !endOsis) {
    throw new ChallengeLinkError('This challenge link is missing or malformed.');
  }
  let range: RefRange;
  try {
    range = { start: parseOsisRef(startOsis), end: parseOsisRef(endOsis) };
  } catch {
    throw new ChallengeLinkError('This challenge points at a passage Meno can’t find.');
  }
  if (range.start.bookId !== range.end.bookId) {
    throw new ChallengeLinkError('This challenge spans multiple books, which Meno doesn’t support yet.');
  }
  if (compareRefs(range.start, range.end) > 0) {
    throw new ChallengeLinkError('This challenge points at a passage Meno can’t find.');
  }

  const title = (first(params.n) ?? '').trim().slice(0, TITLE_MAX) || formatRange(range);

  const rawDate = first(params.d);
  const targetDate = rawDate && isRealIsoDate(rawDate) ? rawDate : undefined;

  return { code, translationId, range, title, ...(targetDate ? { targetDate } : {}) };
}

/** URL-string variant of parseChallengeParams (share previews, tests). */
export function parseChallengeUrl(url: string): Challenge {
  const query = url.split('?')[1] ?? '';
  const params: RawParams = {};
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const key = eq === -1 ? pair : pair.slice(0, eq);
    const value = eq === -1 ? '' : pair.slice(eq + 1);
    try {
      params[key] = decodeURIComponent(value.replace(/\+/g, ' '));
    } catch {
      throw new ChallengeLinkError('This challenge link is missing or malformed.');
    }
  }
  return parseChallengeParams(params);
}

/**
 * The share-sheet message. References and the goal name only — verse text
 * never leaves the app this way (02 §5, CLAUDE.md licensing guardrail).
 */
export function challengeShareMessage(challenge: Challenge): string {
  const passage = formatRange(challenge.range);
  const abbrev = getTranslation(challenge.translationId).abbrev;
  const named = challenge.title !== passage ? `“${challenge.title}” — ` : '';
  const due = challenge.targetDate ? ` by ${friendlyDate(challenge.targetDate)}` : '';
  return `${named}Memorize ${passage} (${abbrev}) with me${due} in Meno. Join my challenge: ${encodeChallengeUrl(challenge)}`;
}

/** Local-time Date for goals.targetDate (avoids the UTC-midnight off-by-one). */
export function challengeTargetDate(challenge: Challenge): Date | undefined {
  if (!challenge.targetDate) return undefined;
  const [y, m, d] = challenge.targetDate.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Local ISO date (YYYY-MM-DD) from a goal's stored target Date. */
export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function isRealIsoDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function friendlyDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
