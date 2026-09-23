#!/usr/bin/env bash
# Local E2E gate — run before creating any PR: builds the app for the iOS
# simulator, boots a simulator, installs the build, and runs the full Maestro
# suite (.maestro/flows + .maestro/manual).
#
# Cleans up after itself so repeated runs don't fill the disk: the Release
# derived data (several GB), the apps this run installed on the simulator, a
# simulator this run booted, and Maestro's debug output. Nothing that existed
# before the run is touched.
#
# Usage: npm run e2e [-- <simulator-udid>]
#        E2E_KEEP_BUILD=1 npm run e2e   # keep ios/build for a fast rebuild
set -euo pipefail
cd "$(dirname "$0")/.."

DERIVED_DATA=ios/build
DEBUG_OUTPUT="$(mktemp -d "${TMPDIR:-/tmp}/meno-e2e-debug.XXXXXX")"
BOOTED_BY_US=""
INSTALLED_UDID=""
BUNDLE_ID=""

cleanup() {
  local code=$?
  set +e
  echo ""
  echo "==> Cleaning up"

  # Apps this run installed: the build under test and Maestro's XCTest driver.
  if [ -n "$INSTALLED_UDID" ]; then
    [ -n "$BUNDLE_ID" ] && xcrun simctl uninstall "$INSTALLED_UDID" "$BUNDLE_ID" >/dev/null 2>&1
    xcrun simctl uninstall "$INSTALLED_UDID" \
      dev.mobile.maestro-driver-iosUITests.xctrunner >/dev/null 2>&1
    echo "    uninstalled test apps from $INSTALLED_UDID"
  fi

  # Only shut down a simulator this run booted — never one already running.
  if [ -n "$BOOTED_BY_US" ]; then
    xcrun simctl shutdown "$BOOTED_BY_US" >/dev/null 2>&1
    echo "    shut down simulator $BOOTED_BY_US"
  fi

  # Build output, but NOT `generated/`: `pod install` writes the React Native
  # codegen sources there and the Pods project consumes them as build inputs,
  # so deleting them breaks the next build until pod install is run again.
  # Everything else under the derived data path is reproducible.
  if [ -n "${E2E_KEEP_BUILD:-}" ]; then
    echo "    kept $DERIVED_DATA (E2E_KEEP_BUILD is set)"
  elif [ -d "$DERIVED_DATA" ]; then
    echo "    removing build output from $DERIVED_DATA ($(du -sh "$DERIVED_DATA" 2>/dev/null | cut -f1))"
    find "$DERIVED_DATA" -mindepth 1 -maxdepth 1 ! -name generated -exec rm -rf {} +
  fi

  # Maestro's screenshots and logs are the evidence for a failure, so they
  # only go when there is nothing to diagnose.
  if [ "$code" -eq 0 ]; then
    rm -rf "$DEBUG_OUTPUT"
  else
    echo "    kept Maestro debug output: $DEBUG_OUTPUT"
  fi

  echo "    $(df -h / | awk 'NR==2 {print $4}') free on /"
  exit "$code"
}
trap cleanup EXIT

export LANG=en_US.UTF-8
# Stable Xcode 26 — the 27-beta toolchain cannot compile expo-modules-jsi.
if [ -d /Applications/Xcode.app/Contents/Developer ]; then
  export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
fi

if ! command -v maestro >/dev/null; then
  echo "maestro CLI not found — install with: curl -fsSL https://get.maestro.mobile.dev | bash" >&2
  exit 1
fi

if [ ! -d ios ]; then
  echo "ios/ missing — running prebuild once"
  npx expo prebuild --platform ios
fi

echo "==> Building Meno for the iOS simulator"
set -o pipefail
xcodebuild \
  -workspace ios/Meno.xcworkspace \
  -scheme Meno \
  -configuration Release \
  -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath "$DERIVED_DATA" \
  CODE_SIGNING_ALLOWED=NO \
  build | (command -v xcbeautify >/dev/null && xcbeautify --quiet || grep -E "error:|warning: .*Meno|BUILD")

APP="$DERIVED_DATA/Build/Products/Release-iphonesimulator/Meno.app"
test -d "$APP"
# Read it rather than hardcoding — the bundle id is still a placeholder.
BUNDLE_ID=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP/Info.plist")

# Pick an iPhone simulator. The runtime is deliberately NOT pinned: the app
# is built with whatever SDK the stable Xcode ships and runs fine on a newer
# simulator, and pinning stranded the gate when that runtime had no stock
# iPhone left. Preference order: already booted, then a stock-named device
# (so a renamed rig like a screenshot simulator is never commandeered), then
# the newest runtime. Building never launches the app, so no "Open in Meno?"
# dialog is left over from a dev-client open.
UDID="${1:-}"
if [ -z "$UDID" ]; then
  # Match on device type, not display name — a renamed device is still an
  # iPhone. `// empty` matters: jq -r prints the literal string "null" for no
  # match, which sails past a plain -n test and ends up booting "null".
  UDID=$(xcrun simctl list devices available --json \
    | jq -r '[ .devices | to_entries[]
               | select(.key | test("SimRuntime\\.iOS-"))
               | (.key | capture("iOS-(?<a>[0-9]+)-(?<b>[0-9]+)")
                       | (.a|tonumber)*1000 + (.b|tonumber)) as $v
               | .value[]
               | select(.deviceTypeIdentifier | test("SimDeviceType\\.iPhone"))
               | { udid, state, v: $v, stock: (.name | test("^iPhone [0-9]")) } ]
             | sort_by([(.state != "Booted"), (.stock | not), -.v])
             | .[0].udid // empty')
fi
if [ -z "$UDID" ] || [ "$UDID" = "null" ]; then
  echo "No iPhone simulator available. Devices Xcode can see:" >&2
  xcrun simctl list devices available >&2
  echo "" >&2
  echo "Create one:   xcrun simctl create 'Meno E2E' \\" >&2
  echo "                com.apple.CoreSimulator.SimDeviceType.iPhone-17 \\" >&2
  echo "                com.apple.CoreSimulator.SimRuntime.iOS-26-0" >&2
  echo "Or pick one:  npm run e2e -- <udid>" >&2
  exit 1
fi
echo "==> Simulator: $(xcrun simctl list devices --json \
  | jq -r --arg u "$UDID" '.devices | to_entries[] | .key as $r | .value[]
                           | select(.udid == $u) | "\(.name) (\($r | sub(".*SimRuntime.";"")))"')"

state=$(xcrun simctl list devices --json | jq -r --arg u "$UDID" '.devices[][] | select(.udid == $u) | .state')
if [ "$state" != "Booted" ]; then
  echo "==> Booting simulator $UDID"
  xcrun simctl boot "$UDID"
  xcrun simctl bootstatus "$UDID" -b
  BOOTED_BY_US="$UDID"
fi

echo "==> Installing $APP ($BUNDLE_ID) on $UDID"
xcrun simctl install "$UDID" "$APP"
INSTALLED_UDID="$UDID"

echo "==> Running Maestro CI flows"
if ! maestro --udid "$UDID" test --debug-output "$DEBUG_OUTPUT" .maestro/flows; then
  # A long-lived simulator can leave Maestro's XCTest driver stale
  # ("Failed to connect to /127.0.0.1:7001"). Recycle once and retry —
  # a real regression fails the retry too.
  echo "==> Maestro failed — recycling the simulator and retrying once"
  xcrun simctl uninstall "$UDID" dev.mobile.maestro-driver-iosUITests.xctrunner 2>/dev/null || true
  xcrun simctl shutdown "$UDID" 2>/dev/null || true
  xcrun simctl boot "$UDID"
  xcrun simctl bootstatus "$UDID" -b
  xcrun simctl install "$UDID" "$APP"
  maestro --udid "$UDID" test --debug-output "$DEBUG_OUTPUT" .maestro/flows
fi

echo "==> Running Maestro manual flows (deep link)"
maestro --udid "$UDID" test --debug-output "$DEBUG_OUTPUT" .maestro/manual

echo "==> E2E gate passed — OK to open the PR"
