# Over-the-air updates (EAS Update)

Meno can ship JavaScript fixes to installed copies without a new binary or App
Review. A fix goes out with one command, reaches phones within minutes, and
users never lose their place in a practice session.

**Status:** configured on the `expo-updates` branch. No binary in TestFlight or
on the App Store has expo-updates yet. **The first build made from this code is
the first one that can receive updates**; everything before it needs a new
binary to change.

## How it works for users

- At every cold launch, Meno asks the update server for a newer update in the
  background and downloads it. It starts on the next cold launch (the
  expo-updates default; launches never wait on the network).
- When the user returns to Meno, it checks again (at most every 15 minutes), so
  a fix downloads without waiting for iOS to evict the app.
- Settings shows **Update ready · Restart Meno now** while one is waiting, and
  the footer reads **Meno 1.5.0, updated Oct 25** once one is running.
- A **critical** update (`--critical`, or any rollback) also asks once:
  _"Meno has a fix ready — Restart / Later."_ It asks only on a top-level tab,
  never during practice, review, the unlock quiz, onboarding or a sheet.

Code: `src/services/updates/` (rules in `policy.ts`, unit-tested). Debug builds
load JS from Metro and never take updates.

## What can ship as an update

| Ships OTA                                                                                                                                     | Needs a new build                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Anything under `src/` (screens, services, grading, copy, styles)                                                                              | A new or upgraded package with native code, an Expo SDK upgrade                                                                   |
| Images and fonts imported from JS                                                                                                             | `app.config.ts` native fields: plugins, `infoPlist`, entitlements, icons, splash, schemes, widget families or Edit Widget options |
| `assets/bibles/bundled.db`, **if** you bump `BUNDLED_DB_NAME` in `src/services/bible/index.ts` (devices only re-import under a new name)      | Anything in `targets/` (Shield extensions) or `modules/` (local Expo modules)                                                     |
| Widget layouts in `src/widgets/` (expo-widgets sends them from the app; they change once the app has run the update and published a snapshot) | `patches/` touching native code, `eas.json` build settings                                                                        |

When unsure, run `npm run ota`: it stops if the native fingerprint differs from
the build users have.

## The runtime version rule

`runtimeVersion` uses the **appVersion** policy: an update reaches only
binaries built at the same `version` in `app.config.ts`. So:

> **Bump `version` whenever native code or native config changes**, even for a
> TestFlight-only build.

App Store Connect already forces a bump past the live version for each store
release, so normally each release is its own runtime. The trap is two builds at
the same version with different native code: an update meant for the newer one
would crash the older one. `npm run ota` catches that, but bumping avoids it.

## Shipping a fix

1. **Start from the code users are running, not from `main`.** `main` may hold
   unreleased JS that would ship with your fix. `npm run ota` prints the
   target build's commit. Branch from it in a clean worktree:

   ```bash
   git fetch origin
   ```

   ```bash
   git worktree add .claude/worktrees/hotfix -b hotfix/<name> <build-commit>
   ```

   Then `npm ci` in the worktree, fix, commit and push. Skip this step only if
   everything on `main` is meant to ship.

2. **Publish:**

   ```bash
   npm run ota -- -m "Fix the review crash"
   ```

   Add `--critical` when users should be offered an immediate restart. Add
   `--rollout 10` to serve 10% of users first. `--help` lists every flag.

   Before it publishes, the script:
   - refuses uncommitted changes, because `eas update` bundles whatever is on
     disk;
   - runs typecheck, lint and unit tests (`--skip-checks` for emergencies);
   - finds the finished `production` build at this runtime version, and stops
     if there is none, because nobody would receive the update;
   - compares that build's native fingerprint with yours and stops on drift
     (`--allow-native-diff` overrides; it is almost never right);
   - lists the commits going out on top of that build, then asks.

   It publishes iOS only, to the `production` channel with the `production`
   EAS environment, and uploads source maps.

3. **Verify on your iPhone** (a build from the App Store or TestFlight):
   fully close Meno and reopen it, wait a few seconds, then close and reopen it
   once more. Or open Settings and tap **Restart Meno now**. The footer then
   shows today's date. For adoption and crash rate:

   ```bash
   npx eas-cli@latest update:insights
   ```

4. **Merge the fix back into `main`** so the next build includes it.

`npm run e2e` is still the gate for pull requests. For a hotfix, run it when
time allows. The script runs only the fast checks.

## Staged rollouts

`--rollout <percent>` serves the update to that share of users. Raise it or
finish it with `npx eas-cli@latest update:edit`. Undo it with
`npx eas-cli@latest update:revert-update-rollout`.

## Rolling back

A bad update is fixed one of three ways. All of them reach users through the
same download path.

- **Roll forward:** fix it and publish again with `--critical`. This is usually
  best.
- **Back to an earlier update:** `npx eas-cli@latest update:republish`. Phones
  treat it with the priority it was first published with.
- **Back to the binary's own code:** the command below. Phones always treat it
  as critical and offer the restart.

```bash
npx eas-cli@latest update:roll-back-to-embedded --channel production --platform ios --message "Roll back <what>"
```

`npx eas-cli@latest update:rollback` walks through either of the last two
interactively.

expo-updates also protects against a crash at launch on its own. If a
downloaded update crashes before it renders, the next launch falls back to the
previous working update.

## Channels

Each build profile in `eas.json` embeds a channel. Each channel points to the
branch of the same name.

| Profile       | Channel       | Who runs it                                |
| ------------- | ------------- | ------------------------------------------ |
| `production`  | `production`  | TestFlight **and** App Store (same binary) |
| `e2e-test`    | `e2e-test`    | EAS Maestro runs (simulator)               |
| `development` | `development` | Internal dev builds                        |

TestFlight testers and App Store users on the same version get production
updates at the same moment. Use `--rollout` when that matters. A TestFlight
build at a newer version is a different runtime, so it is unaffected.

Local Release builds (`npm run e2e`, the device recipe) have no channel. They
check at launch, get no update, and run their own bundle.

## Before the first update-capable build ships

- [ ] **Privacy policy:** update checks add a network call. Each request carries
      the app version, which update is running, and a random identifier that
      expo-updates creates at install (`EAS-Client-ID`, reset by reinstalling).
      After a crash at launch, it also carries the error message. The
      policy (new "App updates" section, `.md` and `.html`) and
      `review-answers.md` are updated on this branch. Update the policy's
      effective date and deploy the website, which serves
      `docs/ship/privacy-policy.html`, when the build ships.
- [ ] **App Privacy label in App Store Connect:** decide whether that install
      identifier needs a declaration (Identifiers → Device ID, App
      Functionality, not linked to the user). If yes, add it to
      `privacyManifests.NSPrivacyCollectedDataTypes` in `app.config.ts` too.
- [ ] **Version:** bump past the live App Store version (`version-1.5.0`, PR 14,
      is still open).
- [ ] **After the build:** `npx eas-cli@latest channel:list` shows
      `production → production`.
