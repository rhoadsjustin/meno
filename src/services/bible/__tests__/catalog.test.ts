import { describe, expect, it } from 'vitest';

import {
  groupByLanguage,
  languageKey,
  languageTitle,
  matchesQuery,
  preferredLanguageIds,
  searchCatalog,
  summarizeLanguages,
  translationCoverage,
  type LanguageInfo,
} from '@/services/bible/catalog';
import type { Translation } from '@/services/bible/types';

const t = (over: Partial<Translation> & Pick<Translation, 'id' | 'languageCode'>): Translation => ({
  abbrev: over.id.toUpperCase(),
  name: over.id,
  licenseType: 'api_ephemeral',
  source: 'youversion',
  isDownloaded: false,
  attribution: '',
  ...over,
});

const languages = new Map<string, LanguageInfo>([
  ['en', { id: 'en', name: 'English', textDirection: 'ltr' }],
  ['es', { id: 'es', name: 'Spanish', textDirection: 'ltr' }],
  ['ar', { id: 'ar', name: 'Arabic', textDirection: 'rtl' }],
]);

describe('languageKey', () => {
  it('drops regions the Platform does not distinguish', () => {
    expect(languageKey('en-US')).toBe('en');
    expect(languageKey('en-GB')).toBe('en');
    expect(languageKey('es-MX')).toBe('es');
  });
  it('keeps the enumerated regional ids and script subtags', () => {
    expect(languageKey('pt-BR')).toBe('pt-BR');
    expect(languageKey('es-ES')).toBe('es-ES');
    expect(languageKey('sr-Latn')).toBe('sr-Latn');
    expect(languageKey('zh-Hant-TW')).toBe('zh-Hant-TW');
    expect(languageKey('zh-hans-cn')).toBe('zh-Hans');
  });
});

describe('preferredLanguageIds', () => {
  it('puts the device language first and always includes English once', () => {
    expect(preferredLanguageIds('es-MX')).toEqual(['es', 'en']);
    expect(preferredLanguageIds('en-US')).toEqual(['en']);
    expect(preferredLanguageIds(undefined)).toEqual(['en']);
  });
});

describe('languageTitle', () => {
  it('prefers the fetched name, then a built-in one, then the id', () => {
    expect(languageTitle('es', languages)).toBe('Spanish');
    expect(languageTitle('fr', languages)).toBe('French');
    expect(languageTitle('kaq', languages)).toBe('kaq');
  });
});

describe('groupByLanguage', () => {
  const web = t({
    id: 'web',
    languageCode: 'en-US',
    source: 'bundled',
    licenseType: 'public_domain',
    name: 'World English Bible',
  });
  const kjv = t({
    id: 'kjv',
    languageCode: 'en-GB',
    source: 'bundled',
    licenseType: 'public_domain',
    name: 'King James Version',
  });
  const esv = t({
    id: 'esv',
    languageCode: 'en-US',
    source: 'esv_api',
    licenseType: 'api_cached',
    name: 'English Standard Version',
  });
  const niv = t({ id: 'yv-111', languageCode: 'en', name: 'New International Version' });
  const amp = t({ id: 'yv-1588', languageCode: 'en', name: 'Amplified Bible' });
  const nvi = t({ id: 'yv-128', languageCode: 'es', name: 'Nueva Versión Internacional' });
  const arb = t({ id: 'yv-9', languageCode: 'ar', name: 'Arabic Bible' });

  it('merges regional English into one section and ranks offline text first', () => {
    const sections = groupByLanguage([niv, esv, amp, web, kjv], languages, ['en']);
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('English');
    expect(sections[0].translations.map((x) => x.id)).toEqual([
      'kjv',
      'web',
      'esv',
      'yv-1588',
      'yv-111',
    ]);
  });

  it('orders preferred languages first, then the rest alphabetically', () => {
    const sections = groupByLanguage([web, nvi, arb], languages, ['es', 'en']);
    expect(sections.map((s) => s.languageId)).toEqual(['es', 'en', 'ar']);
  });
});

describe('search', () => {
  it('ignores case and accents', () => {
    expect(matchesQuery('Nueva Versión Internacional', 'version')).toBe(true);
    expect(matchesQuery('Español', 'ESPANOL')).toBe(true);
    expect(matchesQuery('English', '')).toBe(true);
    expect(matchesQuery('English', 'esp')).toBe(false);
  });

  const sections = groupByLanguage(
    [
      t({ id: 'yv-111', languageCode: 'en', name: 'New International Version', abbrev: 'NIV' }),
      t({ id: 'yv-1588', languageCode: 'en', name: 'Amplified Bible', abbrev: 'AMP' }),
      t({ id: 'yv-59', languageCode: 'en', name: 'Lexham English Septuagint', abbrev: 'LES' }),
      t({ id: 'yv-128', languageCode: 'es', name: 'Nueva Versión Internacional', abbrev: 'NVI' }),
      t({ id: 'yv-9', languageCode: 'ar', name: 'Arabic Bible', abbrev: 'ARB' }),
    ],
    languages,
    ['en'],
  );
  const ids = (q: string) => searchCatalog(sections, q).translations.map((h) => h.translation.id);

  it('ranks an exact abbreviation, then word starts, then anywhere', () => {
    expect(ids('niv')).toEqual(['yv-111']);
    expect(ids('nvi')[0]).toBe('yv-128');
    // "bible" starts a word in two names; "ible" is only inside them.
    expect(ids('bible')).toEqual(['yv-1588', 'yv-9']);
    expect(ids('nation')).toEqual(['yv-111']);
  });

  it('brings in every version of a language named by the search', () => {
    const found = searchCatalog(sections, 'span');
    expect(found.languages.map((l) => l.id)).toEqual(['es']);
    expect(found.translations.map((h) => h.languageTitle)).toEqual(['Spanish']);
    // A language matched only inside a word ("anish" in "Spanish") is
    // listed, but its versions are not dragged into the translations.
    expect(searchCatalog(sections, 'anish').translations).toEqual([]);
    expect(searchCatalog(sections, 'anish').languages.map((l) => l.id)).toEqual(['es']);
  });

  it('finds a language by its id and counts its versions', () => {
    expect(searchCatalog(sections, 'en').languages).toEqual([
      { id: 'en', title: 'English', count: 3 },
    ]);
    expect(searchCatalog(sections, 'zzz')).toEqual({ translations: [], languages: [] });
  });

  it('summarizes every language with nothing searched', () => {
    expect(summarizeLanguages(sections).map((l) => `${l.id}:${l.count}`)).toEqual([
      'en:3',
      'ar:1',
      'es:1',
    ]);
    expect(searchCatalog(sections, '  ').translations).toEqual([]);
  });
});

describe('translationCoverage', () => {
  it('names a whole Bible, a testament, or a count of books', () => {
    expect(translationCoverage({})).toEqual({ kind: 'full' });
    const nt = [
      'Matt',
      'Mark',
      'Luke',
      'John',
      'Acts',
      'Rom',
      '1Cor',
      '2Cor',
      'Gal',
      'Eph',
      'Phil',
      'Col',
      '1Thess',
      '2Thess',
      '1Tim',
      '2Tim',
      'Titus',
      'Phlm',
      'Heb',
      'Jas',
      '1Pet',
      '2Pet',
      '1John',
      '2John',
      '3John',
      'Jude',
      'Rev',
    ];
    expect(translationCoverage({ books: nt })).toEqual({ kind: 'nt' });
    expect(translationCoverage({ books: ['Mark', 'Acts', 'Eph', 'Col'] })).toEqual({
      kind: 'books',
      count: 4,
    });
    expect(translationCoverage({ books: [...nt, 'Gen'] })).toEqual({ kind: 'books', count: 28 });
  });
});
