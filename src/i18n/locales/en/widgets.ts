/** Widget text, rendered in the app process and passed to the widget as props. */
export default {
  streakUnit_one: 'day',
  streakUnit_other: 'days',
  streakCaption_one: 'day streak',
  streakCaption_other: 'day streak',
  dueBadge_one: '{{count}} due',
  dueBadge_other: '{{count}} due',
  memorizedNote: 'You know this one.',
  fromMemoryNote: 'From memory.',
  emptyPrompt: 'Pick a passage to begin.',
  dueList: 'Due: {{refs}}',
  nothingDue: 'Nothing due — well kept.',
} as const;
