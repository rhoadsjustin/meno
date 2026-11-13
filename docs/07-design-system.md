# 07 — Design System & UX

## 1. Design direction

**"Lapis & vellum."** The visual language is drawn from illuminated manuscripts — the medieval scriptoria where Scripture was copied by hand and memorized by monks — translated into a rigorously native iOS idiom. Two pigments dominated those manuscripts: **lapis lazuli blue** (ultramarine, once costlier than gold) and **gold leaf**, laid onto vellum. We use exactly that: a vellum-neutral surface, deep lapis as the single working accent, and gold reserved *exclusively* for mastery — the moment a verse becomes Memorized. Gold is never decoration; it is earned.

The overall feel: a quiet, serious reading instrument that happens to be delightful — closer to Apple Books than to Duolingo.

**The signature element — dissolution.** As a verse climbs the tiers, its text visibly dissolves: full text → words thinning to first letters → letters fading to reference-only. This animation appears at tier-ups, on the widget (which shows the verse at its current obscuring level), and in the library. The product thesis made visible: *the text disappears from the screen because it now lives in you.*

## 2. Native-first rules

- Build with `@expo/ui` universal components; use `@expo/ui/swift-ui` directly for iOS-specific polish (glass effects, native menus/pickers/sheets). On Android the same code renders Jetpack Compose/Material 3 — accept Material's interpretation of our tokens rather than forcing iOS chrome onto Android.
- Navigation: standard iOS large-title navigation, native tab bar, native sheets for all modal flows (goal wizard, settings subpages). Swipe-back always works.
- Respect every system setting: Dynamic Type (test at AX sizes), dark mode, reduced motion (dissolution becomes a crossfade), VoiceOver (quiz modes need careful custom actions — blanks are announced as "blank, double-tap to answer").

## 3. Color tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `surface` | #FBFAF7 (vellum) | #10131A (night lapis-black) | App background |
| `surfaceRaised` | #FFFFFF | #181C26 | Cards, sheets |
| `ink` | #1A1D26 | #E9E7E1 | Primary text |
| `inkFaint` | #6E7280 | #8B8F9C | Secondary text, dissolved letters |
| `lapis` | #2244AA | #5B7FE8 | Accent: actions, progress, selection, streak ember |
| `onLapis` | #FFFFFF | #10131A | Labels, spinners and glyphs on a `lapis` (or `error`) fill: filled buttons. White on the dark-mode lapis is only 3.7:1 |
| `lapisWash` | #E9EEFA | #1A2440 | Tinted fills, active states |
| `gold` | #8F6C1F | #D4AF37 | Memorized state ONLY: medallions, memorized checkmarks, stitch-complete moments |
| `error` | #B3402E | #E06A56 | Wrong words in feedback |
| `errorWash` | #F9E9E4 | #3B211C | Highlight behind missed/wrong feedback words |
| `success` | #2E7D5B | #4CAF8E | Correct-word feedback (grading only — general success uses lapis) |
| `amber` | #9A5B13 | #E59A4C | The almost band (03 §3) ONLY: its score and slipped words. Warm, not an error; never decoration, never a stand-in for gold |
| `amberWash` | #F8EEDD | #3A2C17 | Highlight behind slipped words in an almost |

Contrast: all text pairs ≥ 4.5:1. Gold on surface is used at display sizes only (≥20pt) where 3:1 suffices.

## 4. Typography

Both faces ship with iOS — zero font files, perfect legibility, unmistakably native:

- **Display & Scripture: New York** (Apple's system serif). All verse text is set in New York — Scripture gets the serif gravitas; UI never does. Verse settings: `NY Medium`, 22/34 in reader (user-adjustable 18–28), generous measure, first-line verse numbers as superscript `inkFaint`.
- **UI: SF Pro** (system default via Expo UI). Large titles, buttons, labels — untouched system styles wherever possible so Dynamic Type behaves.
- **Data/mono: SF Mono** for first-letters mode (`B a f n …`) — the monospaced grid makes letter-prompting scannable and gives the mode its distinct "cipher" character.

Type scale follows Apple's text styles; do not invent sizes.

The scale lives in `src/theme/tokens.ts` as `textStyle` (`largeTitle` 34/41, `title1` 28/34, `title2` 22/28, `title3` 20/25, `headline` 17/22 semibold, `body` 17/22, `callout` 16/21, `subheadline` 15/20, `footnote` 13/18, `caption1` 12/16, `caption2` 11/13); new UI text spreads one of these rather than a literal size, and older screens move over as they are next touched. Numerals above the scale use `displayType` (40, 56, 96). The small tracked uppercase label over a group or a card title is `src/components/section-header.tsx`; the capitals are styling, the strings stay sentence case (§9).

## 5. Spacing, shape, elevation

- 4pt base grid; screen margins 20pt; card padding 16pt.
- Corner radius: continuous-corner 12pt cards, 24pt sheets (match iOS), capsule buttons, 4pt heat-map cells — always `radius.*` from the theme, never a literal. Circles keep width / 2.
- Buttons come from `src/components/button.tsx` (`primary` filled lapis capsule with an `onLapis` label, `secondary` outlined, `tinted`, `plain`; `role="destructive"`; `busy` / `disabled`) and text actions from `src/components/text-link.tsx`. Both are at least 44pt tall, dim while pressed and carry their accessibility role and state — never restyle a bare `Pressable` as a button in a screen.
- Nothing to show comes from `src/components/unavailable.tsx`: `Unavailable` (`kind="empty"` or `"failed"`; symbol, title, one sentence, at most two actions, centred) and `LoadingState` (blank for a moment, then a labelled spinner). A failed load is always `failed` with **Try again** — never the empty state, a blank screen or an endless spinner — and its words come from the catalogue, never from the thrown error. `failed` carries a warning symbol and is announced to VoiceOver; `empty` is quiet.
- Elevation by material, not shadow: cards use `surfaceRaised` + hairline `separator`; sheets use native materials/glass where `@expo/ui/swift-ui` exposes them.

## 6. Screens

### Today (home tab)
- Large title "Today" with streak ember (small flame glyph + count, lapis; turns hollow if today not yet active).
- Hero card: current verse in New York at its dissolution level, translation attribution, single primary button (capsule, lapis) that names its step and reference — **Start John 3:17**, **Continue John 3:16**, **Seal John 3:16** (03 §5). Sub-line: "Chunk 4 of 12 · Next step · Blanks 50/75".
- Below: **Due for review** row (count + up-to-3 references, tap → review session), then a quiet reading shortcut ("Continue reading Philippians 3").

### Practice session
- Minimal chrome: progress dots top (chunks in session), close (X) with resumability.
- Prompt area (verse or obscured verse) upper half; input lower half varies by mode:
  - **Blanks**: inline blank pills within the verse text; keyboard or 3-choice chips.
  - **Arrange**: phrase tiles, spring physics on drop.
  - **Type**: full-screen editor, New York, no autocorrect, reference watermark.
  - **Speak**: large mic button; live ghost transcript beneath the reference; waveform in lapis.
- Feedback: word-level marking in place — never color alone (color-blind safe): correct=success green plain; typo=ink underline; missed/wrong=error red **plus** strikethrough and `errorWash` highlight. An almost (03 §3) marks the same slips in `amber` on `amberWash`, still struck through. Accuracy number counts up, haptic (success notch / soft buzz). Tier-up triggers the **dissolution animation** on the verse (≤1.2s).
- Actions: a result, the summary and the Read round keep their buttons in the pinned footer (`ActionFooter`), so the way on is in the same place whatever the verse's length. Read and First Letters are not graded (03 §1): their results show the heading and no score. A memorized verse ends on the summary — Done, with the passage's next step beside it.
- Leaving: while a Type or Speak round holds words, Close, the edge swipe and Android's back ask first (`src/features/practice/leave-guard.tsx`); only the session's position is saved. The unlock screen is not guarded.
- Arrange: tapping a placed phrase takes it back out and leaves its position open; the next phrase tapped fills it.

### Library
- Segmented (the system control, `@expo/ui/community/segmented-control`; on windows wider than tall both shelves show side by side instead): **In progress** (goal cards with chunk-grid heatmaps — each chunk a tiny square, `lapisWash`→`lapis` by tier, gold when memorized) and **Memorized** (list with health dot: fresh lapis / fading inkFaint / at-risk error, sorted by risk).
- Goal detail: chunk map, stats, stitch history, per-chunk drill-down.

### Reader
- Pure typography. Chapter picker in nav title menu (native). Selection → context menu: "Memorize this…" starts goal wizard pre-filled.

### Stats
- Streak, 30-day accuracy, verses memorized as three large New York numerals; below, weekly practice grid and badge medallions (engraved-style, gold when earned, `inkFaint` outline when locked and visible-by-design).

### Goal wizard (sheet)
- Two steps, one screen each: **Passage → Plan**. Cancel/Back and Continue/Start memorizing stay in the sheet's bottom bar.
- **Passage.** Three native menus and nothing else to configure: Translation (remembers the last one chosen; WEB the first time), Book, Chapter (hidden for one-chapter books). Below them the chapter's own verses, set in New York as a virtualized list, with the translation's attribution at the foot.
  - **Tap the first verse, then the last.** One tap is a single verse; a second tap closes the range in either direction; a tap on a settled range starts over. Selected rows carry the `lapisWash` fill plus a lapis rule on the leading edge and a heavier verse number — never color alone.
  - **Whole chapter** selects every verse of the chapter in view. **Extend through** is a native menu of the book's later chapters; it keeps the first verse and runs the range to the end of the one picked, so "Philippians 1–4" is Whole chapter, then Extend through → Chapter 4. Changing chapter with the menu keeps an open selection, so tapping a verse in a later chapter also closes a cross-chapter range. Ranges stay inside one book; changing book resets to its 1:1.
  - A bar pinned above the buttons echoes the reference ("John 3:16–18"), says what the next tap will do, and holds **Clear**. With nothing selected, Continue is disabled. The wizard opens on John 1:1 so it can be continued untouched.
  - The menus and chapter actions scroll with the verses; only the echo bar and buttons are pinned, so the list keeps its room on short windows (iPhone Duo opened, landscape) and at accessibility sizes, where the control rows wrap.
  - Licensed text (ESV) loads a chapter at a time through `services/bible`: a spinner while it loads; if it fails, a message in place of the verses with **Try again** and **Use the WEB instead**, and the menus stay usable.
  - VoiceOver: each row reads "Verse 16. ‹text›", its selected state and what a double-tap will do, and offers the custom actions "Start passage here" / "End passage here"; every change is announced ("John 3:16–18 selected").
- **Plan.** Editable goal name, then verses, words, chunks and estimated days.
- Range logic is pure and unit-tested in `src/services/bible/selection.ts`.

### Lock setup & Unlock
- Per 04 §5. Unlock screen is the app at its most minimal: verse reference in New York, mic button, Type toggle, Override quietly at the bottom. Dark-mode-first (people hit this at night).

## 7. Iconography & illustration
- SF Symbols throughout (book.closed, flame, checkmark.seal for memorized — seal filled gold).
- Icons inside the app's own views come from `src/components/symbol.tsx` (`Symbol`: the SF Symbol on iOS, its Material Symbol on Android; a theme colour; grows with Dynamic Type; hidden from VoiceOver because the row or button carries the words). Never an emoji or a typed character (`+`, `›`, `✓`) as an icon. A link that opens another screen takes `disclosure` on `TextLink`: a chevron on iOS, none on Android. The widget's inline flame is the one exception (05 §1: typographic, no images).
- Badges: custom typographic medallions — circled monogram/numeral with an engraved double-rule border, flat, no gradients or 3D.
- No mascots. No stock-spiritual imagery (doves, sunbeams).

## 8. Motion & haptics

| Moment | Motion | Haptic |
|---|---|---|
| Correct word (live) | none (color only) | light tick |
| Item passed | accuracy count-up 400ms | success |
| Item almost (03 §3) | none; slipped words shown in place of the dissolution | warning |
| Tier up | dissolution 1.2s | medium |
| Chunk memorized | dissolution → gold seal stamp 1.5s, skippable | success ×2 |
| Streak day secured | ember pulse | light |
| Reduced motion | all replaced by 200ms crossfades | unchanged |

Nothing loops; nothing blocks input for >1.5s.

Screens ask about Reduce Motion one way: `useMotion()` from `src/theme/motion.ts`, whose `reduce` is right on the first render and follows the setting while the app is open. Reanimated's entering / exiting animations already skip under it and need no flag; use `reduce` to choose the crossfade, to gate a `withTiming` or looping animation, or for `animated: !reduce` on a scroll.

## 9. Voice & copy
- Sentence case everywhere. Verbs on buttons ("Practice", "Recite", "Review 3").
- Encouraging, never saccharine, never guilt. Errors are factual and kind ("2 words slipped — they're marked below").
- Scripture is always attributed (translation abbreviation after reference).
- One sentence per screen body and per alert message where it fits; mechanics belong in the setup guide (Settings → How to set up Meno).
- No developer wording on screen: no "simulator", "kill switch", "malformed", error codes or an exception's own message. Say what happened and what to do; the raw error goes to diagnostics.
- Register: plain by default. The devotional line ("hidden in your heart", "The Word remains in you") is kept for the welcome screen and the moment something is memorized or unlocked; everywhere else state the fact ("Chunks you've memorized appear here"). No playful asides ("secret sauce", "ready to shine").

### Glossary (one name per concept)

User-facing copy uses these terms and no synonyms, in `en` and `es` together. Change a term here first, then everywhere it appears (locales, widgets, notifications, Siri, `.maestro/`).

| Concept | English | Spanish | Not |
|---|---|---|---|
| What the user sets out to memorize (a `goal` in code) | passage | pasaje | goal, meta |
| One day's piece of a passage (03 §5) | chunk | fragmento | part, section |
| A single verse, and the unit reviews and stats count | verse | versículo | |
| Adding a passage (Today link, Library button) | Add passage | Agregar pasaje | "+ Practice another passage" |
| The wizard's first step | Choose a passage | Elige un pasaje | |
| Fully learned (03 §1) | memorized | memorizado | mastered, learned |
| The clean recitation on a second day that makes a chunk memorized | seal, sealed | sellar, sellado | |
| Reciting the chunks learned so far as one passage (03 §5) | stitch | unir | seams |
| Spaced repetition of memorized verses (03 §6) | review; a verse that held is "kept fresh" | repaso; "fresco" | |
| Review health | fresh, fading, at risk | fresco, desvaneciéndose, en riesgo | |
| The notifications feature and its Settings switch | Reminders | Recordatorios | quizzes, nudges |
| Its three kinds (05 §2) | Daily reminder, Pop quiz, Streak reminder | Recordatorio diario, Prueba sorpresa, Recordatorio de racha | surprise quiz, nudge |
| The phone lock feature (04) | Recite to Unlock (capitalised, no hyphens) | Recitar para desbloquear | recite-to-unlock |
| The shield's primary button | Recite to unlock | Recitar para desbloquear | |
| Leaving a shield without reciting | Override | Omitir | skip, bypass |
| An app behind the lock | shielded app, shield | app bloqueada, bloqueo | blocked, locked |
| The global off control (the "kill switch" of 04 §6) | Turn off and clear all shields now | Desactivar y quitar todos los bloqueos ahora | kill switch |
| The lock where Screen Time is missing | isn't available on this device | no está disponible en este dispositivo | simulator, real iPhone |
| The system's settings app, as opposed to Meno's Settings tab | iPhone Settings (Android: Settings) | Ajustes del iPhone | |

Buttons in a session: **Continue** advances (never "Next round"); **Done for today** ends the session from a result (never "Finish"); **Try again**, **Keep going** and **Stop for today** as 03 §1 and §8 name them; **Done** closes a summary. Declining an optional step is **Not now**.
