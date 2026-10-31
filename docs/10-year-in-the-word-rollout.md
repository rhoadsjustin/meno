# 10 — Year in the Word: build & rollout plan

Status: **approved plan, 2026-10-31** (decisions settled in §10). Builds on the product/privacy spec in
`09-wrapped-analytics.md` (Tier A). That doc says *what* the recap may show
and why nothing leaves the phone; this one says how we build it, what the
share images look like, and the dates that get it into people's hands by
the first week of December.

Goal: a Wrapped-style recap that people *want* to post. Every share is a
small, honest testimony ("I hid 1,284 words of Scripture in my heart this
year") that carries Meno's name to people who have never heard of it.

---

## 1. Constraints that shape everything

| Fact | Consequence |
|---|---|
| 1.0 went live **2026-10-09**; testers since late August. | Most users will have **8–12 weeks** of data. The recap must feel generous with thin data — never a sad "You memorized 0 verses." See §4. |
| No image-capture or share library is installed. | `react-native-view-shot` + `expo-sharing` are native → **a store build (1.7.0)**, not an OTA. Bump `version` (CLAUDE.md). |
| Native build must be live before Dec 1. | Ship the binary **dormant** (date-gated) ~Nov 21; the season opens itself on Dec 1 with no second release. Copy fixes go out by OTA. |
| Deleting a goal deletes its attempts (02 §5). | Attempt-based counts can undercount. Practice days survive via `settings` kept days (`services/stats/practice-days.ts`). Snapshot the recap at year end (§5.4). |
| Licensed text rules (02 §5). | Share images carry **stats + references**. Verse text appears on an image only for WEB/KJV/ASV. ESV and YouVersion (`api_ephemeral`) passages show as the reference only. |
| `NSPhotoLibraryAddUsageDescription` currently says "Meno does not save to your photo library." | The share sheet's "Save Image" shows this string. Reword it honestly in 1.7.0 (e.g. "Meno saves your Year in the Word images only when you choose Save Image."). Privacy label is unchanged — nothing is collected. |
| 06 §6 bans comparisons and long celebrations. | No "top 1% of reciters." Each card's reveal ≤1.5s and skippable. |
| iPhone Duo gate (CLAUDE.md). | On-screen cards size from `useContentLayout()`. Share images are rendered **off-screen at a fixed pixel size**, so a folded/rotated Duo never produces a strangely shaped image. |

## 2. The card lineup

Each card is one idea, one big New York numeral, one line of copy, in the
engraving style (07 §7). Cards with no data are skipped, not shown empty.
Every card has its own **Share** button (like Wrapped); the last card is
the summary.

| # | Card | Source (local SQLite) | Shown when |
|---|---|---|---|
| 1 | **Cover** — "Your 2026 in the Word" | — | always |
| 2 | **Words hidden in your heart** — verses + words memorized (Ps 119:11 echo) | `chunks.memorizedAt` in year; words via `services/bible` + `tokenize` (same as `word_hoard` badges) | ≥1 chunk memorized |
| 3 | **Your passage of the year** — the goal you spent the most time in | top goal by `attempts.durationMs`; PD text on the card, else reference only | ≥1 goal practiced |
| 4 | **Days with the Word** — days active, longest run, grace days honored | attempt dates ∪ kept practice days; longest run computed within the year (not `streaks.longest`, which is all-time) | ≥3 active days |
| 5 | **Minutes with Scripture** — total practice time | Σ `attempts.durationMs` | ≥10 min |
| 6 | **Recited from memory** — Speak attempts, "out loud N times" | `attempts.mode = 'speak'` | ≥1 Speak |
| 7 | **Scripture opened your phone** — recite-to-unlock successes | `lockEvents.type = 'reciteSuccess'`; overrides never shown | lock used |
| 8 | **Your rhythm** — a Scripture-anchored persona (§3) | hour-of-day histogram of attempts | ≥5 active days |
| 9 | **Medallions earned** | `badges.earnedAt` in year | ≥1 badge |
| 10 | **Summary** — 3–4 headline numbers + persona + passage, "Start 2027 with me" | all of the above | always |

### Stretch (only if time allows)
- **The word that finally stuck** — a word you missed most often and later
  recited cleanly, from `attempts.missedWords`. On-screen only, and only for
  PD translations (missed words *are* verse text).
- **Your verse in other words** — none; parked.

## 3. Personas (the "what kind of listener are you" moment)

The single most-shared Wrapped element is an identity label. Ours come from
*when* and *how* someone practiced — never how well, never against others.
Each pairs with a verse reference (rendered as text only when PD).

One main persona plus up to two "also" personas (owner decision,
2026-10-31): every rule that matches is earned, in table order, with at
most one time of day. The first is the main persona (name, line, verse);
the next two show as "Also: …" on the persona and summary cards. The Steady
Walker appears only when nothing else matches.

| Persona | Rule (in order) | Verse |
|---|---|---|
| The Morning Watch | ≥50% of practice 4:00–9:00 | Ps 5:3 |
| The Night Meditator | ≥50% of practice 20:00–2:00 | Ps 63:6 |
| The Midday Pause | ≥40% 11:00–14:00 | Dan 6:10 |
| The Voice in the Room | Speak ≥30% of attempts | Ps 119:13 |
| The Faithful Keeper | longest run ≥30 days | Lk 16:10 |
| The Steady Walker | fallback | Ps 1:2 |

Final list, wording and verses: owner review (decision D5). Spanish names
are written, not machine-translated.

## 4. Thin data: the "first season" variant

Most people started in Oct–Nov. Rules:

- Headline wording adapts: "Since you started in October" when the first
  activity is after **Sep 1**; "In 2026" otherwise.
- Below **3 active days**: no recap. The Today card instead says
  "Your Year in the Word opens when you've practiced on 3 days" with a
  starter verse button — the recap itself becomes a reason to come back in
  December.
- Never show a card whose number would read as failure (0, or "1 minute").
  Thresholds are in the table in §2.
- The recap is computed **live through today**, so someone who opens it on
  Jan 10 sees their full year, and someone who keeps practicing in December
  watches the numbers grow.

## 5. Architecture

Follows feature-folder + pure-service conventions (02 §3, CLAUDE.md).

### 5.1 `src/services/wrapped/` (pure, unit-tested)
- `rollup.ts` — `rollupYear(input, { year, now, timeZone }): YearRecap`.
  Input is plain rows (attempts, chunks, badges, lock events, kept days,
  word counts), so it runs under vitest with no database.
- `persona.ts` — persona rules from §3.
- `season.ts` — `isRecapSeason(now)` (Dec 1 – Jan 31, local time) and the
  "first season" wording rule.
- `share-text.ts` — license check: which verse text may appear on an image
  (delegates to `services/bible` licensing, never decides on its own).
- Tests: year boundaries across time zones and DST, Dec 31 → Jan 1 23:59,
  empty DB, deleted goals (kept days still counted), ESV/YouVersion passage
  of the year never yields text, threshold skipping, persona tie-breaks.

### 5.2 `src/services/db/repos/wrapped.ts`
Loads the input rows with Drizzle (`createdAt`/`memorizedAt`/`earnedAt`
range on the year). No schema migration needed for v1.

### 5.3 `src/features/wrapped/` + route
- `src/app/wrapped.tsx` — full-screen modal in `ModalSafeArea`, own
  `ReservedRegionsProvider` (it's full-screen and may go two-pane).
- `WrappedPager` — horizontal pager, tap right/left like Stories,
  progress ticks at top, close in the native bar. Reduced Motion: crossfade,
  no count-up animation. Haptics per 07 §8 on each reveal.
- `cards/*` — one component per card, shared between on-screen and share
  renderers via a `variant: 'screen' | 'story' | 'square'` prop.
- `ShareRenderer` — mounts the chosen card off-screen at a fixed size,
  captures with `react-native-view-shot`, hands the PNG to `expo-sharing`.
  Light/dark choice on the share sheet preview (parchment or ink).
- Deep link `meno:///wrapped` (add `wrapped` to `KNOWN_ROOTS`).
- VoiceOver: each card has one combined label ("Words hidden in your heart:
  1,284 words, 41 verses"). Dynamic Type scales the on-screen card; share
  images are fixed size by design.
- **Duo**: closed/portrait → one card column. Open landscape (951×669,
  short) → card on the left half, share options + next card preview on the
  right, via `FoldAwareRow`; nothing interactive on the crease.

### 5.4 Year-end snapshot
On first launch on/after Jan 1, store the final `YearRecap` (numbers,
references, persona code — no verse text) in `settings` as
`wrapped:2026`. The recap stays stable even if goals are later deleted,
and becomes a "Past years" row on Stats.

### 5.5 Entry points
- **Today card** in season — quiet, dismissible, one line + chevron.
- **Stats tab** row "2026 in the Word" (and past years after snapshot).
- **One local notification** on the first evening in season after Dec 1
  that falls outside quiet hours; counts toward the 2/day cap (05). Goes
  through `services/notifications/plan.ts`, not a one-off schedule.

## 6. Share images

| Format | Size | Use |
|---|---|---|
| Story | 1080×1920 | Instagram/Facebook Stories, TikTok, WhatsApp status — **primary** |
| Square-ish | 1080×1350 (4:5) | Instagram feed, X, Threads |

- Keep text inside Stories safe zones (top ~250px, bottom ~340px clear of
  Instagram's UI).
- Footer on every image: the Meno mark + **meno-scripture.org**. No QR in
  v1 (looks like an ad; revisit if share-to-install is weak).
- The summary image is the hero: it should look good as a phone wallpaper
  and as a story.
- Share sheet text: one line + App Store link with an Apple campaign token
  (`?pt=…&ct=wrapped2026`) — see §8.
- **"Start 2027 with me"** on the summary card attaches a challenge link for
  the passage of the year (`services/challenges`), turning a brag into an
  invitation, as an https universal link that falls back to a web page for
  people without Meno (§10.1).

**Instagram direct-to-Stories button**: not in v1. It needs a Meta
developer app ID, an `instagram-stories` URL scheme query, and a small
native pasteboard module. The system share sheet already lists Instagram
(Stories / Feed / Messages). Revisit in 1.8 if people ask (decision D2).

## 7. Timeline

Today is Sat 2026-10-31. Spotify Wrapped usually lands in the first week of
December; we want to be live when people are already in the mood.

| Week | Dates | Work |
|---|---|---|
| 1 | Nov 2–8 | `services/wrapped` rollup + persona + season + tests; repo loader; seed script for a "full year" and a "first season" user (extend the store-screenshot seed). Persona drafts (en + es) to the owner (D5). In parallel: universal links (§10.1) — site files deployed first so Apple's CDN has them before the build. |
| 2 | Nov 9–15 | Seed script for a "full year" and a "first season" user (carried from week 1). Install `react-native-view-shot` + `expo-sharing`; pager, cards, share renderer; en + es copy; Today/Stats entry points; photo-library string fix; `version` → 1.7.0. |
| 3 | Nov 16–22 | Polish pass (motion, haptics, dark mode, Dynamic Type, VoiceOver); Duo gate in every pose; Maestro flow `wrapped.yaml` (open → advance → share sheet appears) added to `npm run e2e`; dev override flag to open the recap out of season. **Submit 1.7.0 by Fri Nov 20.** |
| 4 | Nov 23–30 | Review buffer (Thanksgiving week is slow). TestFlight testers try the recap via the dev override. Marketing assets (§9). App Store **In-App Event** submitted. |
| — | **Tue Dec 1** | Season opens on its own (date gate). Today card + notification. |
| — | Dec 1 – Jan 31 | OTA copy fixes as needed. Jan 1 snapshot. Season closes Jan 31. |

**Progress (2026-10-31): weeks 1–3 built and checked, ahead of schedule.**
Done: rollup, personas, season gate, snapshot, December notice (planner,
unit-tested), recap screen, Stories + 4:5 share images, Today/Stats entry
points, tester preview (`meno:///wrapped?preview=1`), seed script, Duo
layout (cards + share pane around the crease), universal-link files.
The Maestro flow covers the fresh-install "not yet" state
(`.maestro/manual/10-wrapped-not-yet.yml`); the full card path can't be
seeded from a flow, so it is checked by hand with `scripts/seed-wrapped.py`.
Still open: persona sign-off (D5), App Store campaign token, Split View
by hand in Device Hub, physical-iPhone pass, site deploy before merge,
then the PR and the 1.7.0 store build.

If 1.7.0 slips past ~Nov 27, open the season on the first day the build is
live rather than shipping without share images — sharing is the point.

## 8. Measuring it (without collecting anything)

09 forbids per-user analytics, so measure from the outside:

- **App Store Connect → App Analytics → Sources**: installs and page views
  from the `ct=wrapped2026` campaign token in the share text link. Apple
  counts this for users who opted in to sharing with developers; Meno
  collects nothing.
- **In-App Event** impressions/opens in ASC.
- First-time downloads Dec vs Nov baseline.
- Optional, separate decision: the Tier B anonymous counter in 09 §3 could
  add a single `wrapped.shared` event — but that changes the privacy label.
  Recommend **not** for this release.

## 9. Launch & marketing

- **App Store In-App Event**: "Your Year in the Word", Dec 1 – Jan 31.
  Event card art 1920×1080 + 3000×2000; submit with or after 1.7.0.
- **Promo video**: a 15–20s vertical cut through the cards using the
  existing Remotion pipeline (`memory: meno-promo-videos`), seeded demo data.
- **Site**: a `meno-scripture.org/year` page with example share images and
  the App Store link.
- **Release notes / What's New** for 1.7.0 mention it only once the season
  is open (or phrase as "coming December 1").
- **Seeded example images** for the owner's own socials on Dec 1.

## 10. Decisions (settled by the owner, 2026-10-31)

| # | Question | Decision |
|---|---|---|
| D1 | Card lineup (§2) | All core cards, including recite-to-unlock and personas. "Word that stuck" stays stretch-only. |
| D2 | Direct "Share to Instagram Stories" button? | No — system share sheet only in v1. Revisit in 1.8. |
| D3 | Universal links so challenge links work without the app? | **Yes** — see §10.1. |
| D4 | Season window | Dec 1 – Jan 31 |
| D5 | Persona names + verses (§3), English and Spanish | Claude drafts in week 1; owner approves before copy freeze. |
| D6 | Tier B anonymous `wrapped.shared` counter | No, not this release. |
| D7 | Name | "Year in the Word" |

### 10.1 Universal links (D3)

Built in week 1 (branch `year-in-the-word`):

- `site/.well-known/apple-app-site-association` — `/challenge*` for app ID
  `Z8825H46UN.com.rhoadsdev.meno`. `scripts/deploy-site.sh` already copies
  dot-folders and adds `.nojekyll`.
- Links are `https://meno-scripture.org/challenge?v=1&…` — the same path
  as the app's `/challenge` route, so Expo Router matches it directly
  (`+native-intent.ts` strips the host). Codec `v` stays 1; old
  `meno://challenge?…` links still parse.
- `site/challenge/index.html` — fallback for people without Meno (or on a
  build without the entitlement): names the passage from the query, App
  Store badge, and an "Open the challenge" `meno://` link. References
  only, no analytics, no third-party requests.
- `associatedDomains: ['applinks:meno-scripture.org']` in `app.config.ts`,
  **store builds only** (`EAS_BUILD=true`, not the review variant) — the
  entitlement breaks local dev signing. EAS enables the capability on the
  App ID when it builds; check it in the Apple Developer portal after the
  first 1.7.0 build.

**Order matters:** deploy the site (`scripts/deploy-site.sh`) **before**
this branch reaches main. Once merged, any OTA to 1.6 users shares https
links, and those must not 404. On 1.6 the link opens the fallback page,
whose `meno://` button still joins.

Still to do: an App Store campaign link (`pt=` provider token from App
Store Connect → App Analytics → Campaigns, `ct=challenge-link`) on the
fallback page's badge and in the share text; Android App Links
(`assetlinks.json`) later; device test — link from Notes/Messages opens
the app, and with the app deleted opens the fallback page.

## 11. Definition of done

1. Recap opens from Today, Stats and `meno:///wrapped` in season; dormant
   outside it (dev override aside).
2. Every card shares as Story and 4:5 images in light and dark; PD-only
   verse text verified with an ESV goal and a YouVersion goal.
3. Thin-data user (3 days, 1 verse) and empty user both get a kind result.
4. `npm run typecheck && npm run lint && npm run test` clean; rollup tests
   cover §5.1 cases; `npm run e2e` passes with the new flow.
5. Duo gate: closed, open, open + rotated, half-open — checked; fold with the
   recap open keeps the current card.
6. Dark mode, Dynamic Type, VoiceOver, Reduced Motion verified on device.
7. Photo-library string reworded; privacy label unchanged; nothing leaves
   the phone except the image the user chooses to share.
