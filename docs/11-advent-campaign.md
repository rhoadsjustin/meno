# 11 — Advent plan and the winter social campaign

Status: **draft for owner review, 2026-11-11.** Nothing here is built or
posted yet. Decisions already made are in §1; the ones still open are in §11.

Two things ship together:

1. **Advent in Meno** — a four-week in-app memorization plan that ends on
   Christmas Day. Advent 2026 runs **Sun Nov 29 – Thu Dec 24**.
2. **A winter campaign** on Instagram, Facebook, YouTube Shorts, X and
   LinkedIn that runs from now to Jan 31 and carries three stories in turn:
   Advent, Year in the Word (opens Dec 1, `10-year-in-the-word-rollout.md`),
   and a New Year passage.

---

## 1. Decisions made (owner, 2026-11-11)

| Question | Decision | Consequence |
|---|---|---|
| Tract format | **In-app plan only** | No print leaflet. The "tract" is a plan inside Meno plus a web page that opens it. |
| Ad budget | **Organic only, $0** | Reach comes from content, churches, in-app sharing and the App Store itself (§7). |
| Channels | **Instagram + Facebook, YouTube Shorts, X + LinkedIn** | No TikTok. One vertical video master serves Reels, Facebook and Shorts. |
| Translation | **ESV** | Crossway's quoting rules shape what videos and images may show (§2). |
| Passage | **Luke 2** | Main track Luke 2:1–14, short track Luke 2:8–14 (§3.1). The exact ranges are Claude's proposal; the owner chose the chapter. |
| Today card | **In scope** | Built JS-only and shipped over the air to 1.8.1 (§3.2). |
| Release state | 1.7.0 live; **1.8.1 in review from Nov 11** (Siri intents) | The card cannot ride in the 1.8.1 binary. It reaches 1.8.1 users by OTA once 1.8.1 is approved; 1.7.0 users get the web page. |

## 2. Constraints

| Fact | Consequence |
|---|---|
| Advent starts in **18 days**; Thanksgiving week (Nov 23–27) slows App Review. | The Advent work must need **no** review of its own. The only review it waits on is 1.8.1, already submitted. |
| An OTA update reaches only binaries built at the same `version`. 1.7.0 is live; `main` is 1.8.1, in review. | The card must stay **JS-only** (no new native module, no config change) so `npm run ota` can send it to 1.8.1. People who stay on 1.7.0 never see the card; the web page and the In-App Event are their way in. |
| Challenge links are universal links from 1.7.0 on; on 1.6 they open the web fallback page, whose button still joins. | An Advent link works for everyone, with or without the newest build. |
| A challenge link holds **one passage range**, a title and a target date (`services/challenges/codec.ts`). | One link per track. A plan of scattered verses needs one link per week, or new code. |
| ESV text in the app comes from the Crossway API under the non-commercial terms: the app may not accept advertising or sponsorship. | Meno can never sell placements, even to a church partner. Buying ads *for* Meno is a separate matter and is not restricted by those terms, but is out of scope at $0. |
| Crossway permissions page (checked 2026-11-11): up to 500 verses, under half of any book and under 25% of the work, with the full copyright notice. Video counts as audio: text verbatim, full notice, and "ESV" credited. Bulletins and posters may use the short "(ESV)". | Every post that shows verse text ends the quote with "(ESV)" and carries the full notice in the caption or description. Videos add an on-screen credit line. Confirm with Crossway that a caption notice satisfies the video rule (§11 Q3). |
| 06 §6: no comparisons, no long celebrations. 09: no per-user analytics. | No leaderboards or "X people memorized this" claims. Measurement is from outside the app (§9). |
| One person runs this. | Content is batched and templated; nothing depends on daily filming. |

## 3. Advent in Meno

### 3.1 The plan

Name: **"Good News of Great Joy"** — Luke 2:1–14 by Christmas.

One continuous passage suits how Meno works (chunks, then stitching the whole
together) and gives a clear finish: reciting the Christmas story on Christmas
morning, the passage many families already read aloud that day.

| Week | Sunday | Verses | Theme line |
|---|---|---|---|
| 1 | Nov 29 | Luke 2:1–4 | The journey to Bethlehem |
| 2 | Dec 6 | Luke 2:5–7 | The birth |
| 3 | Dec 13 | Luke 2:8–11 | Good news of great joy |
| 4 | Dec 20 | Luke 2:12–14, then the whole passage | Glory to God in the highest |
| — | Dec 25 | Recite Luke 2:1–14 from memory | |

Theme lines are our own wording, not quotations, except where a video shows
the verse itself with its credit.

A **short track** for people who want less, and for children: **Luke 2:8–14**,
the angels and the shepherds, seven verses. It is a part of the main track,
so it is one more challenge link and no extra content.

The week boundaries are guidance in the copy. Meno's own chunking and the
target date (Dec 25) set the actual pace, so nobody is "behind".

### 3.2 Three ways to ship it

| Tier | What | Needs | Ready by |
|---|---|---|---|
| **A — no build** | `meno-scripture.org/advent` (`site/advent/index.html`): the plan, the weekly table, an "Open in Meno" button (a `meno://challenge` link, because a tap that stays on our own domain never hands a universal link to the app; `t=esv`, `s=Luke.2.1`, `e=Luke.2.14`, `d=2026-12-25`, title "Advent: Luke 2:1–14") and the short-track link. References only, no verse text on the page beyond a short quote with notice. | Site edit + deploy (deploy rule in the website notes: only from a checkout holding every unmerged `site/` change). AASA already covers `/challenge*`. | Nov 18 |
| **B — JS only** | An **Advent card on Today** (spec below). | PR to `main`, Duo gate, e2e gate, then `npm run ota` to 1.8.1 once Apple approves it. | Merged by Nov 20, OTA by Nov 22 |
| **C — stretch** | An Advent medallion for finishing by Dec 25; a "Recite it on Christmas morning" prompt on Dec 25. | Badge engine change, still JS-only; only if B is done early. | — |

Both are in scope. A goes first: it is certain, it serves 1.7.0 users, and
every post can link to it.

Fixed shared challenge codes (`ADVENT26` for the main track, `ADVENT26S` for
the short one), so every participant's goal carries the same `challengeId`
and a future board (M8) can attach to it.

**Today card spec (tier B)**

- `src/services/advent/` — pure and unit-tested, shaped like
  `services/wrapped/season.ts`: `adventFor(today)` returns the plan (range,
  challenge code, target date, current week) from **Nov 22 to Dec 25**, local
  time, and null otherwise. The dates for 2026 are data, so 2027 is one entry.
- `src/features/advent/AdventCard.tsx` on Today, above the starter deck when
  there is no goal and below the practice card when there is. One line, the
  reference, and two actions: start Luke 2:1–14, or the shorter 2:8–14.
  Dismissible ("Not this year"); the choice is kept in settings as
  `adventDismissed:2026`.
- Starting opens the **challenge join screen** with the plan's code and the
  Dec 25 target, so the card, the web page and a friend's link all make the
  same goal through one path (preview, already-joined check, translation
  fallback). It reads in the translation of the passage already under way,
  or ESV for someone with none. Once the goal exists the card becomes a
  quiet progress line ("Advent, week 2 of 4 · This week: Luke 2:5–7") that
  opens the passage.
- `meno:///advent` lands on Today; `meno:///advent?preview=1` shows the card
  out of season for testers (`?preview=0` turns it off).
- Notifications through `services/notifications/plan.ts` as a new kind
  `advent`: one invitation on Nov 29 for people who have neither started nor
  dismissed, and one line each Advent Sunday for people who started. Inside
  the 2/day cap and quiet hours.
- en + es copy. Spanish falls back to the reader's own translation, since
  the ESV has no Spanish text.
- Sized from `useContentLayout()`; Duo gate in every pose; dark mode,
  Dynamic Type, VoiceOver label, haptic on start per 07 §8.
- Nothing native: no new module, no `app.config.ts` change, no version bump.
  `npm run ota` checks the fingerprint before publishing.

### 3.3 App Store

- **In-App Event** "Advent: Good News of Great Joy", Nov 29 – Dec 25, deep
  link to the challenge. Art 1920×1080 and 3000×2000. Submit by **Nov 18**;
  it is reviewed separately from the binary. The Year in the Word event
  (Dec 1 – Jan 31) is already planned in 10 §9.
- **Promotional text** (editable without review): "Memorize the Christmas story, Luke 2:1–14,
  by Christmas. The Advent plan starts November 29."
- Keywords: test `advent` in place of the weakest current keyword for the
  season; restore in January.

## 4. Brand

The site and store art already set the look; the campaign uses it unchanged.

- **Name and story:** Meno, from μένω, "abide" (John 15). One-line
  description: *Memorize Scripture. Let it open your day.*
- **Palette:** lapis and vellum, ink for dark mode. No gold outside the
  memorized seal.
- **Type:** New York for verses and numerals, SF Pro for labels, SF Mono for
  the first-letters stage.
- **Signature motif:** the dissolution ladder — full verse, then first
  letters, then the reference alone. Every video and most stills use it;
  it is the product explained in three frames.
- **Voice:** quiet and plain. Invitations, not challenges to beat. No
  streak-shaming, no superlatives, no counting other users.
- **Handles:** `@menoscripture` everywhere, matching meno-scripture.org.
  Availability not yet checked (§11).
- **Kit to produce:** avatar (Meno mark on lapis), cover images for
  Facebook, YouTube, X and LinkedIn, a Reel cover template, a verse-card
  template (4:5 and 9:16), and a one-paragraph bio with the site link.

## 5. Video and image plan

All from the existing Remotion project (`promo/`), which has 4:5 cuts only.
First task: a shared **9:16 (1080×1920)** layout with Reels safe zones (top
250px and bottom 340px clear), so each cut renders in both shapes.

| # | Piece | Length | Source | For |
|---|---|---|---|---|
| V1 | **Advent teaser** — Luke 2:10–11 dissolving down the ladder, "Memorize the Christmas story by Christmas", start date | 15 s | New Remotion cut | Nov 18–28 |
| V2 | **How Meno works** — read, blanks, first letters, recite | 20 s | Recut of `Promo.tsx` to 9:16 | Evergreen, pinned |
| V3 | **Recite to unlock** — the shield, reciting, the phone opening | 15 s | Screen recording on the owner's iPhone (shields do not render in the simulator) | Evergreen |
| V4 | **Widget** — the verse fading on the Lock Screen through a day | 10 s | Onboarding captures | Evergreen |
| V5–V8 | **Advent week 1–4** — that week's verses on the ladder, theme line | 12 s each | One Remotion template, four data sets | Each Advent Sunday |
| V9 | **Year in the Word** — cut through the recap cards | 15–20 s | Already planned (10 §9) | Dec 1 |
| V10 | **Why "Meno"** — the abide story | 30–45 s | Trim of `Abide.tsx` | Mid-December |
| V11 | **Christmas morning** — the whole passage, then only the reference | 20 s | Remotion | Dec 24–25 |
| V12 | **One passage for 2027** | 15 s | Remotion | Dec 28 – Jan 10 |

Stills: four weekly verse cards, a five-slide carousel "How to memorize a
passage in four weeks", three seeded Year in the Word example images, and
the Duo cut (`meno-duo.mp4`) reused once for X and LinkedIn.

Every piece that shows ESV text carries "(ESV)" on screen; the full notice
goes in the caption (§2). Music stays the existing Apple Loops cue.

Optional, owner's call: one or two pieces to camera (why I built this).
Faces usually outperform motion graphics on Reels, but nothing above
depends on it.

## 6. Channels and rhythm

| Channel | Role | Rhythm |
|---|---|---|
| Instagram | Main channel: Reels, weekly verse card, Stories for Year in the Word reshares | 3 posts a week, Stories as shares arrive |
| Facebook | Page mirrors Instagram; the real value is posting the Advent link into church and small-group groups the owner belongs to | Mirror, plus group posts in weeks of Nov 16 and Nov 23 |
| YouTube Shorts | Every vertical video, reposted; long shelf life through search ("memorize Luke 2") | Same day as Instagram |
| X | Build-in-public notes, the Advent link, replies in the Christian and indie-dev circles | 3–4 posts a week |
| LinkedIn | Founder posts: one for Advent, one for Year in the Word, one year-end reflection | 3 posts total |

A fixed weekly shape through Advent: **Sunday** the week's video and verse
card, **Wednesday** an evergreen piece (V2–V4, V10), **Friday** a text or
carousel post (a memorization tip, a tester's line used with permission).

## 7. Reach without spend

In rough order of expected return:

1. **Churches and small groups.** A short personal email to 20–30 pastors,
   youth leaders and group leaders the owner can reach, with the Advent
   link and a two-line bulletin blurb. Sent Nov 16–20, so it lands before
   the first Sunday. A group doing it together is worth more than any post.
2. **Existing users.** They already have the app: the Today card (tier B)
   and the share-challenge link turn each of them into an inviter. TestFlight
   testers get a personal note asking them to start the plan and share it.
3. **Year in the Word shares** from Dec 1 — the planned growth lever.
4. **App Store surfaces:** two In-App Events, promotional text, seasonal
   keyword.
5. **Newsletters and podcasts** that run Advent resource lists. Pitch
   8–10 by Nov 16; most lists close before Thanksgiving.
6. **Communities** (Reddit, Facebook groups, Discords) only where the rules
   allow a maker to share, and written as a resource, not a pitch.
7. **Small creators** who already post about Scripture memory: offer the
   plan, ask nothing.

If paid spend is ever reconsidered, Apple Search Ads on a handful of exact
keywords is the only test worth running first; not part of this plan.

## 8. Calendar

| Dates | Work |
|---|---|
| **Nov 11–15** | Settle §11. Start the Today card. Reserve handles, build the brand kit (§4). 9:16 Remotion layout. Advent page (tier A) drafted. Outreach list. In-App Event art. |
| **Nov 16–20** | Deploy the Advent page. Render V1, V2, V5. Church emails and newsletter pitches go out. Submit the In-App Event (Nov 18). Today card built, gated and merged (Nov 20); OTA to 1.8.1 as soon as Apple has approved it. Record V3 on the phone. |
| **Nov 21–28** | Pre-launch: V1 on Nov 21, V2 pinned, a "starts Sunday" post Nov 27, a reminder Nov 28. Render V6–V8, V9. Promotional text switched. |
| **Sun Nov 29** | Advent opens. V5, week 1 card, LinkedIn post. |
| **Dec 1** | Year in the Word opens. V9, example images, second LinkedIn post. |
| **Dec 6, 13, 20** | V6, V7, V8 with the weekly card. Wednesdays: V3, V10, V4. Reshare user recap images to Stories as they appear (with permission). |
| **Dec 24–25** | V11. One quiet Christmas post. |
| **Dec 28 – Jan 10** | New Year: V12, "pick one passage for 2027", the summary card's "Start 2027 with me" links. Third LinkedIn post. |
| **Jan 11–31** | Two posts a week. Season review (§9). Restore keywords. Year in the Word closes Jan 31. |

## 9. Measuring it

Meno collects nothing per user, so the numbers come from outside:

- **App Store Connect campaign links** with a `ct` per source:
  `advent-ig`, `advent-yt`, `advent-x`, `advent-li`, `advent-church`,
  `advent-page`. The `pt` provider token comes from ASC; it is never
  invented.
- **In-App Event** impressions and opens.
- **First-time downloads** per week against the Oct 9 – Nov 10 baseline.
- Each platform's own analytics: views, saves, shares, link taps.
- A weekly ten-minute check on Mondays; keep what gets saved and shared,
  drop what does not.

Targets are set once the baseline is read (§11); no number is assumed here.

## 10. Owner-only tasks

Claude can draft, render and prepare; these need the owner's hands:

- Create the social accounts and reserve handles.
- Get the `pt` campaign token from App Store Connect.
- Submit the In-App Events and any store build.
- Record recite-to-unlock on the physical iPhone (V3).
- Send the church and newsletter emails, and publish every post.
- Approve the site deploy.

## 11. Open questions

| # | Question | Why it matters |
|---|---|---|
| Q1 | Luke 2:1–14 as the main range and 2:8–14 as the short one? | The owner chose Luke 2; the ranges and the week split are a proposal. 2:1–20 is the longer option. |
| Q2 | If 1.8.1 is rejected or delayed past Nov 22, also send the card to 1.7.0 by OTA from the 1.7.0 commit? | A second OTA line to maintain; only worth it if 1.8.1 is late. |
| Q3 | Is a caption notice enough for ESV text in short video, per Crossway? | If not, videos show the reference and in-app screens only, or use KJV. |
| Q4 | Handle `@menoscripture` — available on all five? | Blocks the brand kit. |
| Q5 | Any pieces to camera? | Changes the shoot list, nothing else. |
| Q6 | Spanish: post the Advent plan in Spanish too? | The app is en + es; ESV has no Spanish text, so a Spanish track needs a YouVersion version and its own cards. |
| Q7 | November baseline for downloads and active use? | Needed to set targets in §9. |
