/** Review session (spaced repetition of memorized verses). */
export default {
  title: 'Review',
  position: '{{index}} of {{total}}',
  closeLabel: 'Close review',
  emptyTitle: 'Nothing due for review',
  emptyBody: 'Memorized verses come back here as their review dates arrive.',
  loadFailedTitle: 'Couldn’t load your reviews',
  loadFailedBody: 'Nothing is lost: the verses that are due will still be here.',
  roundHeader: 'Review · {{reference}}',
  almost: 'Almost',
  almostMarked: 'Almost — the slipped words are marked below',
  // Verses whose review held (SM-2 quality 3 or better); the rest were reset.
  keptFresh_one: '{{count}} verse kept fresh',
  keptFresh_other: '{{count}} verses kept fresh',
  comeBack_one: '{{count}} verse comes back tomorrow',
  comeBack_other: '{{count}} verses come back tomorrow',
} as const;
