/** Stats tab: headline numerals, practice grid, lock summary, badges. */
export default {
  numeral: {
    // English keeps the same label for any count, as before.
    streak_one: 'day streak',
    streak_other: 'day streak',
    accuracy: '30-day accuracy',
    memorized_one: 'verses memorized',
    memorized_other: 'verses memorized',
    spoken: '{{value}} {{label}}',
  },
  practice: 'Practice',
  practiceDays: 'Practice days',
  practicedOn: 'Practiced on {{practiced}} of the last {{total}} days',
  lockSummary: 'Recite to Unlock: {{recitations}}, {{overrides}}.',
  recitationCount_one: '{{count}} recitation',
  recitationCount_other: '{{count}} recitations',
  overrideCount_one: '{{count}} override',
  overrideCount_other: '{{count}} overrides',

  badgesTitle: 'Badges',
  badgeSpoken: '{{name}}: {{status}}',
  earned: 'earned',
  // Keyed by the badge code stored in SQLite (services/db/repos/badges).
  badges: {
    first_verse: { name: 'First verse', hint: 'Memorize your first chunk' },
    first_chapter: { name: 'First chapter', hint: 'Memorize a full chapter' },
    first_book: { name: 'First book', hint: 'Memorize an entire book' },
    perfect_speak: { name: 'Word perfect', hint: '100% on a spoken recitation' },
    century_reviews: { name: 'Century', hint: 'Complete 100 reviews' },
    dawn_reciter: { name: 'Dawn reciter', hint: '10 recite-to-unlock successes' },
    steady_30: { name: 'Steady 30', hint: 'A 30-day streak' },
    steady_100: { name: 'Steady 100', hint: 'A 100-day streak' },
    steady_365: { name: 'Steady 365', hint: 'A full year' },
    word_hoard_1k: { name: 'Word hoard I', hint: '1,000 words memorized' },
    word_hoard_5k: { name: 'Word hoard II', hint: '5,000 words memorized' },
    word_hoard_10k: { name: 'Word hoard III', hint: '10,000 words memorized' },
  },
} as const;
