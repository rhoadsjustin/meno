/**
 * Android wording, laid over the English catalog at startup (src/i18n/index.ts).
 * Only strings that name iPhone features change here: Android has no Home
 * Screen or Lock Screen widget yet, no Screen Time, and its own names for
 * notification settings. Screens hide the iPhone-only features themselves;
 * these are the strings that still show.
 */
export default {
  today: {
    focusLabel: 'Current passage',
    nowOnWidgets: '{{title}} is now your current passage.',
    others: {
      showOnWidgetsSpoken: 'Make {{title}} your current passage',
      showOnWidgets: 'Make current',
    },
  },
  library: {
    nowOnWidgets: '{{title}} is now your current passage.',
    goal: {
      onWidgets: 'Current passage',
      showOnWidgets: 'Make current',
      showOnWidgetsSpoken: 'Make {{title}} your current passage',
    },
  },
  onboarding: {
    notificationsBlocked: {
      body: 'Your phone isn’t allowing notifications from Meno, so no reminders or quizzes will arrive. To let them through, open Settings, tap Notifications, and turn on All Meno notifications.',
      openSettings: 'Open Settings',
    },
    lock: {
      title: 'Start with one verse',
      body: 'Pick a passage and Meno walks you from reading it to reciting it from memory, a few minutes a day. Not sure where to begin? Start with the verse most people learn first.',
    },
  },
  settings: {
    guide: {
      body: 'Step by step: quizzes and speaking your verse — plus common questions.',
    },
    reminders: {
      focusNote:
        'Do Not Disturb, Bedtime mode or Battery Saver can still hold these back. Meno can’t see any of them.',
      askNote: 'Your phone will ask if Meno can send notifications. Tap Allow.',
      blockedNote: 'Turn on All Meno notifications and they start by themselves.',
      openSettings: 'Open Settings',
    },
  },
  notifications: {
    status: {
      blockedCanAsk:
        'Can’t arrive yet. Your phone hasn’t been asked to allow notifications for Meno.',
      blocked: 'Can’t arrive. Notifications are turned off for Meno in your phone’s Settings.',
      allBlockedCanAsk:
        'The daily reminder, pop quizzes and the streak reminder are on in Meno, but your phone hasn’t been asked to allow notifications for Meno.',
      allBlocked:
        'The daily reminder, pop quizzes and the streak reminder are on in Meno, but notifications are turned off for Meno in your phone’s Settings.',
      summaryNeedsSettings: 'Needs permission in Settings',
    },
    prompt: {
      bodyViaSettings:
        'They’re on in Meno, but notifications are turned off for Meno on this phone. Turn on All Meno notifications and they start by themselves.',
      bodyBlocked: 'They’re on in Meno, but your phone hasn’t been asked to allow them yet.',
      openSettings: 'Open Settings',
    },
  },
  help: {
    status: {
      openSettings: 'Needs permission in Settings',
    },
    actions: {
      openIphoneSettings: 'Open Settings',
    },
    steps: {
      tapOpenSettings: 'Tap Open Settings below.',
    },
    quizzes: {
      blocked:
        'Reminders are on in Meno, but your phone isn’t letting them through, so nothing can arrive yet.',
      allowNotifications: 'Turn on All Meno notifications.',
      readyTip:
        'Change the time or turn reminders off in Settings → Reminders. Do Not Disturb, Bedtime mode or Battery Saver can still hold notifications back; Meno can’t see any of them.',
      offTip:
        'Reminders are off in Meno. If your phone asks whether Meno can send notifications, tap Allow.',
      askTip: 'Your phone will ask if Meno can send notifications — tap Allow.',
    },
    speak: {
      body: 'In Speak rounds you say the verse out loud and Meno checks it. Your voice is handled on this phone and never leaves it. You can always type instead.',
      turnOn: 'Turn on Microphone.',
      askTip: 'Your phone will ask about the microphone — tap Allow.',
    },
    faq: {
      multiple: {
        a: 'Yes. Tap “+ Practice another passage” on Today (or in Library). Each passage keeps its own progress, and Today lists them all — your current passage at the top.',
      },
      noReminders: {
        a: 'Open Settings → Reminders. Each kind of reminder says when the next one comes, or why none will yet. The daily reminder comes at the time you set and skips a day you’ve already practiced. Quizzes start once a verse is memorized, and only come between 9am and 9pm. If everything there looks right, check your phone: Do Not Disturb or Bedtime mode holds notifications until it ends, and Battery Saver can delay them. Meno can’t see any of them.',
      },
      voice: {
        a: 'No. When you speak a verse, your phone turns it into text right on the device. The audio is never saved or sent anywhere.',
      },
      deleteApp: {
        a: 'Meno doesn’t use an account — your verses and progress live on this phone — so deleting the app removes them too.',
      },
    },
  },
  lock: {
    setup: {
      unavailableTitle: 'Recite to Unlock isn’t on Android yet',
      unavailableBody:
        'It relies on Apple’s Screen Time, which Android doesn’t have. Everything else in Meno works here as usual.',
    },
  },
} as const;
