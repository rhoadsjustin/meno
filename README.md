# Meno

Scripture memory & reading app — Expo (iOS-first). From Greek **μένω**: remain, abide (John 15:7).

Full product and technical specs live in [docs/](docs/); the build order is [docs/08-roadmap.md](docs/08-roadmap.md). Working conventions for agents and contributors are in [CLAUDE.md](CLAUDE.md).

## Getting started

```bash
npm install
npm run build:bible   # compiles bundled public-domain translations → assets/bibles/web.db
npx expo run:ios      # custom dev client — Expo Go is not supported
```

Screen Time (phone lock) features require a physical iPhone; everything else runs in the simulator.

## Checks

```bash
npm run typecheck && npm run lint && npm run test
```

Unit tests cover the pure services (`src/services/*`) and validate the built Scripture database.

## Structure

- `src/app/` — Expo Router routes (native tabs: Today, Library, Stats, Settings)
- `src/services/bible/` — the only module that touches Scripture text; licensing enforced here
- `src/services/db/` — expo-sqlite + Drizzle schema and migrations (`drizzle/`)
- `src/theme/` — "Lapis & vellum" design tokens (docs/07)
- `scripts/build-bible-db.ts` — compiles the WEB translation into the bundled SQLite asset
