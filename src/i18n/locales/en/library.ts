/** Library tab: passages in progress and memorized chunks. */
export default {
  inProgress: 'In progress',
  memorized: 'Memorized',
  nowOnWidgets: '{{title}} is now on your widgets.',
  widgetsFailed: 'Couldn’t put {{title}} on your widgets',
  // The first load failed: shown in place of both shelves' empty states.
  loadFailed: {
    title: 'Couldn’t load your library',
    body: 'Your passages are still on this device.',
  },

  goal: {
    // {{count}} is the passage's chunk total: "0 of 1 chunk", "2 of 5 chunks".
    summary_one: '{{translation}} · {{done}} of {{count}} chunk memorized',
    summary_other: '{{translation}} · {{done}} of {{count}} chunks memorized',
    heatmap:
      'Chunk progress for {{title}}: {{memorized}} memorized, {{learning}} in progress, {{locked}} not started',
    share: 'Share challenge',
    onWidgets: 'On your widgets',
    showOnWidgets: 'Show on widgets',
    // The card's More menu: share, show on widgets, delete or stop.
    moreSpoken: 'More actions for {{title}}',
  },

  emptyInProgressTitle: 'No passages yet',
  emptyInProgressBody: 'Add a passage and it stays here while you learn it.',
  // One label for the way into the goal wizard, with or without passages.
  addPassage: 'Add passage',

  emptyMemorizedTitle: 'Nothing memorized yet',
  emptyMemorizedBody: 'Chunks you’ve memorized appear here, with how fresh each one is.',
  memorizedDetail: '{{translation}} · {{health}}',
  health: {
    fresh: 'fresh',
    fading: 'fading',
    atRisk: 'at risk',
  },

  // Taking a passage off the In progress shelf (services/goals/deletion).
  remove: {
    tryAgain: 'Try again in a moment.',
    delete: {
      spoken: 'Delete {{title}}',
      title: 'Delete {{title}}?',
      message:
        'Your practice history for this passage will be deleted. Your streak and badges stay.',
      confirm: 'Delete passage',
      done: '{{title}} deleted.',
      failed: 'Couldn’t delete {{title}}',
    },
    // A partly memorized passage: the memorized chunks stay (repos/goals stopGoal).
    stop: {
      spoken: 'Stop {{title}}',
      title: 'Stop {{title}}?',
      message:
        'Memorized verses stay on your Memorized shelf and in your reviews. Your practice on the rest of this passage will be deleted.',
      confirm: 'Stop passage',
      done: '{{title}} stopped. Its memorized verses are on your Memorized shelf.',
      failed: 'Couldn’t stop {{title}}',
    },
  },
} as const;
