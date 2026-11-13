/** Widget text, rendered in the app process and passed to the widget as props. */
export default {
  streakCaption_one: 'day streak',
  streakCaption_other: 'day streak',
  dueBadge_one: '{{count}} due',
  dueBadge_other: '{{count}} due',
  memorizedNote: 'You know this one.',
  fromMemoryNote: 'From memory.',
  emptyPrompt: 'Pick a passage to begin.',
  /** The inline Lock Screen slot: one short line. */
  inlineEmpty: 'Pick a passage',
  dueList: 'Due: {{refs}}',
  nothingDue: 'Nothing due — well kept.',
  /** VoiceOver, in place of the count and its flame or dot. */
  streakLabelActive_one: '{{count}}-day streak, practiced today',
  streakLabelActive_other: '{{count}}-day streak, practiced today',
  streakLabelPending_one: '{{count}}-day streak, not yet practiced today',
  streakLabelPending_other: '{{count}}-day streak, not yet practiced today',
  streakLabelNone: 'No streak yet',
  /** VoiceOver, in place of the week grid's squares. */
  weekLabel: 'Practiced {{practiced}} of the last {{days}} days',
} as const;
