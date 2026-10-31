import { describe, expect, it } from 'vitest';

import {
  androidOverlays,
  applyLocale,
  i18n,
  locale,
  overlay,
  resolveLanguage,
  resources,
  t,
} from '@/i18n';
import { formatRange, formatRef } from '@/services/bible/refs';

type Tree = { [key: string]: string | Tree };

function leaves(tree: Tree, prefix = ''): [string, string][] {
  return Object.entries(tree).flatMap(([k, v]) =>
    typeof v === 'string' ? [[prefix + k, v] as [string, string]] : leaves(v, `${prefix}${k}.`),
  );
}

const placeholders = (s: string) => [...s.matchAll(/\{\{\s*(\w+)/g)].map((m) => m[1]).sort();

describe('catalogs', () => {
  const en = new Map(leaves(resources.en as unknown as Tree));
  const es = new Map(leaves(resources.es as unknown as Tree));

  it('Spanish has every English key and nothing else', () => {
    expect([...es.keys()].sort()).toEqual([...en.keys()].sort());
  });

  it('no Spanish string is empty or left in English by mistake', () => {
    for (const [key, value] of es) {
      expect(value.trim(), key).not.toBe('');
    }
  });

  it('Spanish keeps every interpolation placeholder', () => {
    for (const [key, value] of en) {
      expect(placeholders(es.get(key) ?? ''), key).toEqual(placeholders(value));
    }
  });
});

describe('Android overlays', () => {
  const en = new Map(leaves(resources.en as unknown as Tree));
  const enAndroid = new Map(leaves(androidOverlays.en as unknown as Tree));
  const esAndroid = new Map(leaves(androidOverlays.es as unknown as Tree));

  it('only replace strings the English catalog already has', () => {
    for (const key of enAndroid.keys()) expect(en.has(key), key).toBe(true);
  });

  it('Spanish overrides exactly the strings English does', () => {
    expect([...esAndroid.keys()].sort()).toEqual([...enAndroid.keys()].sort());
  });

  it('keep the placeholders of the string they replace', () => {
    for (const [key, value] of enAndroid) {
      expect(placeholders(value), key).toEqual(placeholders(en.get(key) ?? ''));
      expect(placeholders(esAndroid.get(key) ?? ''), key).toEqual(placeholders(value));
    }
  });

  it('overlay replaces leaves and keeps their siblings', () => {
    const merged = overlay({ a: { b: 'x', c: 'y' }, d: 'z' }, { a: { b: 'X' } });
    expect(merged).toEqual({ a: { b: 'X', c: 'y' }, d: 'z' });
  });

  it('no Android string mentions the iPhone', () => {
    for (const [key, value] of [...enAndroid, ...esAndroid]) {
      expect(value, key).not.toMatch(/iPhone/);
    }
  });
});

describe('language resolution', () => {
  it('picks the first supported language', () => {
    expect(resolveLanguage(['fr-FR', 'es-MX', 'en-US'])).toBe('es');
    expect(resolveLanguage(['de-DE'])).toBe('en');
    expect(resolveLanguage(['es_419'])).toBe('es');
  });

  it('formats references in the UI language and keeps the regional locale', () => {
    applyLocale(['es-MX']);
    expect(locale()).toBe('es-MX');
    expect(formatRef({ bookId: 'John', chapter: 3, verse: 16 })).toBe('Juan 3:16');
    expect(t('common:verseCount', { count: 2 })).toBe('2 versículos');
    expect(
      formatRange({
        start: { bookId: 'Song', chapter: 2, verse: 1 },
        end: { bookId: 'Song', chapter: 2, verse: 4 },
      }),
    ).toBe('Cantares 2:1–4');
    applyLocale(['en-US']);
    expect(i18n.language).toBe('en');
    expect(formatRef({ bookId: 'John', chapter: 3, verse: 16 })).toBe('John 3:16');
  });
});
