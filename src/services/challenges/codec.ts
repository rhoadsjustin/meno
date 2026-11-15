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

/** Why a link can't be honored: the join screen picks its next step from it. */
export type ChallengeLinkReason =
  | 'malformed'
  | 'newerVersion'
  | 'unknownTranslation'
  | 'passageNotFound'
  | 'multipleBooks';

/** Thrown for links we can't honor; `message` is safe to show the user. */
export class ChallengeLinkError extends Error {
  readonly reason: ChallengeLinkReason;

  constructor(reason: ChallengeLinkReason) {
    super(t(`challenge:errors.${reason}`));
    this.reason = reason;
  }
}

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
    throw new ChallengeLinkError('malformed');
  }
  if (version > CHALLENGE_VERSION) {
    throw new ChallengeLinkError('newerVersion');
  }

  const code = (first(params.c) ?? '').toUpperCase();
  if (!CODE_RE.test(code)) {
    throw new ChallengeLinkError('malformed');
  }

  const translationId = first(params.t) ?? '';
  try {
    getTranslation(translationId);
  } catch {
    throw new ChallengeLinkError('unknownTranslation');
  }

  const startOsis = first(params.s);
  const endOsis = first(params.e);
  if (!startOsis || !endOsis) {
    throw new ChallengeLinkError('malformed');
  }
  let range: RefRange;
  try {
    range = { start: parseOsisRef(startOsis), end: parseOsisRef(endOsis) };
  } catch {
    throw new ChallengeLinkError('passageNotFound');
  }
  if (range.start.bookId !== range.end.bookId) {
    throw new ChallengeLinkError('multipleBooks');
  }
  if (compareRefs(range.start, range.end) > 0) {
    throw new ChallengeLinkError('passageNotFound');
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
      throw new ChallengeLinkError('malformed');
    }
  }
  return parseChallengeParams(params);
}

/**
 * The share-sheet message, link included. References and the goal name only —
 * verse text never leaves the app this way (02 §5, CLAUDE.md licensing
 * guardrail).
 */
export function challengeShareMessage(challenge: Challenge): string {
  return shareSentence(challenge, encodeChallengeUrl(challenge));
}

/** The same invitation without the link, for when the link is its own item. */
export function challengeShareText(challenge: Challenge): string {
  return shareSentence(challenge, null);
}

function shareSentence(challenge: Challenge, url: string | null): string {
  const values = {
    passage: formatRange(challenge.range),
    abbrev: getTranslation(challenge.translationId).abbrev,
  };
  const dated = challenge.targetDate
    ? { ...values, date: friendlyDate(challenge.targetDate) }
    : null;
  const message =
    url === null
      ? dated
        ? t('challenge:share.textDue', dated)
        : t('challenge:share.text', values)
      : dated
        ? t('challenge:share.messageDue', { ...dated, url })
        : t('challenge:share.message', { ...values, url });
  return isPassageTitle(challenge.title, challenge.range)
    ? message
    : t('challenge:share.named', { title: challenge.title, message });
}

/**
 * What the share sheet is handed. iOS takes the link as its own item, so the
 * sheet shows a link header and AirDrop, Messages and Mail get a URL rather
 * than a sentence with one inside. Android ignores `url`, so there the link
 * stays in the message.
 */
export function challengeShareContent(
  challenge: Challenge,
  platform: string,
): { message: string; url?: string } {
  return platform === 'ios'
    ? { message: challengeShareText(challenge), url: encodeChallengeUrl(challenge) }
    : { message: challengeShareMessage(challenge) };
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

/**
 * Where a challenge's target date stands for someone joining today:
 * - `none`: the link carries no date.
 * - `past`: the date has gone by (an old link); it is neither shown nor saved.
 * - `tight`: still ahead, but nearer than the passage's day estimate, so the
 *   date is something to aim for rather than a promise.
 * - `reachable`: the estimate fits before the date.
 * `today` is a local ISO date; `projectedDays` is the preview's estimate.
 */
export type TargetDateStanding = 'none' | 'past' | 'tight' | 'reachable';

export function targetDateStanding(
  targetDate: string | undefined,
  today: string,
  projectedDays: number,
): TargetDateStanding {
  if (!targetDate) return 'none';
  // ISO dates order as strings.
  if (targetDate < today) return 'past';
  return daysBetween(today, targetDate) < projectedDays ? 'tight' : 'reachable';
}

/** Whole calendar days from one local ISO date to a later one. */
function daysBetween(from: string, to: string): number {
  const utc = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(to) - utc(from)) / 86_400_000);
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
