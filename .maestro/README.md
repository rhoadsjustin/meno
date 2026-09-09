# Maestro E2E flows

End-to-end UI tests run with [Maestro](https://docs.maestro.dev). CI flows
live in `flows/`; shared subflows (onboarding, goal creation) live in `helpers/`
so the test runner doesn't execute them standalone; `manual/` holds flows that
are local-only because they misbehave on CI simulators (currently the
review deep-link flow: iOS's "Open in Meno?" scheme confirmation can appear
tens of seconds late on slow CI machines, land after the flow gave up waiting,
and then sit over the screen failing every later flow). Run those before a
release: `maestro test .maestro/manual`.

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

## The pre-PR gate

This suite is a **local gate: run it before creating any PR.**

```bash
npm run e2e
```

The script (`scripts/e2e-local.sh`) builds the app for the simulator
(incremental — fast after the first run), boots an iOS 26 iPhone, installs
the build, and runs `flows/` then `manual/`. Only open the PR once it prints
that the gate passed.

We ran this suite on GitHub Actions for a while (`e2e.yml`, removed) but the
shared macOS runners were too flaky to gate on: simulator boots wedged for
an hour, the app crashed mid-flow on runs that pass everywhere else, and
system dialogs landed tens of seconds late. The flows themselves are stable
locally — if `npm run e2e` fails, treat it as a real regression.

Fast checks (typecheck/lint/unit tests) run in CI on every PR and push
(`.github/workflows/ci.yml`). Shipping to TestFlight is
`.github/workflows/ship.yml`: put `[ship]` in the merge commit message or
dispatch it manually (needs the `EXPO_TOKEN` repo secret). The `e2e-test`
simulator profile in `eas.json` remains handy for producing shareable
simulator builds.

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
