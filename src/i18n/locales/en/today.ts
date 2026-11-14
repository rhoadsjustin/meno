/** Today tab: the focus passage, what's next, and the first-run empty state. */
export default {
  // Header streak ember (VoiceOver).
  streak_one: '{{count}} day streak',
  streak_other: '{{count}} day streak',
  streakSecured_one: '{{count}} day streak, secured today',
  streakSecured_other: '{{count}} day streak, secured today',
  focusLabel: 'On your widgets',
  nowOnWidgets: '{{title}} is now on your widgets.',
  widgetsFailed: 'Couldn’t put {{title}} on your widgets',
  // The first load failed, so there is nothing to show (never the empty state).
  loadFailed: {
    title: 'Couldn’t load Today',
    body: 'Your passages and progress are still on this device.',
  },

  empty: {
    titleFirst: 'Start with one verse',
    titleAgain: 'Ready for another passage?',
    // One body per case: it reads the same over the swipe deck and the stacked list.
    bodyFirst:
      'Pick one you may already half know and try it now — it takes a couple of minutes.',
    bodyAgain: 'Nothing is in progress. Start a verse now, or choose your own passage.',
    startFailed: 'That verse couldn’t be started. Try again, or choose your own passage.',
    startersFailed: 'The starter verses couldn’t be loaded.',
    chooseOwn: 'Choose my own passage',
  },

  hero: {
    // Where the verse sits in a longer passage.
    chunkPlace: 'Chunk {{index}} of {{total}}',
    placeAndDetail: '{{place}} · {{detail}}',
    spokenWithPlace: '{{spoken}} {{place}}.',
    passageFirstLetters: 'Current passage, {{ref}}, shown as first letters',
    passageFull: 'Current passage, {{ref}}. {{text}}',
    attribution: '{{ref}} · {{translation}}',
    sealSpoken: 'Optional. Still have {{ref}}? One clean recitation makes it memorized.',
    sealOffer: 'Still have {{ref}}? One recitation seals it — optional today.',
    recite: 'Recite {{ref}}',
    memorizedTitle: '{{title}} — memorized',
    memorizedBody: 'Every chunk is hidden in your heart. Start another passage?',
    chooseAnother: 'Choose another passage',
  },

  stitch: {
    title: 'Stitch it together',
    body: 'Recite everything you’ve learned so far as one passage.',
  },

  due: {
    title: 'Due for review',
    body_one: '{{count}} verse is ready to be kept fresh.',
    body_other: '{{count}} verses are ready to be kept fresh.',
    // The row's detail once the references are known: the first three, most overdue first.
    refs: '{{count}} to keep fresh: {{refs}}',
    refsAndMore: '{{count}} to keep fresh: {{refs}} and {{more}} more',
  },

  others: {
    header: 'Also practicing',
    chunkAndDetail: '{{ref}} · {{detail}}',
    allMemorized: 'Every chunk memorized',
    stitch: 'Stitch',
    stitchSpoken: 'Stitch {{title}}',
    stepSpoken: '{{title}}. {{spoken}}',
    sealSpoken: 'Optional. Seal {{ref}} with one clean recitation.',
    seal: 'Seal {{ref}}',
    showOnWidgetsSpoken: 'Show {{title}} on your widgets',
    showOnWidgets: 'Show on widgets',
  },

  continueReading: 'Continue reading {{range}}',
  // The way into the goal wizard once a passage exists (Library uses the same label).
  addPassage: 'Add passage',

  ladder: {
    title: 'Where it stands',
  },
} as const;
