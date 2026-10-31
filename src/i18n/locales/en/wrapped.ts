/**
 * Year in the Word recap (docs/10). DRAFT copy: persona names and lines
 * await the owner's review (docs/10 D5) before the copy freeze.
 *
 * Big numerals are printed by the card itself (locale-formatted); labels
 * here pick their plural from `count` and print the number as `{{value}}`.
 */
export default {
  title: 'Year in the Word',
  /** Cover headline. */
  cover: 'Your {{year}} in the Word',
  coverHint: 'Tap to begin',
  span: {
    year: 'In {{year}}',
    /** e.g. "Since you started in October". */
    firstSeason: 'Since you started in {{month}}',
  },
  cards: {
    words: {
      heading: 'Words hidden in your heart',
      words_one: 'word',
      words_other: 'words',
      verses_one: 'verse',
      verses_other: 'verses',
      across_one: 'across {{value}} verse',
      across_other: 'across {{value}} verses',
      echo: '“I have hidden your word in my heart.”',
      echoRef: 'Psalm 119:11',
    },
    passage: {
      heading: 'Your passage of the year',
      minutes_one: '{{value}} minute with it',
      minutes_other: '{{value}} minutes with it',
    },
    days: {
      heading: 'Days with the Word',
      days_one: 'day',
      days_other: 'days',
      longest_one: 'Longest run: {{value}} day',
      longest_other: 'Longest run: {{value}} days',
      grace_one: 'Grace covered {{value}} missed day',
      grace_other: 'Grace covered {{value}} missed days',
    },
    minutes: {
      heading: 'Time with Scripture',
      minutes_one: 'minute',
      minutes_other: 'minutes',
    },
    spoken: {
      heading: 'Recited from memory',
      times_one: 'time out loud',
      times_other: 'times out loud',
    },
    unlocks: {
      heading: 'Scripture opened your phone',
      times_one: 'time',
      times_other: 'times',
    },
    persona: {
      heading: 'Your rhythm',
    },
    badges: {
      heading: 'Medallions earned',
      count_one: 'medallion',
      count_other: 'medallions',
    },
    summary: {
      heading: 'My {{year}} in the Word',
      invite: 'Start {{next}} with me',
    },
  },
  persona: {
    morningWatch: {
      name: 'The Morning Watch',
      line: 'You met the Word before the day began.',
    },
    nightMeditator: {
      name: 'The Night Meditator',
      line: 'You kept the Word in the quiet hours.',
    },
    middayPause: {
      name: 'The Midday Pause',
      line: 'You made room for the Word in the middle of the day.',
    },
    voiceInTheRoom: {
      name: 'The Voice in the Room',
      line: 'You said the Word out loud, again and again.',
    },
    faithfulKeeper: {
      name: 'The Faithful Keeper',
      line: 'Day after day, you kept coming back.',
    },
    steadyWalker: {
      name: 'The Steady Walker',
      line: 'Whenever you could, you returned to the Word.',
    },
  },
  screen: {
    close: 'Close',
    share: 'Share',
    shareLabel: 'Share this card as an image',
    shareHeading: 'Share this card',
    storyFormat: 'For Stories',
    postFormat: 'For a post',
    /** VoiceOver position, e.g. "Card 2 of 8". */
    position: 'Card {{index}} of {{total}}',
    next: 'Next card',
    previous: 'Previous card',
    shareFailed: 'This card couldn’t be turned into an image. Try again.',
    notYetTitle: 'Not quite yet',
  },
  /** The Today card before there's enough to show (docs/10 §4). */
  notYet: 'Your Year in the Word opens once you’ve practiced on 3 days.',
  todayCard: 'Your {{year}} in the Word is ready',
  todayCardHint: 'A look back at the Scripture you carried',
  statsRow: '{{year}} in the Word',
  notification: {
    title: 'Your {{year}} in the Word',
    body: 'A look back at the Scripture you carried this year.',
  },
  share: {
    footer: 'meno-scripture.org',
    dialogTitle: 'Share your Year in the Word',
  },
} as const;
