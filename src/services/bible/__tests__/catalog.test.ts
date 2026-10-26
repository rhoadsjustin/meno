import { describe, expect, it } from 'vitest';

import {
  filterLanguages,
  filterSections,
  groupByLanguage,
  languageKey,
  languageTitle,
  matchesQuery,
  preferredLanguageIds,
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

  it('keeps a whole section when its title matches, else only matching rows', () => {
    const sections = groupByLanguage(
      [
        t({ id: 'yv-111', languageCode: 'en', name: 'New International Version', abbrev: 'NIV' }),
        t({ id: 'yv-1588', languageCode: 'en', name: 'Amplified Bible', abbrev: 'AMP' }),
        t({ id: 'yv-128', languageCode: 'es', name: 'Nueva Versión Internacional', abbrev: 'NVI' }),
      ],
      languages,
      ['en'],
    );
    expect(filterSections(sections, 'span').map((s) => s.languageId)).toEqual(['es']);
    expect(filterSections(sections, 'span')[0].translations).toHaveLength(1);
    const byAbbrev = filterSections(sections, 'niv');
    expect(byAbbrev.map((s) => s.languageId)).toEqual(['en']);
    expect(byAbbrev[0].translations.map((x) => x.abbrev)).toEqual(['NIV']);
    expect(filterSections(sections, 'zzz')).toEqual([]);
  });

  it('narrows the unbrowsed languages and skips the ones already shown', () => {
    const list = [...languages.values()];
    expect(filterLanguages(list, new Set(['en']), '').map((l) => l.id)).toEqual(['es', 'ar']);
    expect(filterLanguages(list, new Set(), 'ara').map((l) => l.id)).toEqual(['ar']);
  });
});
