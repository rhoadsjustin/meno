/** Practice session: the tier ladder, its rounds, feedback and summary. */
export default {
  title: 'Practice',
  closeLabel: 'Close practice (your progress is saved)',
  /** Tier names (src/services/practice/tiers.ts). */
  tiers: {
    read: 'Read',
    firstLetters: 'First Letters',
    blanks25: 'Blanks 25',
    blanks50: 'Blanks 50/75',
    arrange: 'Arrange',
    type: 'Type',
    speak: 'Speak',
  },
  /** Sub-line copy like "Chunk 4 of 12 · Blanks 50". */
  chunkProgress: 'Chunk {{index}} of {{total}} · {{tier}}',
  errors: {
    goalNotFound: 'Goal not found',
    allMemorized: 'Every chunk in this passage is memorized. Well done.',
  },
  /** What tapping Practice does next (src/services/practice/plan.ts). */
  plan: {
    start: 'Start',
    startButton: 'Start {{reference}}',
    startSubline: 'New verse · begins with {{tier}}',
    startSpoken: 'Start {{reference}}, a new verse. Begins with {{tier}}.',
    continueButton: 'Continue {{reference}}',
    continueSubline: 'Next step · {{tier}}',
    continueSublineSeals: 'Next step · {{tier}} · a clean pass makes it memorized',
    continueSpoken: 'Continue {{reference}}. The next step is {{tier}}.',
    continueSpokenSeals:
      'Continue {{reference}}. The next step is {{tier}}, and a clean pass makes it memorized.',
    seal: 'Seal',
    sealButton: 'Seal {{reference}}',
    sealSubline: 'One recitation makes it memorized',
    sealSublineThen: 'One recitation · then on to {{then}}',
    sealSpoken: 'Seal {{reference}}. One clean recitation makes it memorized.',
    sealSpokenThen:
      'Seal {{reference}}. One clean recitation makes it memorized, then on to {{then}}.',
    rest: 'Seals tomorrow',
    restButton: '{{reference}} seals tomorrow',
    restSubline: 'Nothing left today · one recitation tomorrow makes it memorized',
    restSpoken:
      '{{reference}} is done for today. One clean recitation tomorrow makes it memorized.',
  },
  /** The progress bar across the whole ladder. */
  progress: {
    step: 'Step {{step}} of {{total}}',
    stepPass: 'Step {{step}} of {{total}} · pass {{index}} of {{of}}',
    done: '{{done}} of {{total}} steps done',
  },
  /** The rung-by-rung ladder (VoiceOver summary). */
  ladder: {
    label: 'Ladder: {{summary}}',
    cleared: '{{tier}} cleared',
    inProgress: '{{tier}} in progress',
    ahead: '{{tier}} ahead',
  },
  round: {
    header: '{{reference}} · {{tier}}',
    sealingNote: 'Sealing {{reference}} · one clean pass makes it memorized',
  },
  restingTitle: '{{reference}} is one day from sealed',
  restingBody:
    'You have already cleared {{tier}} today. Memorized takes a clean pass on two separate days, so this one rests until tomorrow.',
  feedback: {
    accuracyLabel: 'Accuracy {{value}} percent',
    slipForgiven: 'a slip forgiven',
    slipsForgiven_one: 'one slip forgiven',
    slipsForgiven_other: '{{count}} slips forgiven',
    memorized: 'Memorized',
    almostNotClean: 'Almost — not a clean pass yet',
    almostMarked: 'Almost — the slipped words are marked below',
    almostMoveOn: 'Almost — close enough to move on',
    tierCleared: '{{tier}} cleared',
    tierClearedForgiven: '{{tier}} cleared, {{forgiven}}',
    passedForgiven: 'Passed, {{forgiven}}',
    roundPassed: 'Round passed',
    notQuiteMarked: 'Not quite — the slipped words are marked below',
    notQuiteRetry: 'Not quite — try this round again',
    sealsTomorrowAlmost:
      'Your clean pass from earlier today is still banked. Memorized takes a clean pass on two separate days — come back tomorrow and this one is sealed.',
    sealsTomorrowPass:
      'That is today’s pass banked. Memorized takes a clean pass on two separate days — come back tomorrow and this one is sealed.',
    needsCleanPass:
      'That was close, but it does not count toward Memorized: sealing {{reference}} takes a clean recitation on two separate days, and today’s is not banked yet. Try it again now, or stop here and come back to it.',
    almostAtType:
      'Close enough to move on to {{tier}}. It does not count toward Memorized, though — that takes a clean pass on two separate days.',
    restPoint:
      'This is a good place to stop for today. {{first}}, {{second}} and {{third}} will be waiting — or keep going if you have the time.',
    suggestDrop:
      'Want to rebuild the foundation? Drop back a tier — no penalty, and {{tier}} will be waiting when you come back up.',
    finish: 'Finish',
    doneForToday: 'Done for today',
    nextRound: 'Next round',
    keepGoing: 'Keep going',
    keepGoingHint: 'Carries on to {{tier}}',
    stopForToday: 'Stop for today',
    stopForTodayHint: 'Ends the session; {{tier}} will be waiting next time',
    rebuildAt: 'Rebuild at {{tier}}',
    rebuildHint: 'Rebuilds this chunk one tier lower; your progress is kept',
  },
  summary: {
    stepsDone_one: 'Step done',
    stepsDone_other: 'Steps done',
    accuracy: 'Accuracy',
    dayStreak: 'Day streak',
    memorized: '{{reference}} is memorized',
    sealsTomorrow: 'Next: one clean recitation tomorrow seals it as memorized.',
    needsCleanPass:
      'Every step is done, but {{reference}} is not sealed yet: the last recitation was close, not clean. Next time you pick up at {{tier}} — only a clean recitation counts toward Memorized.',
    pickUp: 'Next time you pick up at {{tier}}.',
  },
  /** Word-level feedback under a graded round. */
  wordFeedback: {
    label: 'Word-by-word feedback. {{summary}}',
    extraLegend: '+ marks a word you added that is not in the verse.',
  },
  dissolution: {
    memorizedLabel: '{{reference}} is memorized — the text now lives in you.',
    dissolvingLabel: 'The verse dissolves as it moves into memory.',
    sealNote: 'Hidden in your heart.',
  },
  read: {
    hint: 'Read it aloud, slowly, twice. Let the words settle.',
    done: 'I’ve read it twice',
  },
  firstLetters: {
    label: 'First letters of the passage',
    hint: 'Recite from the letters — aloud or in your head — then check yourself.',
    reveal: 'Reveal',
    howDidItGo: 'How did it go?',
    notYet: 'Not yet',
    mostly: 'Mostly got it',
  },
  blanks: {
    correct: '{{word}}, correct',
    wrong: '{{word}}, wrong',
    missed: '{{word}}, missed',
    active: 'blank, answer with the choices below',
    blank: 'blank',
    revealHint: 'Long-press to reveal the word — it will be counted as missed',
    choice: 'Choice: {{choice}}',
    choiceHint: 'Double-tap to fill the current blank',
  },
  arrange: {
    placeholder: 'Tap the phrases in order',
    placed: 'Position {{position}}: {{phrase}}',
    placedHint: 'Double-tap to remove this phrase',
    phrase: 'Phrase: {{phrase}}',
    phraseHint: 'Double-tap to place this phrase next',
    check: 'Check order',
  },
  type: {
    watermark: '{{reference}} · begins “{{word}}…”',
    placeholder: 'Type the passage from memory',
    check: 'Check',
  },
  speak: {
    error: 'Speech recognition hit a snag ({{error}}). You can type instead.',
    pausedAnnouncement: 'Paused. Your words are kept — edit them or keep going.',
    listeningAnnouncement: 'Listening. Recite, then tap again to pause.',
    speakInstead: 'Speak instead',
    typeInstead: 'Type instead',
    permissionOff:
      'Microphone or speech recognition permission is off. Enable it in Settings, or type instead below.',
    liveTranscript: 'Live transcript',
    editLabel: 'Your recitation — tap to edit',
    editHint: 'Tap the words to fix them, or keep reciting.',
    placeholder: 'Recite from memory — your words appear here.',
    check: 'Check recitation',
    pause: 'Pause reciting',
    start: 'Start reciting',
    pauseHint: 'Your words are kept when you pause',
    startHint: 'Adds to what you have said so far',
    micListening: 'Listening — tap to pause',
    micMore: 'Tap to keep going',
    micStart: 'Tap to recite',
  },
  /** VoiceOver summary of word feedback (services/grading feedbackSummary). */
  spokenFeedback: {
    missed: 'Missed: {{words}}.',
    wrong: 'Wrong: {{words}}.',
    wrongSaid: '{{word}}, you had {{said}}',
    close: 'Close: {{words}}.',
    added: 'Added, not in the verse: {{words}}.',
    allCorrect: 'Every word correct.',
  },
} as const;
