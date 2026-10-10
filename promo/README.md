# Meno promo videos

Two 1080×1350 (4:5) social cuts built with [Remotion](https://remotion.dev), sharing
the phone frame, clips and widget cards in `src/parts.tsx`, the brand colors and
fonts in `src/theme.ts`, and a piano soundtrack from `public/music/` (see Assets).

- **Promo** (`src/Promo.tsx`, ~30s): the feature tour — six practice modes, the
  dissolve, word-by-word checking, reviews, the shield, widgets.
- **Duo** (`src/Duo.tsx`, 29.5s): Meno on iPhone Duo — the cover panel, the unfold into
  two panes, the half-open book pose in the Reader and its page curl, the wide screens, and
  the controls that move to the side strip. Built from full-resolution simulator captures in
  `public/img/duo/` (committed; regenerate with `npm run captures:duo`, see
  `scripts/duo-captures.sh`), with a device that hinges in CSS 3D. A bent device only ever
  shows the half-open captures, so the crease always falls in the app's own gutter. The
  page-curl scene plays `public/video/duo/page-turn.mp4` (committed): the inner panel
  recorded half-open with `xcrun simctl io <udid> recordVideo --codec=h264 --display=3`
  (no recorder mark) while two pages are dragged over, then cut to six seconds at
  1902×1338, 30 fps. Same length and music cue as Promo.
- **Abide** (`src/Abide.tsx`, ~34s): why the name — μένω (menō) as a lexicon entry,
  then the verses that carry it (John 1:38–39, 15:4, 15:7; Isaiah 40:8; 1 John 2:24),
  the dissolve as "a verse that remains", widgets, and the tagline. Scripture is quoted
  from the ESV (fetched from Crossway's ESV API); the outro carries the required copyright
  notice. Crossway's standard permission covers up to 1,000 verses provided the quotations
  are under 25% of the work's text — a verse-heavy cut like this one leans on the app's
  existing ESV API licence, so keep the notice in.

```bash
npm install
npm run music          # build the soundtracks first (see Assets)
npm run studio         # preview and scrub in the browser
npm run render         # -> out/meno-promo.mp4
npm run render:abide   # -> out/meno-abide.mp4
npm run render:duo     # -> out/meno-duo.mp4
```

## Assets (not committed)

- `public/fonts/` — New York and SF Pro, copied from the Mac for local renders:
  `cp /System/Library/Fonts/NewYork.ttf /System/Library/Fonts/SFNS.ttf public/fonts/`
- `public/clips/` — simulator screen recordings on the "Meno Screenshots 16PM" sim after
  `python3 scripts/seed-screenshots.py`:
  - `arrange.mp4`: Today → Practice → Arrange solved in order → Check order (100% + dissolve at ~11.4s)
  - `review.mp4`: Review → Type instead → type Phil 4:4–5 leaving out "all" → Check (96%)
    → Continue → fill five blanks of Phil 4:6–7

  If you re-record, update the `startFrom` / `holdFrom` timings in `src/Promo.tsx`. The
  bottom of each recording carries the recorder's mark; the phone frame keeps it out of view.

- `public/music/` — the soundtracks, built by `npm run music` (needs ffmpeg and the Apple
  Loops that come with GarageBand): `promo.wav` and `abide.wav`, timed to each cut. The bed
  is the "Find Strength Piano" loop (C major, 73 BPM) under its own long reverb and a quiet
  drone; `scripts/music.py` has the cue timings. Previews land in `out/music-previews/`.
  GarageBand's loop licence allows royalty-free use in your own soundtracks and distributing
  the result, but not redistributing the loops themselves, so the raw loops stay out of git.

`public/img/` is committed: the status-bar overlay, the cleaned shield screenshot and the
widget captures (from `assets/images/onboarding/`).
