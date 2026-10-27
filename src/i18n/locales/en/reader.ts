/** The Reader (scrolling and book pose) and translation attributions. */
export default {
  /** Screen title: a book and chapter, e.g. "John 3". */
  title: '{{book}} {{chapter}}',
  chapter: 'Chapter {{chapter}}',
  previousChapter: 'Previous chapter',
  nextChapter: 'Next chapter',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  page: 'Page {{page}}',
  loadFailed: 'Couldn’t load {{chapter}}.',
  /** Footer for the bundled public-domain translations. */
  // A catalog version whose details haven't loaded; named by number only.
  placeholderAbbrev: 'Bible {{n}}',
  placeholderName: 'Translation {{n}} (details not loaded yet)',
  publicDomainAttribution: '{{name}} ({{abbrev}}), public domain.',
} as const;
