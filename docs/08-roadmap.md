# 08 — Roadmap & Milestones

Build in order. Each milestone ends with its acceptance criteria passing on a **physical iPhone** (dark mode + Dynamic Type checked). Android is kept compiling throughout but only polished in M7.

## M0 — Foundations (repo, day 1)
- Expo SDK 56 app, TypeScript strict, Expo Router, ESLint/Prettier, Vitest (or Jest) for pure services, EAS dev-client build profile.
- Theme tokens from 07 §3–5; app icon placeholder; `meno://` scheme + universal-link scaffold.
- Bundled WEB translation compiled into SQLite; Drizzle schema + migrations from 02 §4; `services/bible` reading WEB.
- **Human, in parallel**: enroll dev account tasks — request Family Controls entitlement (04 §2), obtain ESV API + API.Bible keys.
- ✅ App boots to empty Today screen; `SELECT text FROM verses WHERE bookId='John' AND chapter=3 AND verse=16` returns WEB text via the service; tests run in CI.

## M1 — Core engine (pure)
- `services/chunking`, `services/grading` (normalize, word-diff, typo/phonetic leniency), `services/scheduler` (SM-2 variant) per 03, fully unit-tested including KJV archaic cases and multi-chapter chunking determinism.
- ✅ Test suite covers the grading examples in 03; chunking John 1–3 is deterministic and boundary-correct.

## M2 — Goals, reader, practice loop
- Goal wizard (WEB/KJV/ASV only for now); reader screen; Today screen with real data.
- Practice session with tiers 0–5 (Read, First Letters, Blanks 25/50/75, Arrange, Type) + word-level feedback, haptics, tier progression, session resume.
- Library with chunk heatmaps; streak logic + grace days.
- ✅ Can take Philippians 1 from goal creation to a Tier-5 pass on chunk 1; killing the app mid-session resumes correctly.

## M3 — Speak tier + reviews + notifications
- expo-speech-recognition integration (on-device), Speak mode UI with ghost transcript, phonetic leniency wired in.
- Memorized state, reviewItems creation, review sessions, health indicators, stitch sessions.
- Pop-quiz + streak-guard notifications with deep links, quiet hours, settings.
- ✅ Recite Psalm 23:1 aloud and get a sensible grade with homophone tolerance; a scheduled pop-quiz notification deep-links into a working review; SM-2 intervals visibly grow across simulated days (test clock).

## M4 — Widgets
- expo-widgets targets: small/medium/large + Lock Screen accessories per 05; App Group snapshot publishing; tier-based obscuring; midnight rollover timeline entry.
- ✅ Medium widget shows the current verse at the correct dissolution level and updates after a practice session; tapping opens the right screen.

## M5 — Recite to Unlock (gated on Apple entitlement approval)
- react-native-device-activity + extensions (shield config, shield action, activity monitor); lock-setup flow; unlock screen; all three modes; override paths + kill switch; lockEvents stats.
- ✅ On-device: shield a test app, first-pickup mode arms overnight (simulate via schedule), recite clears shields, override works instantly, kill switch clears everything. App Review notes + demo video drafted.

## M6 — Licensed translations + polish pass
- ESV API + API.Bible integration with per-license caching enforcement (02 §5); translation picker with download states; attribution everywhere.
- Full design-system audit (07), accessibility pass (VoiceOver on all quiz modes), performance budget check, empty/error states, onboarding flow (first goal + notification opt-in + widget hint).
- ✅ ESV goal works offline after creation (cached per license); an ephemeral-license translation clearly degrades; VoiceOver user can complete a Blanks quiz.

## M7 — Android parity (minus lock)
- Compose rendering audit of every screen; Android widget (Glance via expo-widgets if supported at build time — verify current expo-widgets Android status; else defer widget only); notification channels; back-gesture correctness.
- ✅ Full memorize loop (M2–M3 criteria) passes on a Pixel; lock feature cleanly hidden.

## M8 — Social (Phase 2)
- Supabase: Sign in with Apple, sync per 02 §6, challenges + boards + invites per 06 §5, universal links.
- ✅ Two devices complete a shared challenge flow end-to-end.

## Ship checklist (v1 = M0–M6)
- Privacy manifest + nutrition labels (mic, speech, no tracking); App Review notes for Family Controls; TestFlight beta with ≥10 users for 2 weeks; crash-free ≥99.5%.

## Open questions for the human
1. App name + bundle ID (affects entitlement request — decide before M0 ends).
2. ESV/NIV priority? (ESV API is the easy licensed win; NIV via API.Bible needs terms review.)
3. Monetization intent (free / one-time / subscription) — affects ESV "non-commercial" key eligibility; flag before M6.
4. Challenge domain for universal links (e.g., meno.app).
