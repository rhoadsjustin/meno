/** Stitch session: reciting every chunk so far as one passage. */
export default {
  title: 'Stitch',
  // Leaving mid-recitation keeps nothing: there is no resume for a stitch.
  closeLabel: 'Close stitch (a recitation in progress is not kept)',
  nothingYet: 'Nothing to stitch yet',
  nothingYetBody: 'A stitch opens once two chunks of this passage are under way.',
  intro: 'Stitch it together — recite everything you’ve learned so far as one passage.',
  goalCompleted: 'The whole passage is hidden in your heart.',
  passed: 'Stitched — it holds together.',
  failed: 'A few words slipped — they’re marked below.',
  later: 'Later',
} as const;
