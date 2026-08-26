# 01 — Product Requirements

## 1. Vision

Help people genuinely internalize Scripture — not just streak-farm an app. Every mechanic serves long-term retention: tiers build memory progressively, spaced repetition keeps it, and the phone lock turns an existing habit (picking up the phone) into a moment of recall. The app should feel reverent and calm, not gamified-noisy; delight comes from mastery, not confetti.

## 2. Personas

- **Devoted memorizer (primary)**: has tried index cards / Bible Memory apps; wants multi-chapter goals (e.g., all of Philippians), serious progress tracking, and accountability.
- **New habit builder**: wants one verse a week, gentle streaks, and the phone lock to interrupt doomscrolling.
- **Group participant**: youth group / small group / family doing a shared memory challenge; joins via invite link.

## 3. Feature requirements

### F1 — Passage selection & reading
- Choose any passage by translation + book + chapter + verse range. A "memory goal" can span **one verse up to multiple chapters**.
- Translation picker: bundled offline translations (WEB, KJV, ASV) always available; licensed translations (ESV, NIV, NASB, CSB…) available when online per licensing (see 02 §5).
- Clean reading mode for any passage (not just memory goals): typographic focus, adjustable text size, red-letter optional (only where translation data supports it), dark mode.
- Multi-chapter goals are automatically split into **chunks** (2–4 verses) that are memorized sequentially and then stitched together (see 03 §5).

### F2 — Memory tiers & quiz modes
Progressive tiers per chunk (full spec in 03):
1. **Read** — read aloud with full text, establish familiarity
2. **First letters** — text reduced to first letter of each word
3. **Blanks** — fill-in-the-blank at increasing density (25% → 50% → 75%)
4. **Arrange** — tap scrambled word/phrase bank into order
5. **Type** — type the verse from memory, reference only
6. **Speak** — recite aloud from memory, graded by on-device speech recognition

- Tier progression is earned by accuracy thresholds; users can peek back down but mastery requires the top tiers.
- All quizzes give word-level feedback (correct / missed / wrong-word) and an accuracy percentage.

### F3 — Memorized tracking & review
- A chunk is **Memorized** after passing Type or Speak at ≥95% twice on separate days. A passage/goal is Memorized when all its chunks are and a full stitched recitation passes at ≥90%.
- Memorized items enter a spaced-repetition review rotation (SM-2 variant, 03 §6).
- Library screen: goals in progress, memorized passages with health indicator (Fresh / Fading / At risk) based on review schedule.

### F4 — Random review tests
- Scheduled local notifications ("Pop quiz: Philippians 4:6 — still got it?") deep-link straight into a review quiz for a due or random memorized verse.
- Configurable frequency (off / 1-2 per day / aggressive), quiet hours, and preferred times.
- Review quizzes are short (one chunk, one tier) — under 60 seconds.

### F5 — Gamification & social (spec in 06)
- Daily streak with one earnable grace day per week; streak counts any meaningful action (quiz, review, reading session).
- Accuracy stat (rolling 30-day), XP/levels, badges tied to real milestones (first chapter memorized, 100 reviews, etc.).
- Challenges: create a shared passage + deadline, invite via link/QR, group progress board. Phase 2 (requires backend).

### F6 — Phone lock ("Recite to unlock") (spec in 04)
- User selects apps to shield (their choice — e.g., social media) via the native picker.
- Schedules: **first pickup of the day**, **every pickup** (re-shield after N minutes of unlock), or custom time windows.
- Shield screen offers **Recite to unlock** (deep-links into a speak/type quiz of the current or a random memorized verse) and **Override** (always available; logged; optional friction like a 10-second hold).
- iOS-only at launch (Screen Time API). Android approach documented for later.

### F7 — Widgets (spec in 05)
- Home screen widget (small/medium/large): current memory verse (progressively obscured by tier, tap to practice), streak, review-due count.
- Lock Screen widgets: streak + verse reference.
- Live Activity during an active practice session is a stretch goal.

## 4. Non-goals (v1)
- No devotional content, commentary, reading plans beyond memory goals.
- No audio Bible playback.
- No user-generated content beyond challenge names.
- No Android phone-lock at launch (documented plan only).
- No web app.

## 5. Success metrics
- D30 retention of users who complete onboarding with a first goal.
- Median verses memorized per active user per month.
- Review health: % of memorized chunks not "At risk".
- Phone-lock adoption and recite-vs-override ratio (overrides are fine; a rising ratio signals friction tuning needed).

## 6. Key user stories

1. As a user, I pick ESV → Philippians → chapters 1–4 as a goal, and the app builds a chunked plan telling me it'll take ~12 weeks at my pace.
2. As a user, mid-quiz I blank on a word; I tap-and-hold to reveal it, it's marked as a miss, and the tier repeats until I clear the threshold.
3. As a user, I get a 2pm notification, recite Psalm 23:1–3 into my phone in the parking lot, see 98%, and my review timer resets.
4. As a user, the first time I open Instagram each morning, a shield asks me to recite this week's verse; I do, it unlocks everything until tomorrow.
5. As a user, I'm in a hospital waiting room and override the lock without shame; the app just logs it.
6. As a group leader, I create a "Sermon on the Mount by Easter" challenge and share a link; my group's progress shows on one board.
