# 03 — Memory Engine

The core of the app. Everything here is pure TypeScript in `services/grading`, `services/chunking`, `services/scheduler` with exhaustive unit tests.

## 1. Tier ladder

Each **chunk** (2–4 verses, see §5) climbs seven tiers. `chunks.tier` stores the highest tier cleared.

| Tier | Name | Mode | What the user sees | Pass threshold |
|---|---|---|---|---|
| 0 | Read | `read` | Full text; prompt to read aloud slowly 2× | Completion (no grading) |
| 1 | First Letters | `firstLetters` | `"D n b a a a, b i e s…"` — first letter of each word + punctuation; recite aloud or mentally, self-check reveal | Self-reported ≥ "mostly" 2× |
| 2 | Blanks 25 | `blanks25` | 25% of words blanked (content words preferred); tap blank → type or pick from 3 choices | ≥90% accuracy |
| 3 | Blanks 50/75 | `blanks50`, `blanks75` | Two rounds at 50% then 75% density | ≥90% each |
| 4 | Arrange | `arrange` | Verse split into 6–12 phrase tiles, shuffled; tap into order. For long chunks, verse-by-verse | ≥95% (tile order) |
| 5 | Type | `type` | Reference + first word only; type entire chunk | ≥95% |
| 6 | Speak | `speak` | Reference only; recite aloud, live transcript ghosted | ≥95% |

- **Memorized** = pass Tier 5 **or** 6 at ≥95% on two separate days (`attempts` provides the audit trail). Both is encouraged; either suffices (accessibility: typing-only and speaking-only paths are both complete).
- **Thresholds scale to chunk length.** A flat ≥95% means a literally word-perfect answer for any chunk under 20 words — most single-verse goals — so one slip repeats the round forever. Every tier therefore tolerates at least one whole slipped word, capped so nothing passes below 80% (`services/grading` §3). The displayed accuracy is always the honest score; only the pass bar moves.
- **Almost is a third outcome, not a softer pass.** A graded round that lands just outside the pass bar — within twice its error budget (§3) — is an *almost*: it moves on up the ladder exactly as a pass does, and is shown as such rather than as a miss. It is never a pass for Memorized, reviews or SM-2, which all keep the strict bar. Read and First Letters are self-reported and stay pass/miss.
- **Tier 6 is the top of the ladder.** Clearing Speak when the chunk has only banked one mastery day ends the session with "one day from sealed" — it is never re-served the same day, because the chunk stays `learning` until Memorized and would otherwise loop.
- **An almost at the top banks nothing.** Type on an almost moves on to Speak and says it did not count toward Memorized. Speak on an almost has nowhere to move on to, so the session stops and says so (`topTierStanding` → `needsCleanPass`): a clean recitation is what seals the verse, with "Try again" (the same Speak round, by choice) or "Stop for today". It only reads "one day from sealed" if a clean Type or Speak earlier the same day already banked it.
- Users may practice any unlocked tier anytime; progression just requires thresholds in order.
- Failing a tier twice in a session suggests dropping one tier ("Let's rebuild the foundation") — suggestion, never forced. The suggestion carries a **working control**: dropping is session-local, so `chunks.tier` is untouched and the harder tier is waiting again once the lower one clears.
- Blank selection: prefer content words (nouns/verbs/adjectives via a small stopword list) at 25%; random beyond stopwords at 50/75%. Deterministic per (chunkId, density, attemptNo) seed so retries vary but tests are reproducible.

## 2. Normalization (before any comparison)

```
normalize(text):
  lowercase → Unicode NFKD → strip diacritics
  strip punctuation (keep intra-word apostrophes: "God's")
  collapse whitespace
  number words ↔ digits canonicalization ("forty" == "40")
  archaic normalization map (KJV mode): "thee/thou/thy/thine" preserved as-is
    (do NOT normalize away — user must actually say them)
```

Verse-number markers are never part of graded text.

## 3. Grading typed/arranged input

- Token-level alignment via **Levenshtein on word tokens** (not characters), yielding per-word ops: match / substitution / insertion / deletion.
- Word-level leniency: a substituted word with character-level similarity ≥0.8 (Damerau-Levenshtein ratio) counts as a **typo**, weighted 0.5 instead of 1.0 error. ("recieve" ≈ receive.)
- `accuracy = 1 − (weightedErrors / referenceWordCount)`, floored at 0. This is the honest score: it is what the user sees, what `attempts` stores, and what SM-2 consumes.
- Pass/fail is a separate decision — `errorBudget(threshold, unitCount)`: the proportional budget `(1 − threshold) × length`, raised to at least one whole word so short chunks can't demand perfection, and capped at 20% of the passage so a two-word verse still has to be exact. `unitCount` is words for type/speak, blanks for a blanks round, tiles for arrange.
- **Three bands** — `gradeBand(threshold, accuracy, unitCount)` returns `pass | almost | miss`. `pass` is exactly `meetsThreshold` (within `errorBudget`). `almost` is within `almostBudget` = 2 × `errorBudget`, held to a floor of 75% accuracy (`MIN_ALMOST_ACCURACY`) so a short chunk cannot move on with two of five words wrong. Anything past that is a `miss`. At the 95% tiers a 10-word verse passes with up to 1 weighted error (≥90%) and is an almost up to 2 (≥80%); a 30-word chunk passes up to 1.5 (≥95%) and is an almost up to 3 (≥90%).
  - The band is empty where the 20% cap, not the one-word floor, set the pass budget — chunks under five units. Doubling there would let "Jesus swept" through, so those stay pass or miss.
  - With no `unitCount` there is no band either: the bare threshold, pass or miss.
  - `meetsThreshold` is untouched and is the only test the Memorized rule (`masteryDays`), review sessions, stitch sessions, recite-to-unlock and SM-2 use. An almost is stored in `attempts` as its honest accuracy, which fails that test, so it cannot bank a mastery day.
- **Arrange scores like the text graders**: `1 − weightedErrors / tileCount`, where two tiles displaced by a single adjacent swap cost 0.5 each rather than 1 each. Tapping neighbouring tiles out of order is one slip but leaves two tiles wrong; at full weight no tile count in the 6–12 range could absorb it, so every swap failed the tier. Larger derangements (a tile dragged well out of place, two separate swaps) still cost full weight and are never a pass; two separate swaps land in the almost band.
- Output structure feeds the feedback UI: each reference word tagged `correct | typo | wrong | missed`, plus inserted extras.
- **Reveal = miss**: tap-and-hold on a blank/next-word hint reveals it but tags it `missed`.

## 4. Grading speech

1. Take the final transcript (on-device recognition, contextual strings biased to the verse vocabulary).
2. Run normalization + the same word-alignment as §3.
3. Extra leniency pass on substitutions: if `metaphone(said) == metaphone(expected)`, count as match (homophones: "their/there", "Saul/soul").
4. Filler tolerance: leading/trailing "um/uh/okay" insertions are ignored; mid-verse insertions count as errors (they usually indicate paraphrase drift).
5. Live UX: interim transcripts render as ghost text under the reference line so the user sees recognition keeping up; grading uses only the final result.
6. If recognition confidence is very low or empty (noisy room), offer instant fallback to Type mode without losing the session.

## 5. Chunking multi-chapter goals

`services/chunking` converts a goal's ref range into ordered chunks:

- Target 2–4 verses per chunk, min 15 / max ~60 words; long single verses stand alone; very short verses merge with neighbors.
- Never cross chapter boundaries.
- Prefer breaking at sentence-final punctuation and paragraph markers when the translation data has them.
- Deterministic: same passage + translation → same chunks (stable ids across reinstalls).

**Practice order** (`planPractice` in `services/practice/plan`, pure; `practicePlan` in the goals repo feeds it). Each unfinished chunk has one step today:

- **start** — untouched; the ladder from Read.
- **continue** — part-way up; picks up at the next tier.
- **seal** — topped the ladder on an earlier day; one clean Type/Speak pass makes it Memorized.
- **rest** — topped the ladder today; nothing to do until a second day can seal it.

The main Practice button takes, in order: (1) a seal whose last mastery day is more than one day old (`SEAL_GRACE_DAYS`); (2) new work — the lowest-order start or continue; (3) any other seal; (4) the lowest-order resting chunk, shown as "seals tomorrow" with no button. When new work is first and a seal is waiting from yesterday, Today offers the seal beside it as an optional check ("Still have John 3:16? One recitation seals it") that opens practice on that chunk (`/practice/[goalId]?chunk=<chunkId>`). So on day two the new verse comes first and yesterday's is optional; left alone, the seal takes the main button on day three, and it also takes it as soon as the day's new work runs out — tapping only the main button still seals every verse. A single-chunk goal has no new work to put ahead, so its seal is simply next and is labelled as a seal.

Today's button and sub-line name the step and its reference (`describeStep`): "Start John 3:17" over "New verse · begins with Read", "Continue John 3:16" over "Next step · Arrange", "Seal John 3:16" over "One recitation makes it memorized". The chunk the main button opens is the goal's **current verse** (`currentChunk`), which is also what the widgets and recite-to-unlock show (05 §1).

**Sequential unlock with overlap stitching:** chunk N+1 unlocks when chunk N reaches Tier 3. Every 5 chunks (and at each chapter completion), a **Stitch session** runs: recite from chunk 1 (or chapter start) through the current chunk at Type/Speak tier, graded as one long text. A goal is Memorized when all chunks are Memorized **and** a full-passage stitch passes ≥90%.

Pace projection: with default settings (~1 new chunk per day reaching Tier 3, plus reviews) the goal wizard shows an estimated completion date and adjusts weekly based on actual velocity.

## 6. Spaced repetition (retention of memorized chunks)

Modified SM-2 per `reviewItems` row (created when a chunk hits Memorized):

```
initial: easiness=2.5, interval=1, repetitions=0
on review with accuracy a (0..1):
  q = round(a * 5)                    # SM-2 quality 0..5
  if q >= 3:
    interval = [1, 3, interval*easiness][min(repetitions,2)]  # 1, 3, then multiply
    repetitions += 1
  else:
    repetitions = 0; interval = 1
  easiness = clamp(easiness + 0.1 − (5−q)*(0.08+(5−q)*0.02), 1.3, 2.7)
  dueAt = now + interval days (fuzz ±10% to avoid pileups)
  cap interval at 180 days
```

- **Health**: `fresh` (not yet due), `fading` (due or ≤3 days overdue), `atRisk` (>3 days overdue). Drives library indicators and notification copy.
- Review sessions serve the most overdue items first, max 5 chunks per session by default.
- Review mode alternates Speak/Type; every 4th successful review of a chunk may downgrade to Blanks75 for speed (keeps sessions <60s).

## 7. Random pop quizzes

- `services/notifications` schedules local notifications within the user's allowed windows (default: 2 windows, 9am–9pm, max 2/day).
- Selection: 70% most-overdue review item, 30% uniformly random memorized chunk (keeps even "fresh" verses warm and unpredictable).
- Notification deep-links to `review/[itemId]?source=popquiz`, single-chunk, single-tier, then returns to Today with the result.
- Completing a pop quiz counts toward the streak and feeds the same SM-2 update.

## 8. Session flow (practice screen)

```
Today → goal card → Practice session:
  queue = [dueReviews(≤2)] + [activeChunk at current tier] + [stitch if due]
  per item: prompt → input (mode-specific) → grade → word-level feedback →
            haptic (success/notch) → tier/schedule update → next
  session summary: accuracy, tier changes, streak state, next unlock
```

Sessions are resumable (persisted queue position) and interruptible without penalty.

**Progress and stopping points.** The practice screen shows one bar across the chunk's whole ladder — nine rounds, Read through Speak — not just the rounds of the tier in progress, with "pass 1 of 2" where an exercise repeats (`ladderProgress`). The first time a chunk reaches Tier 3 (`REST_TIER`, the day's pace in §5) the session offers to stop: "Done for today" leads to the summary, "Keep going" carries on up the ladder. The summary also closes a session that banked its first mastery day.

**Feedback by band.** A pass that used the error budget says so ("Type cleared, one slip forgiven"). An almost shows its score and slipped words in amber rather than error red, under its own "Almost" heading, with a warning haptic, and moves on; the tier-up dissolve is kept for a clean clear. A miss is unchanged: error red, "Not quite", the same round again.
