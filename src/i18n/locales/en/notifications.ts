/** Reminders: scheduled notification copy, the status lines, Today's prompt. */
export default {
  /** Baked into notifications at schedule time (rescheduled on every launch). */
  plan: {
    practiceTitle: 'Time to practice',
    practiceBody: 'Your verse is waiting. A few minutes is plenty.',
    streakTitle_one: '{{count}}-day streak',
    streakTitle_other: '{{count}}-day streak',
    streakBodyDue_one: 'A quick review keeps it going — {{count}} verse is ready.',
    streakBodyDue_other: 'A quick review keeps it going — {{count}} verses are ready.',
    streakBody: 'A minute of practice keeps it going.',
    popQuizTitle: 'Pop quiz',
    popQuizBody: 'Still have a verse you’ve memorized? 30 seconds.',
    /** Names the verse the review opens on: the reference, never its text. */
    popQuizTitleNamed: 'Pop quiz — {{passage}}',
    popQuizBodyNamed: 'Still have it from memory? 30 seconds.',
  },
  /** Android notification channel names (Settings → Notifications). */
  channel: {
    seasonal: 'Seasonal notices',
  },
  status: {
    titlePractice: 'Daily reminder',
    titlePopQuiz: 'Pop quizzes',
    titleStreak: 'Streak reminder',
    dayToday: 'today',
    dayTomorrow: 'tomorrow',
    dayOn: 'on {{weekday}}',
    waitingNothingMemorized:
      'Starts once you’ve memorized a verse.',
    waitingNoStreak:
      'No streak yet. Practice today to start one.',
    waitingNothingToPracticeStreak:
      'Nothing is in progress, so there’s no reminder to carry your streak.',
    waitingNothingToPractice:
      'No passage in progress, so there’s nothing to be reminded of.',
    waitingNotScheduled: 'Nothing is scheduled right now. Open Meno again and it will set the next one.',
    off: 'Off. Reminders are switched off in Meno.',
    blockedCanAsk:
      'Can’t arrive yet. Your iPhone hasn’t been asked to allow notifications for Meno.',
    blocked: 'Can’t arrive. Notifications are turned off for Meno in iPhone Settings.',
    nextQuiz: 'Next pop quiz {{day}}, sometime between {{from}} and {{to}}.',
    streakSafe_one:
      'Your {{count}}-day streak is safe for today. The next reminder, {{day}} at {{time}}, will mention it.',
    streakSafe_other:
      'Your {{count}}-day streak is safe for today. The next reminder, {{day}} at {{time}}, will mention it.',
    streakNext_one: 'Your {{count}}-day streak is mentioned in the next reminder, {{day}} at {{time}}.',
    streakNext_other:
      'Your {{count}}-day streak is mentioned in the next reminder, {{day}} at {{time}}.',
    nextReminder: 'Next reminder {{day}} at {{time}}.',
    allBlockedTitle: 'None of these can arrive yet',
    allBlockedCanAsk:
      'The daily reminder, pop quizzes and the streak reminder are on in Meno, but your iPhone hasn’t been asked to allow notifications for Meno.',
    allBlocked:
      'The daily reminder, pop quizzes and the streak reminder are on in Meno, but notifications are turned off for Meno in iPhone Settings.',
    summaryOff: 'Off',
    summaryNeedsPermission: 'Needs your permission',
    summaryNeedsSettings: 'Needs permission in iPhone Settings',
    summaryNothing: 'On, nothing to send yet',
    summaryNextAt: 'On, next {{day}} at {{time}}',
    summaryNext: 'On, next {{day}}',
    /** VoiceOver reads a status line as one element. */
    lineLabel: '{{title}}. {{detail}}',
  },
  prompt: {
    titleBlocked: 'Reminders can’t reach you yet',
    titleOff: 'Want a daily reminder?',
    bodyViaSettings:
      'They’re on in Meno, but notifications are turned off for Meno on this iPhone. Turn on Allow Notifications and they start by themselves.',
    bodyBlocked: 'They’re on in Meno, but your iPhone hasn’t been asked to allow them yet.',
    bodyOff:
      'Reminders are off, so Meno won’t prompt you to practice. Turn them on for one a day, at a time you choose.',
    openSettings: 'Open iPhone Settings',
    allow: 'Allow notifications',
    turnOn: 'Turn on reminders',
    dismissHint: 'Hides this for good. Reminders stay in Settings.',
    // Takes the card's place once Not now is tapped.
    dismissed: 'Meno won’t ask again. You can turn reminders on any time in Settings → Reminders.',
  },
} as const;
