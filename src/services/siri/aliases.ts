/**
 * The names a book goes by when someone says or types a reference to Siri
 * ("First Corinthians", "1ra de Corintios", "Psalm"). Pure data + string
 * work; the native parser (native/siri/ScriptureReference.swift) matches a
 * request against these, so a name it should understand is added here.
 */
import type { Language } from '@/i18n';

/** A book's name in one UI language. */
export type LocalizedName = { language: Language; name: string };

/** Ways to say the number in "1 Samuel", by language, for 1, 2 and 3. */
const ORDINALS: Record<Language, readonly (readonly string[])[]> = {
  en: [
    ['1', '1st', 'first'],
    ['2', '2nd', 'second'],
    ['3', '3rd', 'third'],
  ],
  es: [
    ['1', '1ra', '1a', '1ro', '1o', 'primera', 'primero', 'primer'],
    ['2', '2da', '2a', '2do', '2o', 'segunda', 'segundo'],
    ['3', '3ra', '3a', '3ro', '3o', 'tercera', 'tercero', 'tercer'],
  ],
};

/** Joining words between the number and the name ("1ra de Juan"). */
const JOINERS: Record<Language, readonly string[]> = { en: [''], es: ['', 'de'] };

/** Common names the catalogs don't carry: singulars and other titles. */
const EXTRA: Record<string, readonly string[]> = {
  Ps: ['Psalm', 'Salmo'],
  Prov: ['Proverb', 'Proverbio'],
  Song: ['Song of Songs', 'Canticles', 'Cantar de los Cantares'],
  Lam: ['Lamentation'],
  Acts: ['Acts of the Apostles', 'Hechos de los Apóstoles'],
  Rev: ['Revelations', 'Apocalypse'],
};

/**
 * How the native parser compares names: lowercase, accents removed, anything
 * but letters and digits a word break. Kept in step with
 * `ScriptureReferenceParser.tokens` so the tests here can find two books
 * claiming one name.
 */
export function normalizeAlias(alias: string): string {
  return alias
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * Every form of a book's name, most canonical first, without duplicates
 * (after normalization). `names` is the book's name in each UI language;
 * numbered books get each language's ordinals.
 */
export function bookAliases(bookId: string, names: readonly LocalizedName[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (alias: string) => {
    const key = normalizeAlias(alias);
    if (key === '' || seen.has(key)) return;
    seen.add(key);
    out.push(alias);
  };

  for (const { language, name } of names) {
    add(name);
    const numbered = /^([123]) (.+)$/.exec(name);
    if (!numbered) continue;
    const base = numbered[2];
    for (const ordinal of ORDINALS[language][Number(numbered[1]) - 1]) {
      for (const joiner of JOINERS[language]) {
        add([ordinal, joiner, base].filter(Boolean).join(' '));
      }
    }
  }
  for (const extra of EXTRA[bookId] ?? []) add(extra);
  // The OSIS id itself, and "1 Cor" for "1Cor".
  add(bookId);
  add(bookId.replace(/^([123])/, '$1 '));
  return out;
}
