/**
 * Translation catalog logic, pure and unit-tested: which language section a
 * translation belongs to, how the picker orders sections, and how a search
 * narrows them. Language ids are BCP 47, as the YouVersion Platform speaks
 * them (docs/02-architecture.md §5).
 */
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

/**
 * Narrows sections to a search: a section whose title matches keeps all its
 * translations; otherwise only the translations whose name or abbreviation
 * matches stay, and empty sections drop out.
 */
export function filterSections(
  sections: readonly TranslationSection[],
  query: string,
): TranslationSection[] {
  if (fold(query).length === 0) return [...sections];
  const out: TranslationSection[] = [];
  for (const s of sections) {
    if (matchesQuery(s.title, query)) {
      out.push(s);
      continue;
    }
    const translations = s.translations.filter(
      (t) => matchesQuery(t.name, query) || matchesQuery(t.abbrev, query),
    );
    if (translations.length > 0) out.push({ ...s, translations });
  }
  return out;
}

/** Languages not yet browsed, narrowed by the same search. */
export function filterLanguages(
  languages: readonly LanguageInfo[],
  exclude: ReadonlySet<string>,
  query: string,
): LanguageInfo[] {
  return languages.filter((l) => !exclude.has(l.id) && matchesQuery(l.name, query));
}
