/** The Reader (scrolling and book pose) and translation attributions. */
export default {
  /** Screen title: a book and chapter, e.g. "John 3". */
  title: '{{book}} {{chapter}}',
  chapter: 'Chapter {{chapter}}',
  /** The bar title when a link names no chapter to show. */
  screenTitle: 'Reader',
  /** The bar's menu, for VoiceOver: the book's chapters and the text size. */
  chapterMenu: 'Chapters and text size',
  textSize: 'Text size',
  textSmaller: 'Smaller',
  textLarger: 'Larger',
  textDefault: 'Default size',
  previousChapter: 'Previous chapter',
  nextChapter: 'Next chapter',
  /** The link under a chapter's last verse, e.g. "Next: John 4". */
  nextChapterNamed: 'Next: {{chapter}}',
  /** Offered on opening when reading had moved on, e.g. "Continue from John 5". */
  resume: 'Continue from {{chapter}}',
  /** Long-press on a verse: starts a passage at it (docs/07 §6). */
  memorize: 'Memorize this…',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  page: 'Page {{page}}',
  // VoiceOver: a page of the book pose opens with its number, and each verse
  // number is named ("Verse 2.") rather than read as a bare digit.
  pageSpoken: 'Page {{page}}.',
  verseSpoken: 'Verse {{verse}}.',
  verse: 'Verse {{verse}}. {{text}}',
  loadFailed: 'Couldn’t load {{chapter}}.',
  loadFailedTitle: 'This chapter didn’t load',
  loadingChapter: 'Loading {{chapter}}',
  badLinkTitle: 'This passage couldn’t be opened',
  badLinkMessage: 'The link doesn’t name a book and chapter of the Bible.',
  goToToday: 'Go to Today',
  /** Footer for the bundled public-domain translations. */
  // A catalog version whose details haven't loaded; named by number only.
  placeholderAbbrev: 'Bible {{n}}',
  placeholderName: 'Translation {{n}} (details not loaded yet)',
  publicDomainAttribution: '{{name}} ({{abbrev}}), public domain.',
} as const;
