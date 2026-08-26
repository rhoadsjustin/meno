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
export type TranslationSource = 'bundled' | 'api_bible' | 'esv_api';

export type Translation = {
  id: string;
  abbrev: string;
  name: string;
  languageCode: string;
  licenseType: LicenseType;
  source: TranslationSource;
  isDownloaded: boolean;
  /** Rendered wherever text appears (reader footer, quiz footer, widget). */
  attribution: string;
};

export type Verse = Ref & { text: string; translationId: string };
