# 09 — Year in the Word (wrapped) & anonymous counts

Design stance: the recap is a gift to the user, not a data grab. Everything
personal stays on-device (02 §2); anything that leaves the phone is a bare
anonymous count, and only if we accept the (small) disclosure cost below.

## 1. Two tiers, two very different privacy costs

| Tier | What | Leaves the phone? | Policy / label change |
|---|---|---|---|
| A. "Year in the Word" recap | Personal wrapped-style highlights, computed from local SQLite | Nothing | **None** |
| B. Global counters | e.g. "verses memorized across all users" via Observe events | One anonymous event per milestone | Small, additive (see §4) |

Tier A is the Spotify-wrapped experience and needs **zero collection**: a
recap is per-user, and every number it shows already lives in the local
database. Ship A without touching the policy, labels, or privacy manifest.
Tier B is optional and severable — decide it on its own merits, later.

## 2. Tier A — the recap (target: early December release)

All queries are local, over the calendar year in the user's time zone:

- **Verses & words memorized** — `chunks.memorizedAt` in year; word counts
  via the passage text (services/bible).
- **Reviews & recitations** — `attempts` by `createdAt`, split by mode;
  Speak count called out ("you recited from memory N times").
- **Faithfulness, not performance** — longest streak (`streaks.longest`
  capped to year via attempt dates), grace days honored (06 §1's honesty),
  total days active. No accuracy ranking against anyone (06 §6).
- **Most-practiced book / the year's passage** — top goal by attempts.
- **Recite-to-unlock** — `lockEvents` recitations vs overrides, framed
  gently ("Scripture opened your phone 214 times").
- **Badges earned** — `badges.earnedAt` in year.

Presentation: a `/wrapped` route of 4–6 full-screen typographic cards in
the engraving style (07 §7), swipeable, reduced-motion aware, ≤1.5s
celebrations (06 §6). Entry: a quiet Today card in December + one local
notification (respects quiet hours; it counts toward the 2/day cap, 05).

**Share image**: last card renders to an image (react-native-view-shot)
through the user's share sheet — user-initiated, still zero collection.
License rule: the share image carries stats and references; verse text on
it only from public-domain translations (WEB/KJV/ASV). An ESV year-verse
appears as its reference (02 §5, "share sheets" clause).

Unit-test the year-rollup queries like the rest of services (pure module,
`src/services/wrapped/`), injectable "now" for year-boundary tests.

## 3. Tier B — anonymous global counters (only if wanted)

Mechanism: `Observe.logEvent('verse.memorized')` at the moment a chunk
flips to memorized (goals repo). Payload: nothing — no reference, no text,
no counts of anything else. Aggregate read via `eas observe:events`.
Infra cost ≈ one line; Observe is already integrated and declared.

Honesty cost: Apple's taxonomy calls this **Usage Data → Product
Interaction** even when anonymous. There is no truthful way to ship a
global counter with literally zero disclosure change. The minimal change:

## 4. The exact disclosure delta for Tier B

1. **ASC nutrition label**: add *Usage Data → Product Interaction* —
   collected, **not linked to identity**, purpose Analytics. (Diagnostics
   entries stay as-is; tracking stays "No".)
2. **Privacy policy**: extend the "Anonymous diagnostics" section by one
   sentence, e.g. "The same anonymous channel also carries bare usage
   counts — for example, that *a* verse was memorized — never which verse,
   and never anything you typed, said, or chose."
3. **Apple privacy manifest** (app.config `NSPrivacyCollectedDataTypes`):
   add the matching Product Interaction entry.

That's the whole delta. Ship it in the same release that turns the event
on, per the policy's own "policy updates first" promise.

## 5. Anti-patterns explicitly banned

- No per-user analytics identity: no account ids, no linking events into
  per-device journeys beyond what Observe's anonymous install id already
  does for diagnostics.
- Never a verse reference, verse text, translation choice, or accuracy
  value in any event (02 §7 + license rules).
- No recap paywall, no "beat other users" comparisons (06 §6).
