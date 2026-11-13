/** Stats tab: headline numerals, practice grid, lifetime totals, badges. */
export default {
  numeral: {
    // English keeps the same label for any count, as before.
    streak_one: 'day streak',
    streak_other: 'day streak',
    accuracy: '30-day accuracy',
    memorized_one: 'verses memorized',
    memorized_other: 'verses memorized',
    spoken: '{{value}} {{label}}',
    // Spoken in place of a dash when nothing has been graded in 30 days.
    accuracyNone: '30-day accuracy: no attempts yet',
  },
  practice: 'Practice',
  practiceDays: 'Practice days',
  practicedOn: 'Practiced on {{practiced}} of the last {{total}} days',
  // Column heads of the practice grid, Monday first.
  weekdays: { mon: 'M', tue: 'T', wed: 'W', thu: 'T', fri: 'F', sat: 'S', sun: 'S' },
  recitationCount_one: '{{count}} recitation',
  recitationCount_other: '{{count}} recitations',
  overrideCount_one: '{{count}} override',
  overrideCount_other: '{{count}} overrides',

  // Lifetime totals as label-value rows (06 §2, neutral framing). The
  // lock rows appear once Recite to Unlock has been used.
  lifetime: {
    title: 'Lifetime',
    reviews: 'Reviews',
    recitations: 'Recitations to unlock',
    overrides: 'Lock overrides',
    spoken: '{{label}}: {{value}}',
  },

  badgesTitle: 'Badges',
  badgeSpoken: '{{name}}: {{status}}',
  // Under an earned badge's name, and its status for VoiceOver.
  earnedOn: 'Earned {{date}}',
  // Keyed by the badge code stored in SQLite (services/db/repos/badges).
  // `glyph` is the medallion's monogram or numeral: one per badge, so no
  // two medallions read alike.
  badges: {
    first_verse: { glyph: 'V', name: 'First verse', hint: 'Memorize your first chunk' },
    first_chapter: { glyph: 'Ch', name: 'First chapter', hint: 'Memorize a full chapter' },
    first_book: { glyph: 'B', name: 'First book', hint: 'Memorize an entire book' },
    perfect_speak: { glyph: 'P', name: 'Word perfect', hint: '100% on a spoken recitation' },
    century_reviews: { glyph: 'C', name: 'Century', hint: 'Complete 100 reviews' },
    dawn_reciter: { glyph: 'D', name: 'Dawn reciter', hint: '10 Recite to Unlock successes' },
    steady_30: { glyph: '30', name: 'Steady 30', hint: 'A 30-day streak' },
    steady_100: { glyph: '100', name: 'Steady 100', hint: 'A 100-day streak' },
    steady_365: { glyph: '365', name: 'Steady 365', hint: 'A full year' },
    word_hoard_1k: { glyph: 'I', name: 'Word hoard I', hint: '1,000 words memorized' },
    word_hoard_5k: { glyph: 'II', name: 'Word hoard II', hint: '5,000 words memorized' },
    word_hoard_10k: { glyph: 'III', name: 'Word hoard III', hint: '10,000 words memorized' },
  },
} as const;
