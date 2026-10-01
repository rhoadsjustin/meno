# Meno promo video

A 30-second, 1080×1350 (4:5) social cut built with [Remotion](https://remotion.dev).
Scenes, headlines and footage timings live in `src/Promo.tsx`; brand colors and
fonts in `src/theme.ts`.

```bash
npm install
npm run studio   # preview and scrub in the browser
npm run render   # -> out/meno-promo.mp4
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

`public/img/` is committed: the status-bar overlay, the cleaned shield screenshot and the
widget captures (from `assets/images/onboarding/`).
