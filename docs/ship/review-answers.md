# App Review — answers to the reviewer's information request

Paste these into the Resolution Center reply (or App Review Information → Notes).
Every claim below matches the shipped build and the privacy policy at
https://rhoadsjustin.github.io/meno/privacy-policy.html. Items 2–6 are the
reviewer's numbered questions; item 1 describes the attached recording.

## Short version (fits the 4,000-character Resolution Center field)

Paste this one as-is. The expanded version below is the same content with more detail,
for follow-up questions.

```
1. VIDEO: Recorded on a physical iPhone 15 Pro Max (iOS 27) from a fresh install. It starts at launch: onboarding (welcome, notifications, widgets, lock preview), creating a first goal, a practice session through the modes (Read, First letters, Blanks, Arrange, Type, Speak), the main tabs, then the full Recite to Unlock loop: individual Screen Time authorization, Apple's app picker, the shield, Override (instant), "Recite to unlock", and the kill switch. Meno has no accounts (no registration, login or deletion), no paid content or IAP, and no hosted user-generated content. The only sharing is a "challenge link" sent via the iOS share sheet; it carries just a Scripture reference, translation, date and title, and the recipient previews it before accepting. Nothing is uploaded to us.

2. PURPOSE: Meno helps Christians (individuals, students, small groups, families; rated 4+) memorize Scripture and keep it. Rote memorization is tedious, verses are forgotten without review, and the phone is the distraction. Meno splits any passage into day-sized pieces, walks each up a ladder of practice modes while the text visibly dissolves as it is learned, brings memorized verses back for spaced-repetition review and pop quizzes (max 2/day), shows the current verse on widgets, and can optionally ask for a recitation before opening apps the user restricts, always with a one-tap override. Free, no ads, no account, no tracking; all progress stays on the device.

3. SETUP: No credentials or sample files. Launch > onboarding (notifications optional) > Today > "Start a goal" > pick a passage and translation (WEB, KJV, ASV are built in and offline; ESV downloads once per passage) > Practice. Speak mode asks for mic/speech permission (processed on-device); a Type toggle is always available instead. Recite to Unlock (physical iPhone only): Settings > Recite to Unlock > Grant permission > Pick apps > choose "Every pickup" > Turn on > Done. Open that app: the shield offers "Override" (clears instantly) and "Recite to unlock" (a notification opens Meno; recite or type at 85%+ to clear). Settings > "Turn off and clear all shields now" disables everything; deleting the app removes all restrictions. Widgets: long-press the Home or Lock Screen and add Meno.

4. EXTERNAL SERVICES: Crossway ESV API (api.esv.org) for ESV text only; requests contain just the passage reference and our API key. Expo EAS Observe for anonymous crash and performance diagnostics (not linked to identity). Apple on-device frameworks: Speech with on-device recognition required (audio never leaves the phone), FamilyControls/ManagedSettings/DeviceActivity, WidgetKit, and local UserNotifications (no push service). No authentication service, payment processor, ad or analytics SDK, AI service, or backend of our own.

5. REGIONS: Meno functions identically in all regions. English interface and translations, free everywhere, no region-gated content or features. Built-in translations work offline anywhere; ESV download needs internet but is not region-restricted. Where on-device English speech recognition is unavailable, the Type alternative is offered.

6. REGULATED/PROTECTED MATERIAL: Not a regulated industry. The ESV text is copyright 2001 by Crossway and is accessed only through Crossway's official ESV API under its license (free non-commercial key; the app is free). Per the license, Meno shows the required Crossway attribution wherever ESV text appears, respects per-request verse limits, caches only passages the user added to a goal, purges them when the goal is deleted, and never caches the full Bible. API registration details available on request. WEB, KJV and ASV are public domain. Apple has granted Family Controls (Distribution) for com.rhoadsdev.meno and its three Screen Time extensions, and the build is signed with it.
```

---

## Expanded version

### 1. Screen recording

The attached video was recorded on a physical iPhone 15 Pro Max running the
current iOS release, starting from a fresh install. It begins with launching the
app and follows the typical first-time user flow: the onboarding tour (welcome,
optional notification reminders, Home Screen and Lock Screen widgets, and a
preview of the optional Recite to Unlock feature), creating a first memory goal
with the passage wizard, a practice session climbing the practice ladder (Read,
First letters, Fill in the blanks, Arrange, Type, Speak), the Today screen with
streak and due reviews, the Library and Stats tabs, and Settings. It then shows
the complete Recite to Unlock loop on the device: individual Screen Time
authorization, Apple's own app picker, the shield appearing over a chosen app,
the Override button clearing it instantly, the "Recite to unlock" path through a
short recitation, and the kill switch in Settings.

Meno has no account registration, login, or account deletion (there are no
accounts of any kind), no paid content, subscriptions, or in-app purchases, and
no user-generated content hosted or displayed from other users, so those flows
do not exist and are not shown. The only sharing feature is a "challenge link"
a user can send through the iOS share sheet; the link encodes a Scripture
reference, translation, target date, and goal title, and the recipient previews
it before creating their own local copy. Nothing is uploaded to or hosted by us.

### 2. Purpose and target audience

Meno is a Scripture memorization app. Its users are Christians who want to
commit Bible passages to memory: individuals in personal devotion, students,
small-group and church members memorizing together, and families. It is rated
4+ and contains nothing unsuitable for any age, but it is designed for teens and
adults who can read and recite English text.

The problem it solves: memorizing Scripture by rote is tedious, verses learned
once are forgotten without review, and the phone that could help is usually the
distraction. Meno addresses all three. It breaks any passage, from one verse to
whole chapters, into day-sized pieces and walks each piece up a ladder of
practice modes, from reading to reciting aloud, with the verse text visibly
dissolving from the screen as the user learns it. Memorized verses return for
spaced-repetition review just before they would be forgotten, with optional
brief pop quizzes (at most two per day, never at night). Widgets keep the
current verse in front of the user. The optional Recite to Unlock feature lets
users choose apps they would rather open less, and asks for a recitation of
their current verse before those apps open, with an always-available one-tap
override. The value is simple: the user ends up knowing the passage by heart,
and keeps it.

Meno is free, with no ads, no account, and no tracking. All progress stays on
the device.

### 3. Setup and access instructions

No login credentials, sample files, or test accounts are needed. Everything is
available immediately after install.

1. Launch Meno. The onboarding tour takes four taps. Notification permission is
   optional (used only for review reminders and pop quizzes, scheduled locally).
2. On the Today tab, tap "Start a goal". Choose a book, chapter, and verse
   range, and a translation. World English Bible (default), King James Version,
   and American Standard Version are built in and work offline. The English
   Standard Version downloads once per passage from Crossway's ESV API and then
   works offline. A short passage such as Philippians 4:4–7 is a good test.
3. Tap Practice on the Today card. Each session takes the current piece through
   its next practice mode; the mode names appear at the top of the screen. The
   Speak mode asks for microphone and speech recognition permission (processed
   on-device); a Type toggle on that screen is always available as an
   alternative. Practice can be exited and resumed at any time.
4. Library shows every goal and its progress. Stats shows accuracy, memorized
   verses, streak, and badges. Settings holds notification preferences,
   translation, and the Recite to Unlock feature.
5. Recite to Unlock (requires a physical iPhone; Screen Time APIs are not
   available in the simulator): Settings → Recite to Unlock → Continue → Grant
   permission (Apple's individual Screen Time authorization) → Pick apps (Apple's
   FamilyActivityPicker; choose any app, for example Safari) → choose a mode
   ("Every pickup" is the fastest to test) → Turn on → Done. Open the chosen app:
   Meno's shield appears with the current verse reference and two buttons.
   "Override" clears the shield instantly. "Recite to unlock" sends a
   notification into Meno, where reciting (or typing) the verse at 85% accuracy
   or better clears the shield. Settings → "Turn off and clear all shields now"
   disables the feature entirely. Deleting the app also removes all restrictions.
6. Widgets: long-press the Home Screen or Lock Screen → add a Meno widget. It
   shows the current verse at its current level of dissolution; "Edit Widget"
   chooses how much of the verse is revealed.
7. Challenge links: Library → a goal card → "Share challenge" opens the iOS share
   sheet. A recipient with Meno installed taps the link to preview and accept
   the same goal on their own phone.

### 4. External services, tools, and platforms

- Crossway ESV API (api.esv.org): the only third-party content service. Used
  solely to download English Standard Version text when the user selects that
  translation. Each request contains only the passage reference and our API
  key; it carries no user identifiers. Text is cached on-device under
  Crossway's license terms (see item 6).
- Expo EAS Observe (Expo / 650 Industries): anonymous crash reports and
  performance measurements (launch time, screen load time, error messages,
  device model, OS version). Not linked to identity, not used for tracking,
  and declared in the App Privacy section as Diagnostics, not linked to the
  user.
- Apple frameworks, all on-device: Speech (with on-device recognition required,
  so recitation audio never leaves the phone), FamilyControls / ManagedSettings /
  DeviceActivity (Recite to Unlock), WidgetKit (widgets), and UserNotifications
  (local notifications only; no push service is used).
- Bundled public-domain Scripture texts (World English Bible, King James
  Version, American Standard Version) from open datasets, compiled into the app
  at build time.

Meno uses no authentication service, no payment processor, no advertising or
analytics SDK beyond the diagnostics above, no AI or machine-learning service,
no push-notification service, and no backend of our own. There are no accounts.

### 5. Regional differences

Meno functions identically in every region. The interface and all four
translations are in English; there is no region-specific content, feature
gating, or pricing (the app is free everywhere). The three built-in
translations work fully offline anywhere. Downloading ESV text requires an
internet connection but is not region-restricted. The Speak practice mode uses
Apple's on-device English speech recognition, which is available on supported
iPhones regardless of region; where it is unavailable, the Type alternative is
always offered. Recite to Unlock relies on iOS Screen Time, which is available
on iPhone in all regions.

### 6. Regulated industry and protected third-party material

Meno does not operate in a regulated industry: no health, medical, financial,
legal, gambling, alcohol, or similar content or services.

Protected third-party material: the English Standard Version Bible text is
copyright © 2001 by Crossway. Meno accesses it exclusively through Crossway's
official ESV API under the ESV API license agreement, using an API key
registered to the developer. The app is free with no monetization, consistent
with the non-commercial terms of that key. In line with the license, Meno
displays the required attribution ("Scripture quotations are from the ESV®
Bible, copyright © 2001 by Crossway. Used by permission. All rights reserved.")
wherever ESV text appears, stays well within the per-request verse limits,
caches only passages the user has explicitly added to a goal, purges cached
text when the goal is deleted, and never caches the full Bible. We can provide
our ESV API account registration details on request. The World English Bible,
King James Version, and American Standard Version are in the public domain.

The Family Controls entitlement used by Recite to Unlock has been granted by
Apple (Family Controls Distribution) for com.rhoadsdev.meno and its three Screen
Time extensions (ShieldConfiguration, ShieldAction, ActivityMonitorExtension),
and the build is signed with it.
