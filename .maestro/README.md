# Maestro E2E flows

End-to-end UI tests run with [Maestro](https://docs.maestro.dev). Runnable flows
live in `flows/`; shared subflows (onboarding, goal creation) live in `helpers/`
so the test runner doesn't execute them standalone.

Each flow is self-contained: it launches with `clearState: true` and rebuilds
whatever state it needs via the helpers, so flows can run in any order.

## Running locally

Build and install a simulator app (any of these):

```bash
npx expo run:ios --configuration Release
```

Then run the suite (or a single flow) against the booted simulator:

```bash
maestro test .maestro/flows
```

```bash
maestro test .maestro/flows/03-practice-first-rounds.yml
```

Quick pass on just the smoke-tagged flows:

```bash
maestro test --include-tags smoke .maestro/flows
```

## CI

`.github/workflows/e2e.yml` runs on every push to `main` (i.e. after each PR
merges) and via manual dispatch: a `macos-15` runner prebuilds the iOS project
(CNG — `ios/` is gitignored), builds the `Meno` scheme for the simulator with
Xcode 26, and runs this suite. macOS runners are free while the repo is public.
Fast checks (typecheck/lint/unit tests) stay in `.github/workflows/ci.yml`.
EAS is used for builds/submissions only; the `e2e-test` simulator profile in
`eas.json` remains handy for producing shareable simulator builds.

## Conventions

- No `testID`s exist in the app yet — selectors use visible text and
  accessibility labels. Maestro matches text as a **full regex**, so strings
  with typographic characters (curly `’`, `·`, `—`) are matched loosely
  (e.g. `.*read it twice`) and literal `.`/`?`/`(` are escaped.
- Cold start renders a blank frame until SQLite migrations finish, and
  first-launch redirect to onboarding fires from the Today tab's focus
  effect — always open with a generous `extendedWaitUntil`.
- Avoid flows that trigger OS permission dialogs (notifications: tap "Later";
  recitation: use "Type instead") or share sheets ("Share challenge").
- Speech, widgets, and Screen Time lock are device-only and can't be covered
  in simulator E2E.
