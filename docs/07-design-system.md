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
| `lapisWash` | #E9EEFA | #1A2440 | Tinted fills, active states |
| `gold` | #A8802E | #D4AF37 | Memorized state ONLY: medallions, memorized checkmarks, stitch-complete moments |
| `error` | #B3402E | #E06A56 | Wrong words in feedback |
| `success` | #2E7D5B | #4CAF8E | Correct-word feedback (grading only — general success uses lapis) |

Contrast: all text pairs ≥ 4.5:1. Gold on surface is used at display sizes only (≥20pt) where 3:1 suffices.

## 4. Typography

Both faces ship with iOS — zero font files, perfect legibility, unmistakably native:

- **Display & Scripture: New York** (Apple's system serif). All verse text is set in New York — Scripture gets the serif gravitas; UI never does. Verse settings: `NY Medium`, 22/34 in reader (user-adjustable 18–28), generous measure, first-line verse numbers as superscript `inkFaint`.
- **UI: SF Pro** (system default via Expo UI). Large titles, buttons, labels — untouched system styles wherever possible so Dynamic Type behaves.
- **Data/mono: SF Mono** for first-letters mode (`B a f n …`) — the monospaced grid makes letter-prompting scannable and gives the mode its distinct "cipher" character.

Type scale follows Apple's text styles; do not invent sizes.

## 5. Spacing, shape, elevation

- 4pt base grid; screen margins 20pt; card padding 16pt.
- Corner radius: continuous-corner 12pt cards, 24pt sheets (match iOS), capsule buttons.
- Elevation by material, not shadow: cards use `surfaceRaised` + hairline `separator`; sheets use native materials/glass where `@expo/ui/swift-ui` exposes them.

## 6. Screens

### Today (home tab)
- Large title "Today" with streak ember (small flame glyph + count, lapis; turns hollow if today not yet active).
- Hero card: current verse in New York at its dissolution level, translation attribution, single primary button **Practice** (capsule, lapis). Sub-line: "Chunk 4 of 12 · Blanks 50".
- Below: **Due for review** row (count + up-to-3 references, tap → review session), then a quiet reading shortcut ("Continue reading Philippians 3").

### Practice session
- Minimal chrome: progress dots top (chunks in session), close (X) with resumability.
- Prompt area (verse or obscured verse) upper half; input lower half varies by mode:
  - **Blanks**: inline blank pills within the verse text; keyboard or 3-choice chips.
  - **Arrange**: phrase tiles, spring physics on drop.
  - **Type**: full-screen editor, New York, no autocorrect, reference watermark.
  - **Speak**: large mic button; live ghost transcript beneath the reference; waveform in lapis.
- Feedback: word-level coloring in place (correct=success green, typo=underline, missed=error), accuracy number counts up, haptic (success notch / soft buzz). Tier-up triggers the **dissolution animation** on the verse (≤1.2s).

### Library
- Segmented: **In progress** (goal cards with chunk-grid heatmaps — each chunk a tiny square, `lapisWash`→`lapis` by tier, gold when memorized) and **Memorized** (list with health dot: fresh lapis / fading inkFaint / at-risk error, sorted by risk).
- Goal detail: chunk map, stats, stitch history, per-chunk drill-down.

### Reader
- Pure typography. Chapter picker in nav title menu (native). Selection → context menu: "Memorize this…" starts goal wizard pre-filled.

### Stats
- Streak, 30-day accuracy, verses memorized as three large New York numerals; below, weekly practice grid and badge medallions (engraved-style, gold when earned, `inkFaint` outline when locked and visible-by-design).

### Goal wizard (sheet)
- Steps: Translation → Passage (book/chapter/verse native pickers) → Preview (word count, chunk count, projected date) → Confirm. One screen per step, native sheet detents.

### Lock setup & Unlock
- Per 04 §5. Unlock screen is the app at its most minimal: verse reference in New York, mic button, Type toggle, Override quietly at the bottom. Dark-mode-first (people hit this at night).

## 7. Iconography & illustration
- SF Symbols throughout (book.closed, flame, checkmark.seal for memorized — seal filled gold).
- Badges: custom typographic medallions — circled monogram/numeral with an engraved double-rule border, flat, no gradients or 3D.
- No mascots. No stock-spiritual imagery (doves, sunbeams).

## 8. Motion & haptics

| Moment | Motion | Haptic |
|---|---|---|
| Correct word (live) | none (color only) | light tick |
| Item passed | accuracy count-up 400ms | success |
| Tier up | dissolution 1.2s | medium |
| Chunk memorized | dissolution → gold seal stamp 1.5s, skippable | success ×2 |
| Streak day secured | ember pulse | light |
| Reduced motion | all replaced by 200ms crossfades | unchanged |

Nothing loops; nothing blocks input for >1.5s.

## 9. Voice & copy
- Sentence case everywhere. Verbs on buttons ("Practice", "Recite", "Review 3").
- Encouraging, never saccharine, never guilt. Errors are factual and kind ("2 words slipped — they're marked below").
- Scripture is always attributed (translation abbreviation after reference).
