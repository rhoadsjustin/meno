/**
 * Challenge link codec (docs/06 §5, backendless slice). A challenge link
 * carries references only — never verse text — so links are license-safe
 * for every translation (02 §5). Pure: no React Native or database imports.
 *
 * Link shape: https://meno-scripture.org/challenge?v=1&c=CODE&t=web&s=Phil.4.4&e=Phil.4.9&n=Title&d=2026-12-25
 * A universal link (docs/10 §10.1): it opens Meno when installed, and
 * site/challenge/ otherwise. Older `meno://challenge?…` links still parse —
 * only the part after `?` is read.
 * The `c` code is the shared identifier both participants' goals store in
 * `goals.challengeId`, so M8's server sync can join them later.
 */
import { i18n, locale, SUPPORTED_LANGUAGES, t, type Language } from '@/i18n';
import { bookName, compareRefs, formatRange, parseOsisRef, refToOsis } from '@/services/bible/refs';
import { getTranslation } from '@/services/bible/registry';
import type { RefRange } from '@/services/bible/types';

export type Challenge = {
  /** Shared code linking participants' goals (goals.challengeId). */
  code: string;
  translationId: string;
  range: RefRange;
  /**
   * The goal's name. When it is just the passage reference (see
   * `isPassageTitle`) the link leaves it out, so the receiver sees the
   * reference in their own language.
   */
  title: string;
  /** Local ISO date (YYYY-MM-DD); absent when the goal has no target. */
  targetDate?: string;
};

export const CHALLENGE_VERSION = 1;
export const CHALLENGE_URL_ROOT = 'https://meno-scripture.org/challenge';

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
  ];
  // Language-neutral: a title that is only the reference stays off the link.
  if (!isPassageTitle(challenge.title, challenge.range)) params.push(['n', challenge.title]);
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
    throw new ChallengeLinkError(t('challenge:errors.malformed'));
  }
  if (version > CHALLENGE_VERSION) {
    throw new ChallengeLinkError(t('challenge:errors.newerVersion'));
  }

  const code = (first(params.c) ?? '').toUpperCase();
  if (!CODE_RE.test(code)) {
    throw new ChallengeLinkError(t('challenge:errors.malformed'));
  }

  const translationId = first(params.t) ?? '';
  try {
    getTranslation(translationId);
  } catch {
    throw new ChallengeLinkError(t('challenge:errors.unknownTranslation'));
  }

  const startOsis = first(params.s);
  const endOsis = first(params.e);
  if (!startOsis || !endOsis) {
    throw new ChallengeLinkError(t('challenge:errors.malformed'));
  }
  let range: RefRange;
  try {
    range = { start: parseOsisRef(startOsis), end: parseOsisRef(endOsis) };
  } catch {
    throw new ChallengeLinkError(t('challenge:errors.passageNotFound'));
  }
  if (range.start.bookId !== range.end.bookId) {
    throw new ChallengeLinkError(t('challenge:errors.multipleBooks'));
  }
  if (compareRefs(range.start, range.end) > 0) {
    throw new ChallengeLinkError(t('challenge:errors.passageNotFound'));
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
      throw new ChallengeLinkError(t('challenge:errors.malformed'));
    }
  }
  return parseChallengeParams(params);
}

/**
 * The share-sheet message. References and the goal name only — verse text
 * never leaves the app this way (02 §5, CLAUDE.md licensing guardrail).
 */
export function challengeShareMessage(challenge: Challenge): string {
  const values = {
    passage: formatRange(challenge.range),
    abbrev: getTranslation(challenge.translationId).abbrev,
    url: encodeChallengeUrl(challenge),
  };
  const message = challenge.targetDate
    ? t('challenge:share.messageDue', { ...values, date: friendlyDate(challenge.targetDate) })
    : t('challenge:share.message', values);
  return isPassageTitle(challenge.title, challenge.range)
    ? message
    : t('challenge:share.named', { title: challenge.title, message });
}

/** The share sheet's subject line (mail and the like). */
export function challengeShareSubject(challenge: Challenge): string {
  return t('challenge:share.subject', { title: challenge.title });
}

/**
 * A range's reference in a given UI language. The book name is the only
 * language-dependent part of `formatRange`, so the rest is reused as is.
 */
export function formatRangeIn(range: RefRange, lng: Language): string {
  const here = formatRange(range);
  const local = bookName(range.start.bookId);
  if (range.start.bookId !== range.end.bookId || !here.startsWith(local)) return here;
  const name = i18n.t(`books:${range.start.bookId}` as 'books:Gen', { lng });
  return `${name}${here.slice(local.length)}`;
}

/**
 * True when a goal title is just its passage's reference, in any UI
 * language (or blank). Such titles are generated, not chosen, so they are
 * shown in the current language rather than the one they were made in.
 */
export function isPassageTitle(title: string, range: RefRange): boolean {
  const trimmed = title.trim();
  if (!trimmed || trimmed === formatRange(range)) return true;
  return SUPPORTED_LANGUAGES.some((lng) => trimmed === formatRangeIn(range, lng));
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

/** A local ISO date as the UI shows it, e.g. "December 25, 2026". */
export function friendlyDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale(), {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
