/** Library tab: passages in progress and memorized chunks. */
export default {
  inProgress: 'In progress',
  memorized: 'Memorized',
  nowOnWidgets: '{{title}} is now on your widgets.',

  goal: {
    // English keeps "chunks" for any count, as before.
    summary_one: '{{translation}} · {{done}} of {{count}} chunks memorized',
    summary_other: '{{translation}} · {{done}} of {{count}} chunks memorized',
    heatmap:
      'Chunk progress for {{title}}: {{memorized}} memorized, {{learning}} in progress, {{locked}} not started',
    practice: 'Practice',
    share: 'Share challenge',
    shareSpoken: 'Share {{title}} as a challenge',
    onWidgets: 'On your widgets',
    showOnWidgets: 'Show on widgets',
    showOnWidgetsSpoken: 'Show {{title}} on your widgets',
  },

  emptyInProgressTitle: 'No passages yet',
  emptyInProgressBody: 'Your passages in progress will live here.',
  practiceAnother: '+ Practice another passage',
  choosePassage: 'Choose a passage',

  emptyMemorizedTitle: 'Nothing memorized yet',
  emptyMemorizedBody: 'Chunks you’ve fully hidden in your heart appear here, with their health.',
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
        'This deletes your practice history for this passage. Your streak and badges stay. You can’t undo this.',
      confirm: 'Delete passage',
      done: '{{title}} deleted.',
      failed: 'Couldn’t delete {{title}}',
    },
    // A partly memorized passage: the memorized chunks stay (repos/goals stopGoal).
    stop: {
      spoken: 'Stop {{title}}',
      title: 'Stop {{title}}?',
      message:
        'The verses you’ve memorized stay on your Memorized shelf and in your reviews. Your practice on the rest of this passage is deleted. You can’t undo this.',
      confirm: 'Stop passage',
      done: '{{title}} stopped. Its memorized verses are on your Memorized shelf.',
      failed: 'Couldn’t stop {{title}}',
    },
  },
} as const;
