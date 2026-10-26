/** Canonical verse reference used everywhere (docs/02-architecture.md §4). */
export type Ref = {
  /** OSIS book id, e.g. 'Gen', 'John', '1Cor'. */
  bookId: string;
  chapter: number;
  verse: number;
};

/** Inclusive verse range. */
export type RefRange = { start: Ref; end: Ref };

export type LicenseType = 'public_domain' | 'api_cached' | 'api_ephemeral';
export type TranslationSource = 'bundled' | 'youversion' | 'esv_api';

export type Translation = {
  id: string;
  abbrev: string;
  name: string;
  /** BCP 47 tag — also the locale handed to on-device speech recognition. */
  languageCode: string;
  licenseType: LicenseType;
  source: TranslationSource;
  isDownloaded: boolean;
  /** Rendered wherever text appears (reader footer, quiz footer, widget). */
  attribution: string;
  /**
   * OSIS ids of the books this translation has, in canonical order. Absent
   * means the whole 66-book canon; many YouVersion versions are a New
   * Testament or a few books.
   */
  books?: readonly string[];
  textDirection?: 'ltr' | 'rtl';
};

export type Verse = Ref & { text: string; translationId: string };
