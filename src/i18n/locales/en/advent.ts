/** The Advent plan (docs/11 §3): Today's card and the Sunday notices. */
export default {
  kicker: 'Advent',
  title: 'Memorize the Christmas story by Christmas',
  /** e.g. "Luke 2:1–14, a few verses each week of Advent." */
  body: '{{passage}}, a few verses each week of Advent.',
  start: 'Start {{passage}}',
  /** The shorter track, e.g. "Or a shorter one: Luke 2:8–14". */
  startShort: 'Or a shorter one: {{passage}}',
  dismiss: 'Not this year',
  dismissed: 'Advent plan hidden',
  /** The goal's name, e.g. "Advent: Luke 2:1–14". */
  goalTitle: 'Advent: {{passage}}',
  progress: {
    before: 'Advent begins Sunday',
    week: 'Advent, week {{week}} of 4',
    christmas: 'Christmas Day',
    thisWeek: 'This week: {{passage}}',
    /** The shorter track has no weekly portions. */
    byChristmas: '{{passage}} by Christmas',
    fromMemory: 'Say {{passage}} from memory',
    hint: 'Opens your Advent passage',
  },
  notification: {
    inviteTitle: 'Advent begins today',
    inviteBody: 'Memorize the Christmas story, {{passage}}, by Christmas.',
    weekTitle: 'Advent, week {{week}} of 4',
    weekBody: 'This week: {{passage}}.',
  },
} as const;
