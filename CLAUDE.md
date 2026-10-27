# CLAUDE.md — Meno (Scripture Memory App)

You are building **Meno**, an Expo app for Bible verse memorization and reading. iOS is the primary platform and must feel indistinguishable from a first-party SwiftUI app. Android support is maintained but polished later.

Full specs live in `docs/`. Read the relevant spec before implementing any feature. The roadmap in `docs/08-roadmap.md` defines build order and acceptance criteria — follow it.

## Stack (do not deviate without asking)

- **Expo SDK 56+**, TypeScript strict, Expo Router (file-based routing)
- **UI**: `@expo/ui` — universal components by default; drop to `@expo/ui/swift-ui` for iOS-specific polish (glassEffect, native pickers, etc.). Never re-implement a native control in JS if `@expo/ui` provides it.
- **State**: Zustand for UI/session state; TanStack Query for server state (Phase 2+)
- **Persistence**: `expo-sqlite` + Drizzle ORM. Local-first: the app is fully functional offline.
- **Widgets**: `expo-widgets` (stable in SDK 56)
- **Speech**: `expo-speech-recognition` (on-device, `requiresOnDeviceRecognition: true` for verse text privacy + offline)
- **Phone lock (iOS)**: `react-native-device-activity` (kingstinct). Requires custom dev client — this repo does NOT run in Expo Go.
- **Notifications**: `expo-notifications`
- **Backend (Phase 2)**: Supabase (auth, Postgres, realtime) — do not introduce it before Milestone 5.

## Build & run

- Use development builds: `npx expo run:ios` / EAS dev client. Expo Go is not compatible (widgets, device-activity, speech).
- **Toolchain**: build with **Xcode 27.1 or later** (iOS 27.1 SDK) — locally via `DEVELOPER_DIR`, on EAS via the image pinned in `eas.json`. The iOS 27 SDK requires the UIKit scene life cycle (`expo-build-properties` → `ios.enableSceneSupport`, already on); the 27.1 SDK is what gives iPhone Duo its full-screen layout. Older SDK builds run letterboxed on the Duo, and from April 2027 Apple rejects uploads below the iOS 27 SDK.
- **iPhone Duo** (Apple HIG "Designing for iPhone Duo"): size layouts from `useWindowDimensions` (see `src/components/content-layout.ts`), never from idiom or orientation; apply left/right safe-area insets separately; split wide layouts into even halves so a half-folded hinge lands between panes; put navigation controls in the native bar (`src/components/screen-header.tsx` + `Stack.Toolbar`, symbols over text) rather than JS header rows, so they follow the system's vertical bar; keep two-pane layouts clear of the folding region with `FoldAwareRow` (`src/components/fold-aware-row.tsx`), fed by the local Expo module `modules/reserved-regions` (UIKit reserved regions, iOS 27.1+; `useReservedRegions()` / `useContentLayout().fold`). Test in Xcode's Device Hub on the iPhone Duo simulator in every pose: opened, closed, folded, rotated, Split View (project skill: `duo-sim`).
- Prebuild is CNG-managed: never hand-edit `ios/` or `android/` — all native config goes through app.config.ts and config plugins.
- Screen Time features only work on a **physical device**, never the simulator. Guard them behind capability checks so the simulator still runs everything else.
- **Over-the-air updates** (EAS Update): JS-only fixes ship with `npm run ota -- -m "…"`; runbook in `docs/ship/ota-updates.md`. The runtime version is the app `version`, so **bump `version` in app.config.ts whenever native code or native config changes**, even for a TestFlight-only build.
- **Pre-PR gate**: `npm run e2e` (local Maestro suite, see `.maestro/README.md`) must pass before opening any PR. CI runs only fast checks — the Maestro suite is not in CI because GitHub's shared macOS runners proved too flaky to gate on.
- **Duo gate (any PR that touches visible UI)**: before opening the PR, run the changed screens on the iPhone Duo simulator (project skill `duo-sim`; drive poses with argent's `fold` and `rotate` tools) and check each in these poses: closed (cover panel, 466pt wide, status strip on the right), open (landscape UI, 951×669 — short), open + rotated (portrait UI, 669×951), and half-open (nothing interactive on the crease). Fold and unfold with the changed screen up: state must survive. The PR description gets a **Duo** section listing each pose as checked, fixed, or not checked (with the reason — Split View needs Device Hub by hand). A UI PR without that section is not ready.
- **Duo patterns to reach for**: size from `useContentLayout()`, not idiom; two panes only when the window is wider than tall, as even halves via `FoldAwareRow`; on short windows (`layout.shortHeight`, 720pt) keep the primary and secondary actions on screen without scrolling; modal routes wrap in `ModalSafeArea` (`src/components/modal-safe-area.tsx`) so a centred form sheet doesn't take the window's side insets and a full-screen modal keeps tracking rotation and folds; a full-screen modal that needs the fold mounts its own `ReservedRegionsProvider`; on Fabric never toggle a view between an explicit width and flex — change flex weights.
- **Post-merge cleanup**: `npm run cleanup` (`scripts/cleanup-validation.sh`) reclaims what validating a PR leaves behind — the worktrees of merged branches, idle build output in every worktree, and stale Maestro debug output. The e2e gate runs it in the background as it exits, so each validation also clears the previous merge's leftovers. It skips anything a live session is using (device-warden leases, running processes, files touched in the last hour) and never touches simulators. `npm run cleanup -- --dry-run` previews. Keep the app's "auto-archive sessions when their pull request closes" setting on so a merged session drops its worktree at once.

## Conventions

- Feature-folder structure under `src/features/<feature>/` (see `docs/02-architecture.md` §3).
- All Scripture text access goes through `src/services/bible/` — nothing else touches translation data. Licensing rules per translation are enforced there (see `docs/02-architecture.md` §5).
- Verse references use the canonical `Ref` type (`{ bookId, chapter, verse }`) and OSIS-style book IDs (`Gen`, `John`, `1Cor`). Never pass free-text references between modules.
- Grading/normalization logic lives in `src/services/grading/` and is pure + unit-tested. This is the heart of the app — treat it like a compiler, not UI glue.
- Every screen supports dark mode, Dynamic Type, VoiceOver labels, and reduced motion from day one.
- Haptics via `expo-haptics` on all grading feedback and streak events, following `docs/07-design-system.md` §8.

## Guardrails

- **Never bundle or cache licensed translation text beyond what its license permits.** Public-domain translations (WEB, KJV, ASV) are bundled; ESV/NIV/etc. follow the caching rules in `docs/02-architecture.md` §5. When in doubt, don't persist.
- The phone lock must **always** have a working override path (`docs/04-phone-lock.md` §6). Never ship a state where a user can be locked out of their own apps with no escape. This is both an App Review requirement and an ethical one.
- Speech audio is processed on-device only. No verse recitation audio ever leaves the phone.
- Random review notifications respect quiet hours and iOS notification settings; default to max 2/day.
- Write unit tests for: grading/normalization, spaced-repetition scheduling, chunking, streak logic. UI can be tested manually per milestone acceptance criteria.

## Definition of done (every milestone)

1. Acceptance criteria in `docs/08-roadmap.md` pass on a physical iPhone.
2. Dark mode + Dynamic Type verified on the new screens, on a regular iPhone and on the iPhone Duo in every pose (Duo gate above).
3. `npm run typecheck && npm run lint && npm run test` clean.
4. No regressions in prior milestones' criteria.
