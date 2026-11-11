/**
 * The Siri context (pure): everything the native verse-lookup intent needs
 * that only the app knows. An App Intent runs with no JavaScript — React
 * Native starts when a scene connects, and Siri launches the app without one
 * — so the app decides these ahead of time and native/siri reads the result:
 *
 *  - the translation the user is memorizing in, and which bundled
 *    translation stands in when that one's text can't be read natively;
 *  - book names in every UI language, for parsing a spoken reference;
 *  - the wording of each reply, in the UI language (as the widget's copy is).
 *
 * No verse text is ever in the context.
 */
import { i18n, language, SUPPORTED_LANGUAGES, t } from '@/i18n';
import { BOOKS } from '@/services/bible/canon';
import { bookName } from '@/services/bible/refs';
import type { Translation } from '@/services/bible/types';
import { bookAliases } from '@/services/siri/aliases';

/** Bump when a field changes meaning; native/siri ignores versions it doesn't know. */
export const SIRI_CONTEXT_VERSION = 1;

/** Most verses one reply reads aloud (Psalm 23 is 6; John 3 is 36). */
export const SIRI_MAX_VERSES = 30;

export type SiriTranslation = Pick<
  Translation,
  'id' | 'abbrev' | 'name' | 'source' | 'attribution'
>;

export type SiriBook = {
  id: string;
  /** In the UI language — what Siri says and shows. */
  name: string;
  /** English — what the ESV API is asked with. */
  query: string;
  chapters: number;
  aliases: string[];
};

export type SiriContext = {
  version: number;
  translation: SiriTranslation;
  fallback: SiriTranslation | null;
  bundledDb: string;
  appDb: string;
  maxVerses: number;
  books: SiriBook[];
  copy: Record<
    | 'unparsed'
    | 'noChapter'
    | 'chapterOutOfRange'
    | 'notFound'
    | 'substituted'
    | 'unavailable'
    | 'truncated',
    string
  >;
};

const baseLanguage = (tag: string) => tag.toLowerCase().split(/[-_]/)[0];

function summary(tr: Translation): SiriTranslation {
  return {
    id: tr.id,
    abbrev: tr.abbrev,
    name: tr.name,
    source: tr.source,
    attribution: tr.attribution,
  };
}

/**
 * The bundled translation Siri reads from when `translation`'s own text
 * isn't on the device: one in the same language, the default translation
 * first. None for a bundled translation (it is read directly) or a language
 * with nothing bundled — a Spanish reader is not answered in English.
 */
export function siriFallback(
  translation: Translation,
  bundled: readonly Translation[],
  defaultId: string,
): Translation | null {
  if (translation.source === 'bundled') return null;
  const lang = baseLanguage(translation.languageCode);
  const same = bundled.filter(
    (b) => b.source === 'bundled' && baseLanguage(b.languageCode) === lang,
  );
  return same.find((b) => b.id === defaultId) ?? same[0] ?? null;
}

/** Book names for the parser: every UI language's name and its spoken forms. */
export function siriBooks(): SiriBook[] {
  return BOOKS.map((book) => ({
    id: book.id,
    name: bookName(book.id),
    query: book.name,
    chapters: book.chapters,
    aliases: bookAliases(
      book.id,
      // The UI language's names first, so they win a tie between languages.
      [language(), ...SUPPORTED_LANGUAGES.filter((l) => l !== language())].map((lng) => ({
        language: lng,
        name: i18n.getFixedT(lng, 'books')(book.id as 'Gen'),
      })),
    ),
  }));
}

export function buildSiriContext(input: {
  translation: Translation;
  bundled: readonly Translation[];
  defaultTranslationId: string;
  bundledDb: string;
  appDb: string;
}): SiriContext {
  const fallback = siriFallback(input.translation, input.bundled, input.defaultTranslationId);
  // The native side fills these in per reply, so they pass through as `{x}`.
  const slot = (name: string) => `{${name}}`;
  return {
    version: SIRI_CONTEXT_VERSION,
    translation: summary(input.translation),
    fallback: fallback ? summary(fallback) : null,
    bundledDb: input.bundledDb,
    appDb: input.appDb,
    maxVerses: SIRI_MAX_VERSES,
    books: siriBooks(),
    copy: {
      unparsed: t('siri:unparsed'),
      noChapter: t('siri:noChapter', { book: slot('book') }),
      chapterOutOfRange: t('siri:chapterOutOfRange', { book: slot('book') }),
      notFound: t('siri:notFound', { ref: slot('ref'), abbrev: slot('abbrev') }),
      substituted: t('siri:substituted', { abbrev: slot('abbrev'), name: slot('name') }),
      unavailable: t('siri:unavailable', { ref: slot('ref'), abbrev: slot('abbrev') }),
      // `n`, not `count`: i18next keeps `count` for plurals and wants a number.
      truncated: t('siri:truncated', { n: slot('count') }),
    },
  };
}
