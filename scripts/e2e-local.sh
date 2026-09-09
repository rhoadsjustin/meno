#!/usr/bin/env bash
# Local E2E gate — run before creating any PR: builds the app for the iOS
# simulator (incremental), boots a simulator, installs the build, and runs
# the full Maestro suite (.maestro/flows + .maestro/manual).
#
# Usage: npm run e2e [-- <simulator-udid>]
set -euo pipefail
cd "$(dirname "$0")/.."

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

echo "==> Building Meno for the iOS simulator (incremental)"
set -o pipefail
xcodebuild \
  -workspace ios/Meno.xcworkspace \
  -scheme Meno \
  -configuration Release \
  -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath ios/build \
  CODE_SIGNING_ALLOWED=NO \
  build | (command -v xcbeautify >/dev/null && xcbeautify --quiet || grep -E "error:|warning: .*Meno|BUILD")

APP=ios/build/Build/Products/Release-iphonesimulator/Meno.app
test -d "$APP"

# Pick an iOS 26 iPhone (prefer one already booted); building never launches
# the app, so no "Open in Meno?" dialog is left over from a dev-client open.
UDID="${1:-}"
if [ -z "$UDID" ]; then
  UDID=$(xcrun simctl list devices available --json \
    | jq -r '[.devices | to_entries[] | select(.key | contains("iOS-26")) | .value[] | select(.name | test("^iPhone"))] | sort_by(.state != "Booted") | .[0].udid')
fi
test -n "$UDID"
state=$(xcrun simctl list devices --json | jq -r --arg u "$UDID" '.devices[][] | select(.udid == $u) | .state')
if [ "$state" != "Booted" ]; then
  echo "==> Booting simulator $UDID"
  xcrun simctl boot "$UDID"
  xcrun simctl bootstatus "$UDID" -b
fi

echo "==> Installing $APP on $UDID"
xcrun simctl install "$UDID" "$APP"

echo "==> Running Maestro CI flows"
if ! maestro --udid "$UDID" test .maestro/flows; then
  # A long-lived simulator can leave Maestro's XCTest driver stale
  # ("Failed to connect to /127.0.0.1:7001"). Recycle once and retry —
  # a real regression fails the retry too.
  echo "==> Maestro failed — recycling the simulator and retrying once"
  xcrun simctl uninstall "$UDID" dev.mobile.maestro-driver-iosUITests.xctrunner 2>/dev/null || true
  xcrun simctl shutdown "$UDID" 2>/dev/null || true
  xcrun simctl boot "$UDID"
  xcrun simctl bootstatus "$UDID" -b
  xcrun simctl install "$UDID" "$APP"
  maestro --udid "$UDID" test .maestro/flows
fi

echo "==> Running Maestro manual flows (deep link)"
maestro --udid "$UDID" test .maestro/manual

echo "==> E2E gate passed — OK to open the PR"
