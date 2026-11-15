/** First-launch onboarding (src/app/onboarding.tsx). */
export default {
  // The native bar: the way out on every step, and the page dots' spoken label.
  skip: 'Skip',
  progress: 'Step {{current}} of {{total}}',
  welcome: {
    title: 'Let the Word remain in you.',
    body: 'Meno helps you hide Scripture in your heart: pick a passage, climb from reading it to reciting it, and keep it fresh — a few minutes a day.',
    dissolve: 'As a verse settles in memory, its text dissolves from the screen.',
  },
  notifications: {
    title: 'Turn on reminders?',
    body: 'A daily reminder to practice, plus pop quizzes on verses you’ve memorized. Never more than two a day, about 30 seconds each.',
    optIn: 'Turn on reminders',
    later: 'Not now',
  },
  notificationsBlocked: {
    title: 'Reminders can’t reach you yet',
    body: 'Your iPhone isn’t allowing notifications from Meno, so reminders can’t arrive. To let them through, open iPhone Settings, tap Notifications, and turn on Allow Notifications.',
    hint: 'Not now is fine too. Settings → Reminders in Meno always shows whether they’re getting through.',
    openSettings: 'Open iPhone Settings',
  },
  widget: {
    title: 'Keep it in front of you',
    previewLabel:
      'Preview: Meno’s Home Screen widget showing {{ref}} with half its words blanked out, and its Lock Screen widget under the clock',
    body: 'Meno’s widgets keep your current verse on your Home Screen and Lock Screen, and it dissolves as you learn it.',
    howTo:
      'Home Screen: long-press → Edit → Add Widget → Meno.\nLock Screen: long-press the clock → Customize → add Meno.',
  },
  lock: {
    title: 'Open your apps by heart',
    previewLabel:
      'Preview: a shielded app asking you to recite your verse before it opens, with an Override button that always works',
    body: 'Optional: shield the apps that distract you, and recite your current verse from memory to open one. Override is always there — you’re never locked out of your own phone.',
    // The Screen Time module is missing, so setup isn't offered here.
    unavailableHint: 'Recite to Unlock isn’t available on this device.',
    chooseOwn: 'Choose my own passage',
    setUpLock: 'Set up Recite to Unlock',
    exploreFirst: 'Explore first',
  },
  shieldMock: {
    app: 'This app is shielded',
    verse: '{{ref}} — from memory',
    recite: 'Recite to unlock',
    override: 'Override',
  },
} as const;
