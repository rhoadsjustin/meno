/** Today tab: the focus passage, what's next, and the first-run empty state. */
export default {
  // Header streak ember (VoiceOver).
  streak_one: '{{count}} day streak',
  streak_other: '{{count}} day streak',
  streakSecured_one: '{{count}} day streak, secured today',
  streakSecured_other: '{{count}} day streak, secured today',
  focusLabel: 'On your widgets',
  nowOnWidgets: '{{title}} is now on your widgets.',

  empty: {
    titleFirst: 'Nothing memorized yet',
    titleAgain: 'Ready for another passage?',
    bodyFirstSwipe:
      'Start with a verse you may already half know. Swipe to choose one and try it now — it takes a couple of minutes.',
    bodyFirstChoose:
      'Start with a verse you may already half know. Choose one and try it now — it takes a couple of minutes.',
    bodyAgainSwipe:
      'Nothing is in progress. Swipe to choose a verse and start it now, or choose your own passage.',
    bodyAgainChoose:
      'Nothing is in progress. Choose a verse and start it now, or choose your own passage.',
    startFailed: 'That verse couldn’t be started. Try again, or choose your own passage.',
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
    begin: 'Begin stitch',
  },

  due: {
    title: 'Due for review',
    body_one: '{{count}} verse is ready to be kept fresh.',
    body_other: '{{count}} verses are ready to be kept fresh.',
    action: 'Review {{count}}',
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
  practiceAnother: '+ Practice another passage',

  ladder: {
    title: 'Where it stands',
    withStreak_one: '{{progress}} · {{count}}-day streak',
    withStreak_other: '{{progress}} · {{count}}-day streak',
    withStreakSecured_one: '{{progress}} · {{count}}-day streak, secured today',
    withStreakSecured_other: '{{progress}} · {{count}}-day streak, secured today',
  },
} as const;
