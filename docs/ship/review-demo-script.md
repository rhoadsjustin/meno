# App Review demo video — Recite to Unlock

A ~90-second screen recording for the Resolution Center reply. Reviewers cannot
easily exercise Screen Time features themselves, so the video has to show the whole
loop on a real iPhone: individual authorization, Apple's own app picker, the shield,
"Recite to unlock", the Override that always works, and the kill switch.

Every label below is the app's real copy (`src/features/lock/LockSetup.tsx`,
`src/features/lock/UnlockScreen.tsx`, `src/services/lock/index.ts`), so the video
matches what the reviewer will see if they try it.

## Before you record (five minutes)

1. **Install the build under review** (1.0.0 build 17) from TestFlight on your iPhone.
   To show first launch and onboarding without wiping your real data, use the
   side-by-side **Meno Review** build instead (`APP_VARIANT=review`, see the comment in
   `app.config.ts`): a separate bundle id, sandbox, app group and Screen Time
   authorization, so it starts fresh and deleting it never touches the real Meno.
2. **Have a current verse.** Open Meno and make sure Today shows a goal with a chunk you
   can recite from memory. Short is better on camera. You can type instead of speak
   (the unlock screen has a Type toggle), which also avoids needing the mic in the
   recording.
3. **Start from "off".** Settings tab → Recite to Unlock → if it is on, tap
   "Turn off and clear all shields now".
4. **Make Apple's permission dialog appear on camera.** iPhone Settings → Screen Time →
   Apps with Screen Time Access → Meno → Remove. If Meno is not listed, it has not
   been authorized on this phone and the dialog will appear anyway.
5. **Pick a harmless app to shield**, such as Safari or Notes, so nothing personal is on
   screen. Clear Safari's open tabs first.
6. **Silence notifications** you do not want captured: Focus → Do Not Disturb is fine,
   because Meno's unlock notification is time-sensitive and still comes through.
7. **Capture.** Either Control Center → Screen Recording on the phone (add it under
   Settings → Control Center if missing; microphone off), or QuickTime on the Mac with
   the phone on USB (File → New Movie Recording → choose the iPhone as camera) for a
   clean capture with no recording pill. Portrait, one continuous take.

## Shot list

Times are targets, not limits. Pause a beat on each screen so the reviewer can read it.

| Time | Do | What the reviewer sees | Why it matters |
|---|---|---|---|
| 0:00 | Meno → Settings tab → tap **Recite to Unlock** | Row subtitle: "Ask for a verse before your distracting apps open." | The feature is opt-in and off by default. |
| 0:05 | Hold on the explainer, then **Continue** | Heading "Recite to unlock". Copy includes "Apple never tells Meno which apps you pick, and you can override or switch this off at any time." | States override and privacy up front. |
| 0:12 | Tap **Grant permission**, then allow in Apple's dialog | iOS Screen Time sheet. Choose the individual option, not a child account. | Individual authorization only. |
| 0:20 | Tap **Pick apps**, choose Safari in Apple's picker, Done, then continue | Apple's FamilyActivityPicker. | App identities never reach Meno; it only holds an opaque token. |
| 0:30 | On the configure step show the three modes, choose **Every pickup**, tap **Turn on**, then **Done** | "First pickup of the day", "Every pickup", "Evenings (9–11pm)". | The user chooses the friction. |
| 0:40 | Go Home, open Safari | Meno's shield: the verse reference as title, a first-letters hint, buttons **Recite to unlock** and **Override**. | The shield itself. |
| 0:48 | Tap **Override** | Shield clears instantly; Safari opens. No quiz, no delay, no message. | The escape hatch is one tap and always present. |
| 0:55 | Back in Meno: Settings → Recite to Unlock → Continue → continue past the picker (your selection is kept) → **Turn on** → Done | Same flow, now short. | Re-arms the shield for the second path. |
| 1:05 | Open Safari again, tap **Recite to unlock** on the shield | Shield closes and a time-sensitive notification appears: the verse reference with "Tap here to recite and continue." Tap it. | iOS does not let a shield open an app, so the notification is the sanctioned bounce. |
| 1:12 | Recite on Meno's unlock screen, or tap Type and type it | Verse reference, mic button, Type toggle, **Override** quietly at the bottom. Pass at 85% or better. | Friction with grace: one retry ("Close — a few words slipped. One more go?"), and Override stays on screen throughout. |
| 1:25 | After the success state, open Safari | Opens with no shield. | A recitation clears the shield. |
| 1:32 | Meno → Settings → **Turn off and clear all shields now** → open Safari | No shield, and the Recite to Unlock row reads as off. | The kill switch works even if speech or permissions are broken. |
| 1:40 | Stop recording | | |

If you want to show the fallback as well, miss the recitation on purpose once at 1:12: the
retry message appears and Override is still available. Optional; it adds about 15 seconds.

## After recording

Trim the ends and shrink the file before attaching (Resolution Center attachments have a
size cap; a 720p H.264 file is plenty):

```bash
ffmpeg -i demo.mov -vf "scale=-2:1280" -c:v libx264 -crf 24 -preset slow -an demo-720p.mp4
```

Drop `-an` if you narrated.

## Resolution Center reply (paste and adjust)

> Thank you for the review. Build 17 (1.0.0) is signed with the Family Controls
> (Distribution) entitlement, which is now granted and enabled on com.rhoadsdev.meno
> and its three Screen Time extensions (ShieldConfiguration, ShieldAction and
> ActivityMonitorExtension).
>
> The attached video shows the "Recite to Unlock" feature end to end on an iPhone:
> the user turns it on in Settings, grants individual Screen Time authorization (never
> a parent/guardian role), picks apps with Apple's own picker, and from then on opening
> one of those apps shows a shield with two buttons. "Override" clears the shield
> instantly with no quiz. "Recite to unlock" sends a notification into Meno, where a
> short recitation of the user's current verse clears the shield. Settings also has a
> kill switch that disables all shields immediately. The feature is optional, off by
> default, and the user can always escape it.
>
> Recitation audio is processed on-device with on-device speech recognition and is
> never recorded or uploaded. App choices stay on the device; Meno only holds an
> opaque Screen Time token.

The longer defense (frameworks used, review notes, privacy labels) is in
`testflight-checklist.md` §3 and `../04-phone-lock.md` §8.
