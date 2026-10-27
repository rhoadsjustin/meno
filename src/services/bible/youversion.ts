/**
 * YouVersion Platform (docs/02-architecture.md §5): the catalog of languages
 * and versions, and chapter text.
 *
 * Text from here is `api_ephemeral` by default — read for the current launch,
 * never written to the database — until a version's license has been read
 * and says otherwise. What the catalog cache stores is metadata only:
 * titles, copyright lines, which books a version has.
 *
 * Authentication is the app key alone (`X-YVP-App-Key`). Meno has no
 * sign-in, so no callback URI. The key lives in .env as
 * EXPO_PUBLIC_YOUVERSION_APP_KEY (never committed).
 */
import type { LanguageInfo } from '@/services/bible/catalog';
import { bookOrder, getBook, getBookByUsfm } from '@/services/bible/canon';
import { youversionTranslationId } from '@/services/bible/registry';
import type { Translation, Verse } from '@/services/bible/types';

export const YOUVERSION_API_BASE = 'https://api.youversion.com/v1';

export function youversionKeyConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_YOUVERSION_APP_KEY);
}

export class YouVersionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'YouVersionError';
  }
}

type Fetch = typeof fetch;

type Page<T> = { data: T[]; next_page_token?: string | null; total_size?: number };

/** Raw Platform shapes — only the fields read. */
export type YvLanguage = {
  id: string;
  localized_name?: string | null;
  text_direction?: string | null;
};

export type YvBible = {
  id: number;
  abbreviation: string;
  localized_abbreviation?: string | null;
  title: string;
  localized_title?: string | null;
  language_tag: string;
  copyright?: string | null;
  promotional_content?: string | null;
  publisher_url?: string | null;
  /** USFM ids; may include the deuterocanon. */
  books?: string[] | null;
  text_direction?: string | null;
};

type Params = Record<string, string | readonly string[]>;

type RequestOptions = { acceptLanguage?: string; fetchImpl?: Fetch };

/** Query string with repeated keys for the API's `name[]` arrays. */
export function buildQuery(params: Params): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') q.append(key, value);
    else for (const v of value) q.append(key, v);
  }
  return q.toString();
}

/**
 * One call. Resolves to nothing for a reply with no body: the Platform
 * answers 204 No Content, not an empty page, when a language has no version
 * this key may read.
 */
async function request<T>(
  path: string,
  params: Params,
  options: RequestOptions = {},
): Promise<T | undefined> {
  const key = process.env.EXPO_PUBLIC_YOUVERSION_APP_KEY;
  if (!key) throw new YouVersionError('YouVersion app key not configured', 0);
  const fetchImpl = options.fetchImpl ?? fetch;
  const query = buildQuery(params);
  const url = `${YOUVERSION_API_BASE}${path}${query ? `?${query}` : ''}`;
  const headers: Record<string, string> = { 'X-YVP-App-Key': key, Accept: 'application/json' };
  if (options.acceptLanguage) headers['Accept-Language'] = options.acceptLanguage;
  const res = await fetchImpl(url, { headers });
  if (!res.ok) throw await describeFailure(res);
  const text = await res.text();
  if (text.trim() === '') return undefined;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new YouVersionError(`Unreadable reply from YouVersion (${res.status})`, res.status);
  }
}

/** The Platform's error codes (developers.youversion.com/error-codes) in plain words. */
async function describeFailure(res: Response): Promise<YouVersionError> {
  switch (res.status) {
    case 401:
      return new YouVersionError('YouVersion app key missing or not recognized', 401);
    case 403:
      return new YouVersionError('This app key is not licensed for that Bible', 403);
    case 404:
      return new YouVersionError('Not found on the YouVersion Platform', 404);
    case 412:
      return new YouVersionError('This app has been archived on the YouVersion Platform', 412);
    case 422:
      return new YouVersionError(`YouVersion rejected the request: ${await safeText(res)}`, 422);
    case 429: {
      const wait = res.headers.get('Retry-After');
      return new YouVersionError(
        `YouVersion rate limit reached${wait ? ` — try again in ${wait}s` : ''}`,
        429,
      );
    }
    default:
      return new YouVersionError(`YouVersion API error ${res.status}`, res.status);
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 200);
  } catch {
    return '';
  }
}

/** Every page of a collection, following `next_page_token`. */
async function fetchAllPages<T>(
  path: string,
  params: Params,
  options: RequestOptions,
): Promise<T[]> {
  const out: T[] = [];
  let pageToken: string | null | undefined;
  for (let guard = 0; guard < 100; guard++) {
    const page = await request<Page<T>>(
      path,
      pageToken ? { ...params, page_token: pageToken } : params,
      options,
    );
    if (!page) break;
    out.push(...(page.data ?? []));
    pageToken = page.next_page_token;
    if (!pageToken) break;
  }
  return out;
}

/**
 * Every language the Platform has Bibles for, named in `locale`. One
 * request: `page_size=*` returns the whole collection when at most three
 * fields are asked for (the live API; its docs also mention `_`); a server
 * that refuses that form is paged instead.
 */
export async function fetchLanguages(locale: string, fetchImpl?: Fetch): Promise<LanguageInfo[]> {
  const options = { acceptLanguage: locale, fetchImpl };
  const fields = ['id', 'localized_name', 'text_direction'];
  let rows: YvLanguage[];
  try {
    const page = await request<Page<YvLanguage>>(
      '/languages',
      { bibles_available: 'true', page_size: '*', 'fields[]': fields },
      options,
    );
    rows = page?.data ?? [];
  } catch (e) {
    if (!(e instanceof YouVersionError && (e.status === 400 || e.status === 422))) throw e;
    rows = await fetchAllPages<YvLanguage>(
      '/languages',
      { bibles_available: 'true', page_size: '99', 'fields[]': fields },
      options,
    );
  }
  return rows.map(toLanguage).filter((l): l is LanguageInfo => l !== null);
}

export function toLanguage(l: YvLanguage): LanguageInfo | null {
  if (!l.id) return null;
  return {
    id: l.id,
    name: (l.localized_name ?? '').trim() || l.id,
    textDirection: l.text_direction === 'rtl' ? 'rtl' : 'ltr',
  };
}

/**
 * The versions this app key may read in one language. `language_ranges[]`
 * is required by the API, and several ranges fall back rather than union,
 * so each language is its own request.
 */
export async function fetchBibles(
  languageId: string,
  fetchImpl?: Fetch,
  locale?: string,
): Promise<Translation[]> {
  const rows = await fetchAllPages<YvBible>(
    '/bibles',
    { 'language_ranges[]': [languageId], page_size: '99' },
    { fetchImpl, acceptLanguage: locale },
  );
  return rows.map(toTranslation);
}

/** One version's metadata (a goal or challenge naming a version the catalog lacks). */
export async function fetchBible(
  bibleId: number,
  fetchImpl?: Fetch,
  locale?: string,
): Promise<Translation> {
  const row = await request<YvBible>(
    `/bibles/${bibleId}`,
    {},
    { fetchImpl, acceptLanguage: locale },
  );
  if (!row) throw new YouVersionError('Not found on the YouVersion Platform', 404);
  return toTranslation(row);
}

/**
 * A Platform version as a registry entry. Ephemeral until its license is
 * read (02 §5); books outside the 66-book canon are dropped; a version with
 * every book has no `books` list at all.
 */
export function toTranslation(b: YvBible): Translation {
  const books = (b.books ?? [])
    .map((usfm) => getBookByUsfm(usfm)?.id)
    .filter((id): id is string => Boolean(id))
    .sort((x, y) => bookOrder(x) - bookOrder(y));
  const name = (b.localized_title ?? '').trim() || b.title.trim();
  const abbrev = (b.localized_abbreviation ?? '').trim() || b.abbreviation.trim();
  return {
    id: youversionTranslationId(b.id),
    abbrev,
    name,
    languageCode: b.language_tag,
    licenseType: 'api_ephemeral',
    source: 'youversion',
    isDownloaded: false,
    attribution: attributionLine(name, b.copyright, b.promotional_content),
    ...(books.length > 0 && books.length < 66 ? { books } : {}),
    textDirection: b.text_direction === 'rtl' ? 'rtl' : 'ltr',
  };
}

/**
 * What to print under the text (Display Bible HTML guide): the publisher's
 * copyright line, else its longer promotional text, else the version's own
 * name — a public-domain text with neither still says what it is.
 */
export function attributionLine(
  name: string,
  copyright?: string | null,
  promotional?: string | null,
): string {
  const line = (copyright ?? '').trim() || (promotional ?? '').trim() || name.trim();
  return line.endsWith('.') ? line : `${line}.`;
}

/** A whole chapter, as verses. The API serves a chapter as one passage. */
export async function fetchYouVersionChapter(
  translationId: string,
  bibleId: number,
  bookId: string,
  chapter: number,
  fetchImpl?: Fetch,
): Promise<Verse[]> {
  const book = getBook(bookId);
  const passage = await request<{ content?: string }>(
    `/bibles/${bibleId}/passages/${book.usfm}.${chapter}`,
    { format: 'html' },
    { fetchImpl },
  );
  const verses = parsePassageHtml(passage?.content ?? '', { translationId, bookId, chapter });
  if (verses.length === 0) {
    throw new YouVersionError(`No verse text in ${book.name} ${chapter}`, 0);
  }
  return verses;
}

/* ------------------------------------------------------------------------ */
/* Passage HTML → verses (pure)                                              */
/* ------------------------------------------------------------------------ */

/**
 * Subtrees that are not verse text: verse-number labels, footnotes and
 * cross-references (`yv-n`), headings (`yv-h` and the USFM heading styles),
 * Psalm superscriptions (`d`), chapter labels and book introductions.
 */
const SKIP_CLASSES = new Set([
  'yv-vlbl',
  'vlbl',
  'va',
  'label',
  'yv-n',
  'note',
  'yv-h',
  'heading',
  's',
  's1',
  's2',
  's3',
  's4',
  'ms',
  'ms1',
  'ms2',
  'ms3',
  'mr',
  'sr',
  'sp',
  'qa',
  'r',
  'd',
  'cl',
  'yv-cl',
  'imt',
  'imt1',
  'imt2',
  'is',
  'is1',
  'ip',
  'io',
  'io1',
  'ili',
  'ili1',
  'iex',
  'ie',
]);

const BLOCK_TAGS = new Set([
  'div',
  'p',
  'br',
  'tr',
  'td',
  'th',
  'li',
  'table',
  'h1',
  'h2',
  'h3',
  'h4',
  'blockquote',
  'section',
]);

const VOID_TAGS = new Set(['br', 'img', 'hr', 'wbr', 'input', 'meta', 'link']);

const TOKEN_RE =
  /<!--[\s\S]*?-->|<\/?([a-zA-Z][\w:-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>|([^<]+)/g;

const ATTR_RE = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ldquo: '“',
  rdquo: '”',
  lsquo: '‘',
  rsquo: '’',
  mdash: '—',
  ndash: '–',
  hellip: '…',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body[0] === '#') {
      const code =
        body[1] === 'x' || body[1] === 'X'
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[body] ?? whole;
  });
}

function parseAttrs(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of text.matchAll(ATTR_RE)) {
    out[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return out;
}

/**
 * The verse an element starts, if any: the Platform marks a verse with
 * `class="yv-v" v="16"` (the Swift SDK also accepts `verse`); the Bible App's
 * older markup carries it in `data-usfm="JHN.3.16"`. A bridged `v="17-18"`
 * counts as its first verse.
 */
function verseStart(classes: readonly string[], attrs: Record<string, string>): number | null {
  if (!classes.includes('yv-v') && !classes.includes('verse')) return null;
  const v = attrs.v ?? attrs['data-usfm']?.split('.').pop() ?? '';
  const n = parseInt(v, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Verse text out of the API's chapter HTML (`format=html`). Text between
 * one verse marker and the next belongs to that verse, wherever the
 * paragraph breaks fall; labels, notes and headings are dropped; a verse
 * split across paragraphs is joined with a space.
 */
export function parsePassageHtml(
  html: string,
  at: { translationId: string; bookId: string; chapter: number },
): Verse[] {
  const texts = new Map<number, string[]>();
  const stack: { name: string; skipped: boolean }[] = [];
  let current: number | null = null;
  let skipDepth = 0;

  const push = (s: string) => {
    if (current === null || s.length === 0) return;
    const parts = texts.get(current);
    if (parts) parts.push(s);
    else texts.set(current, [s]);
  };

  for (const m of html.matchAll(TOKEN_RE)) {
    const [raw, tagName, attrText, text] = m;
    if (raw.startsWith('<!--')) continue;
    if (text !== undefined) {
      if (skipDepth === 0) push(decodeEntities(text));
      continue;
    }
    const name = tagName.toLowerCase();
    if (raw.startsWith('</')) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].name === name) {
          for (const popped of stack.splice(i)) if (popped.skipped) skipDepth--;
          break;
        }
      }
      if (BLOCK_TAGS.has(name)) push(' ');
      continue;
    }
    const attrs = parseAttrs(attrText ?? '');
    const classes = (attrs.class ?? '').split(/\s+/).filter(Boolean);
    if (BLOCK_TAGS.has(name)) push(' ');
    const verse = verseStart(classes, attrs);
    if (verse !== null) current = verse;
    const selfClosing = VOID_TAGS.has(name) || raw.endsWith('/>');
    if (!selfClosing) {
      const skipped = classes.some((c) => SKIP_CLASSES.has(c));
      stack.push({ name, skipped });
      if (skipped) skipDepth++;
    }
  }

  return [...texts]
    .map(([verse, parts]) => ({
      translationId: at.translationId,
      bookId: at.bookId,
      chapter: at.chapter,
      verse,
      text: parts.join('').replace(/\s+/g, ' ').trim(),
    }))
    .filter((v) => v.text.length > 0)
    .sort((a, b) => a.verse - b.verse);
}
