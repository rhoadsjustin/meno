/**
 * Translation catalog logic, pure and unit-tested: which language section a
 * translation belongs to, how the picker orders sections, and how a search
 * narrows them. Language ids are BCP 47, as the YouVersion Platform speaks
 * them (docs/02-architecture.md §5).
 */
import { BOOKS } from '@/services/bible/canon';
import type { Translation, TranslationSource } from '@/services/bible/types';

export type LanguageInfo = {
  /** Canonical BCP 47 id as the Platform lists it ('en', 'sr-Latn', 'pt-BR'). */
  id: string;
  /** Display name in the locale it was fetched for. */
  name: string;
  textDirection: 'ltr' | 'rtl';
};

export type TranslationSection = {
  languageId: string;
  title: string;
  translations: Translation[];
};

/** Region subtags the Platform keeps as distinct language ids. */
const REGIONAL_IDS = new Set(['es-419', 'es-ES', 'pt-BR', 'pt-PT', 'zh-Hant-HK', 'zh-Hant-TW']);

/**
 * The Platform language id a tag groups under: 'en-US' → 'en', 'sr-Latn' →
 * 'sr-Latn', 'pt-BR' → 'pt-BR' (one of the enumerated regional ids),
 * 'es-MX' → 'es' (the region-agnostic id is Latin American Spanish).
 */
export function languageKey(tag: string): string {
  if (REGIONAL_IDS.has(tag)) return tag;
  const [lang, ...rest] = tag.split('-');
  const script = rest.find((p) => /^[A-Za-z]{4}$/.test(p));
  const base = lang.toLowerCase();
  return script ? `${base}-${script[0].toUpperCase()}${script.slice(1).toLowerCase()}` : base;
}

/** Names to show before the Platform's localized list has been fetched. */
const FALLBACK_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  'es-ES': 'Spanish (Spain)',
  'es-419': 'Spanish (Latin America)',
  pt: 'Portuguese',
  'pt-BR': 'Portuguese (Brazil)',
  'pt-PT': 'Portuguese (Portugal)',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  nl: 'Dutch',
  pl: 'Polish',
  ru: 'Russian',
  uk: 'Ukrainian',
  'zh-Hans': 'Chinese (Simplified)',
  'zh-Hant': 'Chinese (Traditional)',
  ja: 'Japanese',
  ko: 'Korean',
  hi: 'Hindi',
  ar: 'Arabic',
  sw: 'Swahili',
  tl: 'Tagalog',
  id: 'Indonesian',
  vi: 'Vietnamese',
};

export function languageTitle(id: string, languages: ReadonlyMap<string, LanguageInfo>): string {
  return languages.get(id)?.name ?? FALLBACK_NAMES[id] ?? id;
}

/** The device's language first, then English; deduplicated. */
export function preferredLanguageIds(deviceLocale: string | undefined, fallback = 'en'): string[] {
  const out: string[] = [];
  if (deviceLocale) out.push(languageKey(deviceLocale));
  if (!out.includes(fallback)) out.push(fallback);
  return out;
}

/** Offline text first, then cached, then what needs a connection each time. */
const SOURCE_RANK: Record<TranslationSource, number> = { bundled: 0, esv_api: 1, youversion: 2 };

function compareTranslations(a: Translation, b: Translation): number {
  const bySource = SOURCE_RANK[a.source] - SOURCE_RANK[b.source];
  return bySource !== 0 ? bySource : a.name.localeCompare(b.name);
}

/**
 * Sections for the picker: one per language, the preferred languages first
 * in the order given, the rest alphabetical by title.
 */
export function groupByLanguage(
  translations: readonly Translation[],
  languages: ReadonlyMap<string, LanguageInfo>,
  preferred: readonly string[],
): TranslationSection[] {
  const byLanguage = new Map<string, Translation[]>();
  for (const t of translations) {
    const key = languageKey(t.languageCode);
    const list = byLanguage.get(key);
    if (list) list.push(t);
    else byLanguage.set(key, [t]);
  }
  const rank = new Map(preferred.map((id, i) => [id, i]));
  const sections: TranslationSection[] = [...byLanguage].map(([languageId, list]) => ({
    languageId,
    title: languageTitle(languageId, languages),
    translations: list.sort(compareTranslations),
  }));
  return sections.sort((a, b) => {
    const ra = rank.get(a.languageId) ?? Number.POSITIVE_INFINITY;
    const rb = rank.get(b.languageId) ?? Number.POSITIVE_INFINITY;
    if (ra !== rb) return ra - rb;
    return a.title.localeCompare(b.title);
  });
}

/** Case- and accent-insensitive "contains". */
export function matchesQuery(text: string, query: string): boolean {
  const q = fold(query);
  return q.length === 0 || fold(text).includes(q);
}

function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .trim();
}

/** A language as the picker lists it: its title and how many versions it has. */
export type LanguageSummary = { id: string; title: string; count: number };

export function summarizeLanguages(sections: readonly TranslationSection[]): LanguageSummary[] {
  return sections.map((s) => ({ id: s.languageId, title: s.title, count: s.translations.length }));
}

export type TranslationHit = {
  translation: Translation;
  languageId: string;
  languageTitle: string;
};

export type CatalogSearch = { translations: TranslationHit[]; languages: LanguageSummary[] };

/** True when some word of `text` starts with the query ("bible" in "Berean Standard Bible"). */
function wordStartsWith(text: string, q: string): boolean {
  const f = fold(text);
  return f.startsWith(q) || f.split(/[\s\-–—(),.·/]+/u).some((w) => w.startsWith(q));
}

/**
 * The picker's search, across every language at once. Translations match on
 * name or abbreviation, best first: the exact abbreviation ("niv"), then a
 * word starting with the query, then the query anywhere. A language whose
 * name has a word starting with the query also brings in all its versions
 * ("span" lists the Spanish ones), after the direct matches. Languages match
 * on name or id. Ties keep the sections' order, so preferred languages lead.
 */
export function searchCatalog(
  sections: readonly TranslationSection[],
  query: string,
): CatalogSearch {
  const q = fold(query);
  if (q.length === 0) return { translations: [], languages: summarizeLanguages(sections) };
  const scored: { hit: TranslationHit; score: number; order: number }[] = [];
  const languages: { summary: LanguageSummary; score: number; order: number }[] = [];
  let order = 0;
  for (const s of sections) {
    const languageWord = wordStartsWith(s.title, q) || fold(s.languageId) === q;
    if (languageWord || fold(s.title).includes(q)) {
      languages.push({
        summary: { id: s.languageId, title: s.title, count: s.translations.length },
        score: fold(s.title).startsWith(q) || fold(s.languageId) === q ? 0 : 1,
        order: order++,
      });
    }
    for (const translation of s.translations) {
      const abbrev = fold(translation.abbrev);
      const name = fold(translation.name);
      let score: number;
      if (abbrev === q) score = 0;
      else if (abbrev.startsWith(q) || wordStartsWith(translation.name, q)) score = 1;
      else if (abbrev.includes(q) || name.includes(q)) score = 2;
      else if (languageWord) score = 3;
      else continue;
      scored.push({
        hit: { translation, languageId: s.languageId, languageTitle: s.title },
        score,
        order: order++,
      });
    }
  }
  const byScore = <T extends { score: number; order: number }>(a: T, b: T) =>
    a.score - b.score || a.order - b.order;
  return {
    translations: scored.sort(byScore).map((x) => x.hit),
    languages: languages.sort(byScore).map((x) => x.summary),
  };
}

/** How much of the Bible a version has, in words a row can say. */
export type Coverage =
  { kind: 'full' } | { kind: 'ot' } | { kind: 'nt' } | { kind: 'books'; count: number };

const NT_IDS = BOOKS.filter((b) => b.testament === 'nt').map((b) => b.id);
const OT_IDS = BOOKS.filter((b) => b.testament === 'ot').map((b) => b.id);

export function translationCoverage(t: Pick<Translation, 'books'>): Coverage {
  if (!t.books) return { kind: 'full' };
  const has = new Set(t.books);
  const allNt = NT_IDS.every((id) => has.has(id));
  const allOt = OT_IDS.every((id) => has.has(id));
  if (allNt && allOt) return { kind: 'full' };
  if (allNt && has.size === NT_IDS.length) return { kind: 'nt' };
  if (allOt && has.size === OT_IDS.length) return { kind: 'ot' };
  return { kind: 'books', count: has.size };
}
