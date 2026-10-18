/** First-launch onboarding (src/app/onboarding.tsx). */
export default {
  welcome: {
    title: 'Let the Word remain in you.',
    body: 'Meno helps you hide Scripture in your heart. Pick a passage, climb from reading it to reciting it, and keep it fresh for good — a few minutes a day.',
    dissolve:
      'As a verse solidifies in memory, its text dissolves from the screen. That’s the idea: it lives in you, not the app.',
  },
  notifications: {
    title: 'Can we quiz you out of the blue?',
    body: 'That’s the secret sauce. A daily nudge to practice, then surprise pop quizzes on the verses you’ve memorized — never more than two a day, and each takes about 30 seconds.',
    optIn: 'Yes, quiz me',
    later: 'Later',
  },
  notificationsBlocked: {
    title: 'Reminders can’t reach you yet',
    body: 'Your iPhone isn’t allowing notifications from Meno, so no reminders or quizzes will arrive. To let them through, open iPhone Settings, tap Notifications, and turn on Allow Notifications.',
    hint: 'Not now is fine too. Settings → Reminders in Meno always shows whether they’re getting through.',
    openSettings: 'Open iPhone Settings',
  },
  widget: {
    title: 'Keep it in front of you',
    previewLabel:
      'Preview: Meno’s Home Screen widget showing {{ref}} with half its words blanked out, and its Lock Screen widget under the clock',
    body: 'Meno’s widgets put your current verse on the Home Screen and under the clock on your Lock Screen — it follows you all day, and dissolves as you learn it.',
    howTo:
      'Home Screen: long-press → Edit → Add Widget → Meno.\nLock Screen: long-press the clock → Customize → add Meno.',
  },
  lock: {
    title: 'Open your apps by heart',
    previewLabel:
      'Preview: a shielded app asking you to recite your verse before it opens, with an Override button that always works',
    body: 'Optional, and a little audacious: shield the apps that eat your time. To open one, recite your current verse from memory. Override is always there — you’re never locked out of your own phone.',
    simulatorHint:
      'Works on your iPhone (not in the simulator). Find it anytime in Settings → Recite to Unlock.',
    tryStarter: 'Try it with {{passage}}',
    chooseOwn: 'Choose my own passage',
    setUpLock: 'Set up recite-to-unlock',
    exploreFirst: 'Explore first',
  },
  shieldMock: {
    app: 'This app is shielded',
    verse: '{{ref}} — from memory',
    recite: 'Recite to unlock',
    override: 'Override',
  },
} as const;
