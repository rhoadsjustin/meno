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
- Prebuild is CNG-managed: never hand-edit `ios/` or `android/` — all native config goes through app.config.ts and config plugins.
- Screen Time features only work on a **physical device**, never the simulator. Guard them behind capability checks so the simulator still runs everything else.

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
2. Dark mode + Dynamic Type verified on the new screens.
3. `npm run typecheck && npm run lint && npm run test` clean.
4. No regressions in prior milestones' criteria.
