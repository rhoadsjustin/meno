# 04 — Phone Lock: "Recite to Unlock" (iOS)

The differentiating feature and the riskiest. Read this whole doc before touching it. iOS-only at launch; Android plan in §9.

## 1. How it works (user-facing)

1. In **Settings → Recite to Unlock**, the user enables the feature, grants Screen Time authorization, and picks which apps/categories to shield using the native **FamilyActivityPicker** (Apple never exposes app identities to us — we get an opaque selection token).
2. They choose a mode:
   - **First pickup of the day** — shield is armed overnight; the first time they open a shielded app each day, the shield appears. One successful recitation clears all shields until the next morning.
   - **Every pickup** — after a successful recitation, apps stay open; shields re-arm after N minutes (user-set: 15/30/60) of the unlock.
   - **Schedule** — shields active during chosen windows (e.g., 6–8am, 9pm–midnight).
3. They choose the verse source: **current memory verse** or **random memorized verse**.
4. When a shielded app is opened, iOS shows our custom **shield screen**: verse reference, "Recite to unlock" button, and "Override" button.
5. **Recite to unlock** deep-links into the app's `unlock` screen → Speak (or Type) quiz at a forgiving threshold (≥85%) → on pass, we clear the shields per the mode, celebrate briefly, and bounce the user back.
6. **Override** always works (§6).

## 2. Apple entitlement — DO THIS FIRST

- The feature uses FamilyControls + ManagedSettings + DeviceActivity. These require the **`com.apple.developer.family-controls` privileged entitlement**, which must be requested from Apple via the developer portal (Certificates → Identifiers → request Family Controls (Distribution)) **for the main app AND every extension target that uses it** (shield configuration extension, shield action extension, device activity monitor extension).
- Development builds work without the granted distribution entitlement; **TestFlight/App Store will not**. Approval can take days to weeks. Apply at project start with a clear description: personal digital-wellness self-restriction, individual authorization only (not parental controls over a child).
- Runtime: request `.individual` authorization from the user; iOS 16+ required (set deployment target accordingly). **Physical device only — Screen Time APIs do not work reliably in the simulator.**

## 3. Implementation: react-native-device-activity

Use `react-native-device-activity` (kingstinct). It wraps the three frameworks and supports Expo config-plugin setup with a custom dev client. Key APIs used:

- `requestAuthorization()` / authorization status
- `DeviceActivitySelectionView` (or the picker call) → returns the opaque `familyActivitySelection` string → persist in `lockConfig.activitySelectionToken`
- `ManagedSettings` shielding: apply/clear shields for the selection
- `DeviceActivity` schedules: define monitoring intervals that (re)apply shields via the **DeviceActivityMonitor extension** (`intervalDidStart` → set `store.shield.applications`; `intervalDidEnd` → clear)
- **ShieldConfiguration extension**: styles the shield (title = verse reference, subtitle = first-letters hint, primary button "Recite to unlock", secondary "Not now / Override")
- **ShieldAction extension**: primary button → open host app via deep link `meno://unlock?source=shield`; secondary → override flow

### Mode mechanics

- **First pickup**: DeviceActivity daily schedule from 00:00 arms shields. Successful recitation → clear shields via ManagedSettings + set a flag; a short DeviceActivity interval (or simply not re-arming until the next midnight schedule fires) keeps them clear for the day.
- **Every pickup**: on recitation success, clear shields and start a one-shot DeviceActivity interval of N minutes; `intervalDidEnd` re-applies shields.
- **Schedule**: one DeviceActivity schedule per window.

### Extension ↔ app state sharing
Extensions can't touch the app's SQLite. Share via **App Group** UserDefaults: current verse reference + first-letter hint string + mode flags, published by `services/lock` whenever the current verse or config changes. (Same App Group the widgets use.)

## 4. The unlock quiz

- Route: `app/unlock.tsx`, launched via deep link. Minimal chrome, one job.
- Default Speak mode with instant "Type instead" toggle (loud environments, mic-shy moments).
- Threshold **85%** (more forgiving than practice — this is friction-with-grace, not an exam). One retry, then the screen offers Override prominently. Never trap someone in a failed-quiz loop.
- Success: clear shields per mode, log `lockEvents(reciteSuccess)`, count toward streak + SM-2, brief success state (<1.5s), then `UIApplication` returns user to where they were (or Today screen).

## 5. Setup UX (lock-setup flow)

1. Explainer: what it does, what Apple's permission dialog will say, privacy note ("Apple never tells us which apps you pick").
2. Screen Time authorization request.
3. Native app picker.
4. Mode + verse source + override style.
5. Test run: simulated shield preview + one practice recitation so the first real shield isn't a surprise.

## 6. Override — non-negotiable design rules

- Override is **always** reachable from the shield and from the unlock screen. Options for self-chosen friction: instant, or press-and-hold 10 seconds with breathing animation. Nothing stronger in v1.
- Overrides are logged and shown neutrally in stats ("This week: 12 recitations, 3 overrides"). **No shaming copy, ever.**
- A global kill switch in Settings disables all shields immediately and cancels schedules — works even if speech/permissions are broken.
- Failure-safety: if the app is deleted, iOS clears its managed settings; document for users that deletion removes locks.
- These rules are also an App Review defense: reviewers must be able to escape the lock trivially.

## 7. Edge cases

- Screen Time authorization revoked in iOS Settings → detect on foreground, disable feature, notify gently.
- Focus modes / parental Screen Time coexistence: we never touch settings outside our ManagedSettingsStore; document that another Screen Time controller app may conflict (Apple allows limited concurrent controllers; behavior degrades — detect via API errors and surface guidance).
- Time zone changes: schedules are local-time; re-register on `significantTimeChange`.
- No memorized verses yet + "random memorized" source → fall back to current goal chunk at Blanks75.

## 8. Privacy & App Review posture

- All recitation audio on-device; the opaque activity selection never leaves the device; no analytics on which categories are shielded.
- App Review notes must explain: individual self-restriction, override always available, entitlement approved. Include a demo video — reviewers can't easily exercise Screen Time features.

## 9. Android (later phase, documented now)

No Screen Time equivalent. The viable path: `UsageStatsManager`/foreground-app detection + drawing an overlay (SYSTEM_ALERT_WINDOW) or an Accessibility Service to intercept app launches — the approach used by Android focus apps. Play Store policy on Accessibility Services is strict (requires declared core use case). Defer; ship Android without the lock, keep `features/lock` behind a platform gate.
