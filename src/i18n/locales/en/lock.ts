/** Recite to Unlock: setup flow, the unlock quiz, and the Screen Time shield. */
export default {
  setup: {
    unavailableTitle: 'Recite to Unlock needs your iPhone',
    unavailableBody:
      'Apple’s Screen Time features only work on a physical device — the simulator can’t shield apps. Everything else in Meno works here as usual.',
    explainerTitle: 'Recite to unlock',
    explainerBody:
      'Choose apps that tend to pull you away. When you open one, Meno asks you to recite your current verse first — then gets out of the way.',
    explainerPrivacy:
      'Next, iOS will ask for Screen Time permission. Apple never tells Meno which apps you pick, and you can override or switch this off at any time.',
    authTitle: 'Screen Time permission',
    authBody: 'Meno uses Apple’s Screen Time to shield the apps you choose.',
    authDenied:
      'Permission was declined. You can grant it in Settings → Screen Time, or try again.',
    grantPermission: 'Grant permission',
    pickTitle: 'Choose apps to shield',
    pickBody: 'Pick the apps or categories that should ask for a verse first.',
    pickApps: 'Pick apps',
    changeApps: 'Change apps',
    configureTitle: 'When should Meno ask?',
    modeFirstPickup: 'First pickup of the day',
    modeFirstPickupDetail: 'One recitation clears the shields until tomorrow.',
    modeEveryPickup: 'Every pickup',
    modeEveryPickupDetail_one: 'Shields return {{count}} minute after each unlock.',
    modeEveryPickupDetail_other: 'Shields return {{count}} minutes after each unlock.',
    modeSchedule: 'Evenings (9–11pm)',
    modeScheduleDetail: 'Shields are up during the evening window.',
    turnOn: 'Turn on',
    doneTitle: 'You’re set',
    doneBody:
      'The next time you open a shielded app, Meno will ask for your verse. Override is always one tap away, and the kill switch in Settings clears everything instantly.',
    cancelSetup: 'Cancel setup',
  },
  unlock: {
    errorNoGoal: 'There’s no passage in progress to recite right now.',
    errorNothingToRecite: 'Nothing to recite yet',
    unlockAnyway: 'Unlock anyway',
    missedRetry: 'Close — a few words slipped. One more go?',
    missedFinal: 'Close — a few words slipped.',
    keepTrying: 'Keep trying',
    success: 'The Word remains in you. Carry on.',
    override: 'Override',
  },
  /** The Screen Time shield and the notification its button sends. Keep short. */
  shield: {
    subtitleFallback: 'Recite your verse to continue.',
    primaryButton: 'Recite to unlock',
    secondaryButton: 'Override',
    notificationTitle: 'Recite to unlock',
    notificationBody: 'Tap here to recite and continue.',
  },
} as const;
