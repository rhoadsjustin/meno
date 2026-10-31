/**
 * Year in the Word recap (docs/10). DRAFT copy: persona names and lines
 * await the owner's review (docs/10 D5) before the copy freeze.
 */
export default {
  title: 'Year in the Word',
  /** Cover headline. */
  cover: 'Your {{year}} in the Word',
  span: {
    year: 'In {{year}}',
    /** e.g. "Since you started in October". */
    firstSeason: 'Since you started in {{month}}',
  },
  cards: {
    words: {
      heading: 'Words hidden in your heart',
      words_one: '{{count}} word',
      words_other: '{{count}} words',
      verses_one: 'across {{count}} verse',
      verses_other: 'across {{count}} verses',
      /** When the words can't be counted offline: the verses lead instead. */
      versesOnly_one: '{{count}} verse',
      versesOnly_other: '{{count}} verses',
      echo: 'I have hidden your word in my heart. — Psalm 119:11',
    },
    passage: {
      heading: 'Your passage of the year',
      minutes_one: '{{count}} minute with it',
      minutes_other: '{{count}} minutes with it',
    },
    days: {
      heading: 'Days with the Word',
      days_one: '{{count}} day',
      days_other: '{{count}} days',
      longest_one: 'Longest run: {{count}} day',
      longest_other: 'Longest run: {{count}} days',
      grace_one: 'Grace covered {{count}} missed day',
      grace_other: 'Grace covered {{count}} missed days',
    },
    minutes: {
      heading: 'Time with Scripture',
      minutes_one: '{{count}} minute',
      minutes_other: '{{count}} minutes',
    },
    spoken: {
      heading: 'Recited from memory',
      times_one: 'Out loud {{count}} time',
      times_other: 'Out loud {{count}} times',
    },
    unlocks: {
      heading: 'Scripture opened your phone',
      times_one: '{{count}} time',
      times_other: '{{count}} times',
    },
    persona: {
      heading: 'Your rhythm',
    },
    badges: {
      heading: 'Medallions earned',
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
  /** The Today card before there's enough to show (docs/10 §4). */
  notYet: 'Your Year in the Word opens once you’ve practiced on 3 days.',
  todayCard: 'Your {{year}} in the Word is ready',
  notification: {
    title: 'Your {{year}} in the Word',
    body: 'A look back at the Scripture you carried this year.',
  },
  share: {
    action: 'Share',
    footer: 'meno-scripture.org',
  },
} as const;
