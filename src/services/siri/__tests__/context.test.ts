import { afterEach, describe, expect, it } from 'vitest';

import { applyLocale } from '@/i18n';
import { BOOKS } from '@/services/bible/canon';
import { getTranslation, TRANSLATIONS } from '@/services/bible/registry';
import type { Translation } from '@/services/bible/types';
import { bookAliases, normalizeAlias } from '@/services/siri/aliases';
import { buildSiriContext, siriBooks, siriFallback } from '@/services/siri/context';

const bundled = TRANSLATIONS.filter((t) => t.source === 'bundled');

const nvi: Translation = {
  id: 'yv-128',
  abbrev: 'NVI',
  name: 'Nueva Versión Internacional',
  languageCode: 'es',
  licenseType: 'api_ephemeral',
  source: 'youversion',
  isDownloaded: false,
  attribution: '© Biblica.',
};

const build = (translation: Translation) =>
  buildSiriContext({
    translation,
    bundled,
    defaultTranslationId: 'web',
    bundledDb: 'bundled.db',
    appDb: 'app.db',
  });

afterEach(() => applyLocale(['en-US']));

describe('bookAliases', () => {
  it('gives numbered books their spoken forms in each language', () => {
    const aliases = bookAliases('1Cor', [
      { language: 'en', name: '1 Corinthians' },
      { language: 'es', name: '1 Corintios' },
    ]);
    expect(aliases).toEqual(
      expect.arrayContaining([
        '1 Corinthians',
        'first Corinthians',
        '1st Corinthians',
        'primera Corintios',
        'primera de Corintios',
        '1Cor',
        '1 Cor',
      ]),
    );
  });

  it('adds singulars and other titles', () => {
    expect(bookAliases('Ps', [{ language: 'en', name: 'Psalms' }])).toEqual(
      expect.arrayContaining(['Psalms', 'Psalm', 'Salmo']),
    );
  });

  it('lists a name once however it is accented or cased', () => {
    const aliases = bookAliases('Job', [
      { language: 'en', name: 'Job' },
      { language: 'es', name: 'Job' },
    ]);
    expect(aliases).toEqual(['Job']);
  });
});

describe('normalizeAlias', () => {
  it('drops case, accents and punctuation', () => {
    expect(normalizeAlias('  Hechos de los Apóstoles ')).toBe('hechos de los apostoles');
    expect(normalizeAlias('1Cor')).toBe('1cor');
    expect(normalizeAlias('Song-of-Songs')).toBe('song of songs');
  });
});

describe('siriBooks', () => {
  it('covers the canon in order', () => {
    expect(siriBooks().map((b) => b.id)).toEqual(BOOKS.map((b) => b.id));
  });

  it('never gives two books the same name', () => {
    const owner = new Map<string, string>();
    for (const book of siriBooks()) {
      for (const alias of book.aliases) {
        const key = normalizeAlias(alias);
        expect(owner.get(key) ?? book.id, `"${alias}"`).toBe(book.id);
        owner.set(key, book.id);
      }
    }
  });

  it('has no alias that is an everyday word a request might start with', () => {
    // The parser takes the first book name it meets, so "what is John 3:16"
    // must not find Isaiah in "is".
    const words = ['is', 'a', 'in', 'the', 'what', 'read', 'me', 'of', 'to', 'say', 'does'];
    const all = new Set(siriBooks().flatMap((b) => b.aliases.map(normalizeAlias)));
    for (const word of words) expect(all.has(word), word).toBe(false);
  });

  it('names books in the UI language and understands both', () => {
    applyLocale(['es-MX']);
    const john = siriBooks().find((b) => b.id === 'John');
    expect(john?.name).toBe('Juan');
    expect(john?.query).toBe('John');
    expect(john?.aliases.slice(0, 2)).toEqual(['Juan', 'John']);
  });
});

describe('siriFallback', () => {
  it('is not needed for a bundled translation', () => {
    expect(siriFallback(getTranslation('kjv'), bundled, 'web')).toBeNull();
  });

  it('is the default translation for licensed English text', () => {
    expect(siriFallback(getTranslation('esv'), bundled, 'web')?.id).toBe('web');
  });

  it('is nothing when no bundled translation is in that language', () => {
    expect(siriFallback(nvi, bundled, 'web')).toBeNull();
  });
});

describe('buildSiriContext', () => {
  it('carries the translation, where its text is, and no verse text', () => {
    const context = build(getTranslation('esv'));
    expect(context.translation).toMatchObject({ id: 'esv', abbrev: 'ESV', source: 'esv_api' });
    expect(context.translation.attribution).toContain('Crossway');
    expect(context.fallback).toMatchObject({ id: 'web', source: 'bundled' });
    expect(context.bundledDb).toBe('bundled.db');
    expect(context.appDb).toBe('app.db');
    expect(context.books).toHaveLength(66);
  });

  it('leaves the slots the intent fills as {name}', () => {
    const { copy } = build(getTranslation('web'));
    expect(copy.notFound).toBe('I couldn’t find {ref} in the {abbrev}.');
    expect(copy.truncated).toBe('Those are the first {count} verses.');
    for (const line of Object.values(copy)) expect(line).not.toContain('{{');
  });

  it('writes the replies in the UI language', () => {
    applyLocale(['es-ES']);
    expect(build(nvi).copy.unavailable).toBe(
      'No puedo leer la {abbrev} desde aquí. Abre Meno para leer {ref}.',
    );
  });

  it('survives JSON, which is how the intent receives it', () => {
    const context = build(getTranslation('kjv'));
    expect(JSON.parse(JSON.stringify(context))).toEqual(context);
    // The bundled attribution is a getter on the registry entry.
    expect(context.translation.attribution).toContain('King James Version');
  });
});
