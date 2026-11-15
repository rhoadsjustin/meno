/** Settings tab: guide, reminders, Recite to Unlock, the update prompt and About. */
export default {
  guide: {
    title: 'How to set up Meno',
    hintWide: 'Shows the guide beside this list',
    hint: 'Opens a step-by-step guide',
  },
  reminders: {
    title: 'Reminders',
    body: 'A daily reminder to practice, plus pop quizzes on verses you’ve memorized. Never more than two a day.',
    hintWide: 'Shows how reminders work beside this list',
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
    on: 'On',
    off: 'Off',
    // {{recitations}} / {{overrides}} are stats:recitationCount / overrideCount.
    // All-time counts (repos/lock lockEventCounts), so no period is named.
    usage: '{{recitations}}, {{overrides}}.',
    offBody: 'Ask for a verse before your distracting apps open.',
    unavailable: 'Not available on this device.',
    killSwitch: 'Turn off and clear all shields now',
    killSwitchDone: 'Recite to Unlock is off. All shields are cleared.',
  },
  update: {
    title: 'Update ready',
    body: 'It installs the next time Meno opens. Your verses and progress stay right where they are.',
    restart: 'Restart Meno now',
    hint: 'Restarts Meno into the new version',
  },
  about: {
    title: 'About',
    version: 'Version',
    // The Version row's value when an over-the-air update is running.
    updatedVersion: '{{version}}, updated {{date}}',
    privacy: 'Privacy policy',
    support: 'Support',
    linkHint: 'Opens in your browser',
    credits:
      'Scripture: {{translations}} — public domain. Recitation audio never leaves this device.',
  },
  catalogCredit:
    'Other translations are shown under license from their publishers, each with its own copyright line, and aren’t stored on this device.',
} as const;
