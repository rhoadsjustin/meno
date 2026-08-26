# 02 — Architecture

## 1. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Expo SDK 56+, React Native, TypeScript strict | CNG/prebuild; custom dev client (no Expo Go — widgets/device-activity/speech need dev builds) |
| Routing | Expo Router | File-based; typed routes on |
| UI | `@expo/ui` (universal) + `@expo/ui/swift-ui` for iOS polish | Stable since SDK 56. Real SwiftUI/Compose primitives — this is what delivers the "feels iOS on iOS, Android on Android" requirement |
| State | Zustand (client), TanStack Query (server, Phase 2) | Keep stores small and feature-scoped |
| DB | expo-sqlite + Drizzle ORM | Local-first; migrations checked in |
| Speech | expo-speech-recognition | `requiresOnDeviceRecognition: true` |
| Widgets | expo-widgets | Stable SDK 56; React components, App Group shared storage |
| Phone lock | react-native-device-activity | iOS 16+; FamilyControls entitlement required |
| Notifications | expo-notifications | Local scheduling for reviews |
| Haptics | expo-haptics | |
| Backend (Phase 2) | Supabase | Auth (Sign in with Apple required), Postgres, realtime for challenges |
| Builds | EAS Build + EAS Update | |

## 2. Architectural principles

1. **Local-first.** Everything in F1–F4, F6, F7 works with zero network (using bundled translations). Sync is additive, never required.
2. **Pure core.** Grading, normalization, chunking, and scheduling are pure TypeScript modules with no RN imports — fully unit-testable, reusable in widgets and (later) server.
3. **Native shell.** Screens are thin: Expo UI components + Zustand + calls into services.
4. **One door to Scripture.** `services/bible` is the only module that reads translation data and the only place licensing rules live.

## 3. Project structure

```
src/
  app/                      # Expo Router routes
    (tabs)/
      index.tsx             # Today (home)
      library.tsx           # Goals & memorized
      stats.tsx             # Streaks, accuracy, badges
      settings.tsx
    practice/[goalId].tsx   # Tier session
    review/[itemId].tsx     # Review quiz (notification deep-link target)
    reader/[ref].tsx        # Reading mode
    lock-setup/             # Screen Time onboarding flow
    unlock.tsx              # Recite-to-unlock (shield deep-link target)
  features/
    goals/                  # goal creation wizard, chunk plan
    practice/               # tier session UI + per-mode quiz components
    review/                 # review queue UI
    reader/
    lock/                   # device-activity integration
    social/                 # Phase 2
    stats/
  services/
    bible/                  # translation registry, text access, licensing enforcement
    grading/                # normalization, diff, scoring (pure)
    scheduler/              # spaced repetition, review queue (pure)
    chunking/               # passage → chunks (pure)
    notifications/
    widgets/                # widget data publishing (App Group)
    db/                     # drizzle schema + migrations
  widgets/                  # expo-widgets components ('widget' directive)
  theme/                    # tokens from docs/07
```

## 4. Data model (Drizzle/SQLite)

```ts
// Canonical reference type used everywhere
type Ref = { bookId: string; chapter: number; verse: number }; // bookId = OSIS (e.g. 'Phil')

translations(id, abbrev, name, languageCode, licenseType /* 'public_domain' | 'api_cached' | 'api_ephemeral' */, source /* 'bundled' | 'api_bible' | 'esv_api' */, isDownloaded)

verses(translationId, bookId, chapter, verse, text)          // bundled + permitted cache only
  // composite PK; FTS5 virtual table for search

goals(id, translationId, startRef, endRef, title, createdAt, targetDate?, status /* active|completed|archived */, challengeId?)

chunks(id, goalId, orderIndex, startRef, endRef, tier /* 0..6 */, status /* locked|active|learning|memorized */, memorizedAt?)
  // tier = highest tier passed; 6 = memorized

attempts(id, chunkId, mode /* read|firstLetters|blanks25|blanks50|blanks75|arrange|type|speak */, accuracy, durationMs, missedWords JSON, createdAt, source /* practice|review|popquiz|unlock */)

reviewItems(id, chunkId, easiness REAL, intervalDays REAL, repetitions INT, dueAt, lastReviewedAt, health /* fresh|fading|atRisk */)

streaks(id=1, current, longest, lastActiveDate, graceDaysAvailable, graceDaysUsedThisWeek)

badges(id, code, earnedAt)

lockConfig(id=1, enabled, mode /* firstPickup|everyPickup|schedule */, relockMinutes?, scheduleJSON?, verseSource /* current|randomMemorized */, overrideStyle /* instant|hold10s */, activitySelectionToken TEXT /* opaque FamilyActivitySelection */)

lockEvents(id, type /* shielded|reciteSuccess|override */, verseChunkId?, accuracy?, createdAt)

settings(key, value)
```

Widget data is published to App Group storage (`services/widgets`) as a small JSON snapshot: current verse text (respecting tier obscuring), streak, due count. SQLite itself stays in the app sandbox.

## 5. Bible content & licensing strategy

This is the highest-risk non-technical area. Enforce in `services/bible`, not in UI.

### Bundled (offline, no restrictions)
Public-domain English translations shipped as a prebuilt SQLite database (~4–5 MB each, compiled at build time from open datasets):
- **WEB** (World English Bible) — modern English, public domain. **Default translation.**
- **KJV**, **ASV** — public domain.

### Licensed via API
- **ESV** — Crossway ESV API: free key for non-commercial use with verse-limit and caching restrictions (500-verse per query limits, no full-Bible caching, attribution required). Cache only what the license allows (verses the user has explicitly added to goals), store `licenseType='api_cached'`, purge on goal deletion.
- **NIV / NASB / CSB / NLT etc.** — API.Bible (scripture.api.bible) where available. Many licenses are **ephemeral-only**: display but don't persist. Mark `api_ephemeral`; memory goals in ephemeral translations require connectivity and show a notice, or (better) prompt to use a cacheable translation for the memorizing itself.
- Attribution strings per translation stored in the registry and rendered wherever text appears (reader footer, quiz footer, widget where space allows).

### Rules enforced by `services/bible`
1. Never write verse text to `verses` unless `licenseType` permits.
2. Never include licensed text in analytics, logs, or share sheets beyond permitted excerpt lengths.
3. Widget snapshots for licensed translations only include text if caching is permitted; otherwise widget shows reference + first-letters (derived data — verify per license; safe default is reference only).

**Action item for the human**: register for ESV API and API.Bible keys; review current license terms at build time — terms change and the above reflects mid-2026 understanding.

## 6. Offline & sync

- **Phase 1**: no accounts. Everything local. iCloud device backup covers data loss adequately.
- **Phase 2 (Supabase)**: Sign in with Apple + email. Sync = push-based, last-write-wins per row with `updatedAt`, scoped to goals/chunks/attempts/reviewItems/streaks/badges. Social features (challenges, leaderboards) are server-native. Never sync verse text — only refs; each device resolves text through its own licensed channel.

## 7. Speech recognition

- `expo-speech-recognition` with `requiresOnDeviceRecognition: true` and `addsPunctuation: false`; language from translation's `languageCode`.
- Provide contextual strings (the expected verse's vocabulary) via `contextualStrings` to bias recognition toward archaic/rare words ("thee", "propitiation", proper nouns).
- Recognition output → same normalization + grading pipeline as typed input (03 §4), with a phonetic-leniency pass for homophones.
- Permissions: mic + speech recognition, requested just-in-time on first Speak-tier attempt with a pre-permission explainer screen.

## 8. Performance & quality budget

- Cold start < 1.5s to Today screen on iPhone 12.
- Quiz interactions grade in < 16ms (pure functions; no async in grading path).
- Widget timeline updates: on every app close (publish snapshot) + scheduled refresh policy after midnight (new day/streak state).
- Full test coverage for `services/grading`, `services/scheduler`, `services/chunking`.
