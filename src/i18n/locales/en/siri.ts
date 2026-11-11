/**
 * Siri's replies to "Look up a verse", rendered in the app process and read
 * by the native intent (services/siri). The intent fills in the `{{…}}`
 * values per reply.
 */
export default {
  unparsed: 'I didn’t catch a reference. Try something like John 3:16.',
  noChapter: 'Which chapter and verse of {{book}}?',
  chapterOutOfRange: '{{book}} doesn’t have that chapter.',
  notFound: 'I couldn’t find {{ref}} in the {{abbrev}}.',
  substituted: 'I can’t read the {{abbrev}} from here, so this is the {{name}}.',
  unavailable: 'I can’t read the {{abbrev}} from here. Open Meno to read {{ref}}.',
  // Always more than one: the limit is services/siri SIRI_MAX_VERSES.
  truncated: 'Those are the first {{n}} verses.',
} as const;
