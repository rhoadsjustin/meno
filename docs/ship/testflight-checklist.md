# TestFlight ship checklist (v1)

Working checklist for the first external TestFlight release. Copy-paste
sections into App Store Connect (ASC) where marked.

## 0. Gate: Family Controls (Distribution) — VERIFY FIRST

Dev builds work without it; **TestFlight will not**. Apple must approve the
distribution entitlement, and then it must be enabled on **all four**
Screen-Time-related identifiers at
developer.apple.com → Certificates, Identifiers & Profiles → Identifiers:

- `com.rhoadsdev.meno`
- `com.rhoadsdev.meno.ActivityMonitorExtension`
- `com.rhoadsdev.meno.ShieldAction`
- `com.rhoadsdev.meno.ShieldConfiguration`

(`com.rhoadsdev.meno.widgets` needs only App Groups — no approval needed.)

If approval is still pending, either wait, or ship the first beta with the
lock feature disabled by removing the `react-native-device-activity` plugin
from app.config.ts temporarily (the UI hides itself when the module is
absent).

## 1. Build & submit (run interactively — Apple login required once)

```bash
npx eas-cli build -p ios --profile production --submit
```

- First run walks through: Apple sign-in, distribution certificate (reuse
  the one on your EAS account), provisioning for all 5 targets, and creating
  the App Store Connect app record ("Meno", bundle `com.rhoadsdev.meno`).
- The ESV key is already on EAS (production environment, sensitive).
- Version is 1.0.0; build numbers auto-increment remotely.

## 2. ASC → App Privacy (nutrition labels)

- **Data collection: “Data Not Collected.”** Everything (goals, attempts,
  streaks, recitation audio/transcripts) stays on-device in SQLite.
  No analytics SDK, no accounts, no third-party code that phones home.
- Tracking: **No.**
- The one network call is Scripture text download (ESV API) — keyed by
  passage reference only, no user identifiers. Reference-only queries are
  not "data collection" in ASC's taxonomy.

## 3. ASC → TestFlight → Beta App Review information

**Beta App Description (paste):**

> Meno helps you memorize Scripture. Pick a passage, climb a ladder of
> practice modes (read → first letters → fill-in-the-blank → arrange →
> type → speak), and keep memorized verses fresh through spaced-repetition
> reviews and optional surprise pop quizzes. An optional Screen Time lock
> asks you to recite your current verse before opening apps you choose to
> restrict. Home screen widgets show your current verse, dissolving as you
> learn it.

**Review notes (paste — the Family Controls defense, docs/04 §8):**

> ABOUT THE SCREEN TIME FEATURE ("Recite to Unlock"):
> Meno uses FamilyControls / ManagedSettings / DeviceActivity for a
> strictly personal, self-imposed focus feature. It requests INDIVIDUAL
> authorization only (never parental/guardian), and only when the user
> explicitly enables it in Settings → Recite to Unlock.
>
> - The user picks which of their own apps to shield via Apple's native
>   FamilyActivityPicker; app identities never reach us (opaque tokens).
> - When a shielded app opens, our shield offers "Recite to unlock"
>   (a ~30-second verse recitation in Meno) and an "Override" button that
>   ALWAYS clears the shields instantly, no questions asked.
> - A kill switch (Settings → Turn off) disables all shields and
>   schedules immediately. Deleting the app removes all restrictions.
> - Recitation audio is processed entirely on-device
>   (requiresOnDeviceRecognition); no audio or transcripts leave the phone.
>
> The feature is OFF by default; reviewers can exercise the full loop in
> under two minutes: Settings → Recite to Unlock → enable → pick any app →
> Turn on → open that app → tap Override (instant) or Recite to unlock.
> A demo video is attached.
>
> ESV Scripture text is fetched from Crossway's licensed ESV API using our
> API key and cached per that license's terms; WEB/KJV/ASV are public
> domain and bundled.

**Demo video script (record ~90s screen capture on the phone):**
1. Settings → Recite to Unlock → walk the 5-step setup, pick one app.
2. Open the shielded app → shield appears with verse reference.
3. Tap Override → app opens instantly (escape hatch).
4. Re-shield (every-pickup mode), open again → "Recite to unlock" →
   notification → Meno unlock quiz → recite/type → shields clear.
5. Settings → Turn off → shields gone.

## 4. External testing group

- TestFlight → create group "Public beta" → enable public link after Beta
  App Review approves build 1.
- Internal group (you + family) gets every build instantly, no review.

## 5. Post-approval

- Ship checklist target (docs/08): ≥10 external testers for 2 weeks,
  crash-free ≥99.5% (watch TestFlight → Crashes).
