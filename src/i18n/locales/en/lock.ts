/** Recite to Unlock: setup flow, the unlock quiz, and the Screen Time shield. */
export default {
  setup: {
    unavailableTitle: 'Recite to Unlock isn’t available on this device',
    unavailableBody:
      'It relies on Apple’s Screen Time, which this device doesn’t provide. Everything else in Meno works here as usual.',
    explainerTitle: 'Recite to Unlock',
    explainerBody:
      'Choose apps that tend to pull you away. When you open one, Meno asks you to recite your current verse first — then gets out of the way.',
    explainerPrivacy:
      'Next, iOS will ask for Screen Time permission. Apple never tells Meno which apps you pick, and you can override or switch this off at any time.',
    authTitle: 'Screen Time permission',
    authBody: 'Meno uses Apple’s Screen Time to shield the apps you choose.',
    authDenied:
      'Permission was declined. Try again, or allow Screen Time access for Meno in iPhone Settings.',
    openSettings: 'Open iPhone Settings',
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
    relockLabel: 'Shields return after',
    relockOption: '{{count}} min',
    notificationNote:
      'On a shield, “Recite to unlock” sends a notification that brings you to your verse, so your iPhone may ask to allow notifications.',
    turnOn: 'Turn on',
    turnOnFailed: 'Recite to Unlock couldn’t be turned on. Try again.',
    doneTitle: 'You’re set',
    doneFirstPickup: 'Your shielded apps ask for your verse the first time you open one each day.',
    doneEveryPickup_one:
      'Your shielded apps ask for your verse now, and again {{count}} minute after each unlock.',
    doneEveryPickup_other:
      'Your shielded apps ask for your verse now, and again {{count}} minutes after each unlock.',
    doneSchedule: 'Your shielded apps ask for your verse between 9 and 11pm.',
    doneNotification: 'On the shield, tap “Recite to unlock”, then tap the notification from Meno.',
    doneNoNotification:
      'Notifications are off for Meno, so the shield can’t bring you here. When you see a shield, open Meno to recite, or allow notifications in iPhone Settings.',
    doneEscape:
      'Override is always one tap away, and “Turn off and clear all shields now” in Settings clears everything.',
    cancelSetup: 'Cancel setup',
  },
  unlock: {
    errorNoGoal: 'There’s no passage in progress to recite right now.',
    errorNothingToRecite: 'Nothing to recite yet',
    errorClear:
      'Meno couldn’t clear the shields. Tap Override, or use “Turn off and clear all shields now” in Settings.',
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
