/** Settings tab: guide, reminders, Recite to Unlock, and the credits footer. */
export default {
  guide: {
    title: 'How to set up Meno',
    body: 'Step by step: quizzes, widgets, speaking, and recite-to-unlock — plus common questions.',
    hintWide: 'Shows the guide beside this list',
    hint: 'Opens a step-by-step guide',
  },
  reminders: {
    title: 'Reminders',
    body: 'A daily nudge to practice, plus surprise pop quizzes on verses you’ve memorized. Never more than two a day.',
    hintWide: 'Shows how quizzes work beside this list',
    off: 'Off. Meno won’t send you anything until you turn this on.',
    remindAt: 'Remind me at',
    timeLabel: 'Daily reminder time',
    focusNote:
      'A Focus or Scheduled Summary on your iPhone can still hold these back. Meno can’t see either one.',
    askNote: 'Your iPhone will ask if Meno can send notifications. Tap Allow.',
    allow: 'Allow notifications',
    blockedNote: 'Turn on Allow Notifications for Meno and they start by themselves.',
    openSettings: 'Open iPhone Settings',
  },
  lock: {
    title: 'Recite to Unlock',
    hintWide: 'Shows the setup steps beside this list',
    // {{recitations}} / {{overrides}} are stats:recitationCount / overrideCount.
    onSummary: 'On · this week: {{recitations}}, {{overrides}}',
    offBody: 'Ask for a verse before your distracting apps open.',
    unavailable: 'Available on your iPhone (not in the simulator).',
    killSwitch: 'Turn off and clear all shields now',
  },
  update: {
    title: 'Update ready',
    body: 'It installs the next time Meno opens. Your verses and progress stay right where they are.',
    restart: 'Restart Meno now',
    hint: 'Restarts Meno into the new version',
  },
  // {{version}} in footer when an over-the-air update is running.
  updatedVersion: '{{version}}, updated {{date}}',
  catalogCredit:
    'Other translations are shown under license from their publishers, each with its own copyright line, and aren’t stored on this device.',
  footer:
    'Meno {{version}} · Scripture: {{translations}} — public domain. Recitation audio never leaves this device.',
} as const;
