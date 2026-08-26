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
- Users may practice any unlocked tier anytime; progression just requires thresholds in order.
- Failing a tier twice in a session suggests dropping one tier ("Let's rebuild the foundation") — suggestion, never forced.
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
- `accuracy = 1 − (weightedErrors / referenceWordCount)`, floored at 0.
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
