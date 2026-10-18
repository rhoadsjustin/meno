/** Review session (spaced repetition of memorized verses). */
export default {
  title: 'Review',
  position: '{{index}} of {{total}}',
  closeLabel: 'Close review',
  emptyTitle: 'Nothing due for review',
  emptyBody: 'Memorized verses come back here as their review dates arrive.',
  roundHeader: 'Review · {{reference}}',
  almost: 'Almost',
  almostMarked: 'Almost — the slipped words are marked below',
  keptFresh_one: '{{count}} verse kept fresh',
  keptFresh_other: '{{count}} verses kept fresh',
} as const;
