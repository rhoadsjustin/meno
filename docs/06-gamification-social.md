# 06 — Gamification & Social

Design stance: gamification serves retention of *Scripture*, not retention of *the app*. Quiet, earned, honest. No loot boxes, no artificial scarcity, no shame mechanics.

## 1. Streaks

- A day counts with any meaningful action: practice item completed, review/pop quiz completed, recite-to-unlock success, or a ≥2-minute reading session.
- **Grace days**: 1 available per week, earned automatically (not purchased). Missing a day with grace available consumes it silently and preserves the streak; the UI notes it honestly ("grace day used Tuesday").
- Longest streak tracked forever; current streak loss shows a gentle reset screen highlighting what was *kept* ("Your 14 memorized verses are still yours. Start again today.").
- Streak flame iconography is understated (see 07) — a small ember, not a Duolingo inferno.

## 2. Accuracy & stats screen

- **Rolling 30-day accuracy** across all graded attempts (weighted toward higher tiers) — the headline stat next to streak.
- Per-passage stats: tier heatmap of chunks, average accuracy, review health distribution.
- Lifetime: verses memorized, total reviews, words recited, recite-vs-override ratio (neutral framing).
- Charts sparse and typographic; numbers over dashboards.

## 3. XP & levels (light touch)

- XP per graded item = `basePoints(tier) × accuracy` (base: 5/10/15/20/30/40/50 for tiers 0–6); reviews earn 1.5× (retention is the point).
- Levels on a smooth curve; level names drawn from the growth metaphor of Psalm 1 / John 15: Seed → Sprout → Rooted → Branch → Fruitful → Oak (extend as needed). Level appears on profile and challenge boards only — never interrupts practice.

## 4. Badges (all earned, all real)

| Code | Trigger |
|---|---|
| first_verse | First chunk memorized |
| first_chapter | Full chapter memorized |
| first_book | Entire book memorized |
| perfect_speak | 100% on a Speak attempt |
| century_reviews | 100 reviews completed |
| dawn_reciter | 10 recite-to-unlock successes |
| steady_30 / steady_100 / steady_365 | Streak milestones |
| word_hoard_1k / 5k / 10k | Cumulative unique words memorized |

Badge art: typographic medallions in the design system's engraving style (07 §7). Awarded on session summary, one at a time, dismissible instantly.

## 5. Social challenges (Phase 2 — requires Supabase)

- **Create**: passage + translation + target date + name → shareable link + QR (`meno.app/c/<code>` universal link).
- **Join**: link opens app (or App Store), creates the same goal locally, attaches `challengeId`.
- **Board**: participants' % complete (chunks memorized / total), current streaks, and a "recited today" dot. **No accuracy comparison** — progress is public, performance is private.
- Weekly digest notification: "3 of 7 in 'Philippians by Advent' finished chapter 2."
- Nudges: a participant can send one pre-written encouragement per person per day ("Cheering you on — Phil 1:6"). No free-text in v1 (moderation avoidance).
- Privacy: display-name only; joining a challenge is the only thing that exposes any presence; leave/delete anytime.

## 6. Anti-patterns explicitly banned

- Paying to restore streaks or skip tiers.
- Leaderboard ranks by accuracy or speed.
- Notification copy that shames ("Don't disappoint God"). Absolutely not.
- Confetti/interstitials that delay getting back to practice; celebrations are ≤1.5s and skippable.
