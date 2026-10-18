/** "How to set up Meno" (src/app/help.tsx + src/features/help/HelpGuide.tsx). */
export default {
  title: 'How to set up Meno',
  intro:
    'Meno works best with a few things turned on. Each one takes about a minute. Tap any item to jump to its steps.',
  sections: {
    quizzes: 'Reminders and quizzes',
    homeWidget: 'Home Screen widget',
    lockWidget: 'Lock Screen widget',
    speak: 'Speaking your verse',
    lock: 'Recite to unlock',
  },
  status: {
    ready: 'Ready',
    notYet: 'Not set up yet',
    openSettings: 'Needs permission in iPhone Settings',
    unavailable: 'Needs a real iPhone',
    manual: 'Add it yourself — steps below',
  },
  overviewLabel: '{{title}}: {{status}}',
  overviewHint: 'Shows the steps',
  stepLabel: 'Step {{number}}: {{text}}',
  actions: {
    openIphoneSettings: 'Open iPhone Settings',
    allowNotifications: 'Allow notifications',
    turnOnReminders: 'Turn on reminders',
    allowMicrophone: 'Allow microphone',
    setUpLock: 'Set up recite-to-unlock',
  },
  steps: {
    tapOpenSettings: 'Tap Open iPhone Settings below.',
    comeBack: 'Come back to Meno — this page updates by itself.',
  },
  quizzes: {
    body: 'A daily reminder to practice, at a time you choose, and short surprise quizzes on verses you’ve memorized (between 9am and 9pm). Never more than two notifications a day.',
    blocked:
      'Reminders are on in Meno, but your iPhone isn’t letting them through, so nothing can arrive yet.',
    tapNotifications: 'Tap Notifications.',
    allowNotifications: 'Turn on Allow Notifications.',
    readyTip:
      'Change the time or turn reminders off in Settings → Reminders. A Focus or Scheduled Summary on your iPhone can still hold notifications back; Meno can’t see either one.',
    offTip:
      'Reminders are off in Meno. If your iPhone asks whether Meno can send notifications, tap Allow.',
    askTip: 'Your iPhone will ask if Meno can send notifications — tap Allow.',
  },
  homeWidget: {
    body: 'Shows your current verse on your Home Screen. As you learn it, words disappear — a gentle nudge to fill them in from memory.',
    imageLabel:
      'Example: the Meno widget on a Home Screen, showing {{ref}} with some words blanked out',
    steps: {
      goHome: 'Go to your Home Screen. (Swipe up from the bottom edge to leave Meno.)',
      holdEmpty: 'Touch and hold an empty spot until the apps start to wiggle.',
      tapEdit: 'Tap Edit in the top-left corner, then tap Add Widget.',
      search: 'Type “Meno” in the search box, then tap Meno.',
      pickSize: 'Swipe left or right to pick a size, then tap Add Widget.',
      tapDone: 'Tap Done in the top-right corner.',
    },
    tip: 'Tip: learning more than one passage? Tap “Show on widgets” under the one you want on Today or in Library. To choose how much of the verse shows, touch and hold the widget and tap Edit Widget.',
  },
  lockWidget: {
    body: 'Puts your verse right under the clock, so you see it every time you pick up your phone.',
    imageLabel: 'Example: the Meno widget under the clock on a Lock Screen, showing {{ref}}',
    steps: {
      wake: 'Press the side button to lock your iPhone, then tap the screen to wake it. Stay on the Lock Screen — don’t swipe up.',
      hold: 'Touch and hold the Lock Screen until Customize appears at the bottom.',
      customize: 'Tap Customize. If your iPhone asks, choose Lock Screen.',
      widgetArea: 'Tap the widget area (it may say Add Widgets).',
      addMeno: 'Scroll to Meno, tap it, then tap the widget to add it.',
      done: 'Close the widget list, then tap Done.',
    },
    tip: 'Tip: while customizing, drag the widget up to sit right under the clock, or tap it to change how much of the verse shows.',
  },
  speak: {
    body: 'In Speak rounds you say the verse out loud and Meno checks it. Your voice is handled on this iPhone and never leaves it. You can always type instead.',
    turnOn: 'Turn on Microphone and Speech Recognition.',
    readyTip: 'You’re all set — tap the mic in any Speak round.',
    askTip:
      'Your iPhone will ask about the microphone and speech recognition — tap Allow for both.',
  },
  lock: {
    body: 'Optional. Pick the apps that eat your time; before one opens, Meno asks you to recite your verse. Override is always one tap away, and you can switch it off anytime.',
    unavailable:
      'This uses Apple’s Screen Time, which only works on a real iPhone — not in the simulator.',
    readyTip:
      'It’s on. To turn it off completely, go to Settings → Turn off and clear all shields now.',
    steps: {
      tapSetUp: 'Tap Set up recite-to-unlock below.',
      allowScreenTime:
        'When your iPhone asks about Screen Time, allow it (you may need Face ID or your passcode).',
      pickApps: 'Pick the apps that should ask for a verse first.',
      chooseWhen: 'Choose when Meno should ask, and finish setup.',
    },
  },
  faqHeading: 'Common questions',
  faq: {
    multiple: {
      q: 'Can I learn more than one passage at a time?',
      a: 'Yes. Tap “+ Practice another passage” on Today (or in Library). Each passage keeps its own progress, and Today lists them all — the one on your widgets at the top.',
    },
    widgetVerse: {
      q: 'How do I choose which verse my widgets show?',
      a: 'On Today or in Library, tap “Show on widgets” under the passage you want. Every Meno widget switches to it within a moment, and recite-to-unlock asks for that verse too.',
    },
    oldVerse: {
      q: 'My widget shows an old verse.',
      a: 'Widgets update when you leave Meno. Open Meno, then go back to your Home Screen. Your iPhone can take a few minutes to refresh it.',
    },
    referenceOnly: {
      q: 'My widget only shows the reference, not the words.',
      a: 'That’s on purpose once you know a verse well — try reciting it from memory! To show more, touch and hold the widget, tap Edit Widget, and change “Show verse as.”',
    },
    noReminders: {
      q: 'I’m not getting any reminders or quizzes.',
      a: 'Open Settings → Reminders. Each kind of reminder says when the next one comes, or why none will yet. The daily reminder comes at the time you set and skips a day you’ve already practiced. Quizzes start once a verse is memorized, and only come between 9am and 9pm. If everything there looks right, check your iPhone: a Focus like Sleep or Do Not Disturb holds notifications until it ends, and Scheduled Summary saves them for set times of day. Meno can’t see either one.',
    },
    shielded: {
      q: 'An app is shielded and I need it right now.',
      a: 'Tap Override on the shield — it always works. To switch recite-to-unlock off completely, open Meno’s Settings and tap “Turn off and clear all shields now.”',
    },
    voice: {
      q: 'Does Meno record my voice?',
      a: 'No. When you speak a verse, your iPhone turns it into text right on the device. The audio is never saved or sent anywhere.',
    },
    deleteApp: {
      q: 'What happens if I delete Meno?',
      a: 'Your iPhone removes any shields Meno set. Meno doesn’t use an account — your verses and progress live on this iPhone — so deleting the app removes them too.',
    },
  },
} as const;
