# Meno Privacy Policy

_Effective: August 27, 2026_

Meno is built so that your practice of Scripture stays between you and God.
The short version: **no personal data is ever collected** — only anonymous
diagnostics and update checks, described below.

## What stays on your device

Everything Meno knows about you lives only on your phone:

- Your memory goals, practice history, accuracy, streaks, and badges are
  stored in a local database on your device. They are never uploaded.
- **Recitation audio never leaves your phone.** When you recite a verse
  aloud, speech recognition runs entirely on-device using Apple's on-device
  recognition. No audio and no transcripts are sent to us or anyone else.
- Meno has no accounts, no sign-in, no advertising, and no third-party
  tracking of any kind.

## Screen Time ("Recite to Unlock")

If you enable the optional app lock, Meno uses Apple's Screen Time
(Family Controls) framework with your explicit, individual authorization.
Apple's design means **the apps you choose to restrict are never revealed
to Meno** — we receive only an opaque token. Your selection, and every
recitation or override, stays on your device. You can turn the feature off
at any time in Settings, the Override button always works, and deleting
the app removes all restrictions.

## Network use

Meno works fully offline with its built-in public-domain translations
(WEB, KJV, ASV). If you choose the English Standard Version, Meno contacts
Crossway's ESV API once per passage to download the text, which is then
cached on your device under Crossway's license. That request contains only
the passage reference (for example, "Philippians 1") and our API key.

Other translations come from the YouVersion Platform, which licenses each
version from its publisher. When you open the translation list, Meno asks
it which languages and versions it can offer. Those requests contain our
app key, your phone's language setting (for example, "es-MX") so the names
come back in your language, and which language to list versions for: yours
and English at first, then any language you tap. Searching the list happens
on your phone, and what you type is never sent. The list is saved on your
device, so Meno asks again only after a week has passed, your phone's
language has changed, or you tap a language.

When you read or practice a passage in one of these versions, Meno asks for
that chapter. The request contains our app key, the version, and the
chapter (for example, "Philippians 1"). If a goal uses a version your phone
hasn't seen yet, such as after reinstalling or from a challenge link, Meno
also looks up that version's name and copyright line. The verse text itself
is never saved: it stays in memory only until Meno closes, so these versions
need a connection each time you practice.

Neither service receives personal information, identifiers, or anything
about you: not your goals, your progress, or your recitations. As with any
internet request, each can see the network address a request came from and
which version of Meno and iOS sent it.

## App updates

So fixes can reach you without waiting for an App Store release, Meno asks
Expo's EAS Update service whether a newer version of its code is available
when it opens, and downloads it if so. That request contains technical
details only: the app version, which update is running, and a random
identifier Meno creates when it is installed (deleting and reinstalling the
app replaces it), which lets a fix roll out to some devices before others.
If Meno crashed while starting, the next request also includes that error
message. It never contains your goals, progress, recitations, or anything
you typed or said, and it is never linked to your identity.

## Anonymous diagnostics

To keep Meno stable, the app sends anonymous crash reports and performance
measurements (such as launch time and screen-load time) to Expo's EAS
Observe service. These diagnostics contain technical details only — error
messages, device model, OS version — and are never linked to your identity.
They contain no Scripture progress, no recitations, and nothing you typed
or said.

## Notifications

Review reminders and pop quizzes are scheduled locally on your device.
No push-notification service is used and nothing is transmitted.

## Permissions Meno asks for

- **Microphone & speech recognition** — only to check your recitation,
  processed on-device, only while you're on a Speak screen.
- **Notifications** — only if you opt in to reminders and pop quizzes.
- **Screen Time authorization** — only if you enable Recite to Unlock.
- A photo-library notice may appear in Settings because of a system image
  framework Meno includes; Meno never reads or saves your photos.

## Children

Meno collects no personal data from anyone, including children. The app is rated 4+.

## Changes

If a future version of Meno ever changes any of the above — for example,
optional accounts for syncing across devices — this policy will be updated
first, and nothing will leave your device without your explicit choice.

## Contact

Questions: rhoadsjustin@gmail.com
