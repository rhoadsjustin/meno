#!/usr/bin/env bash
# Regenerates public/img/duo/*.png from the iPhone Duo simulator for the Duo
# composition (src/Duo.tsx). Needs argent >= 0.26 (fold/rotate), Xcode 27.1,
# a booted iPhone Duo simulator with a Release build of Meno installed and a
# goal created (John 1:1 is what the cut shows).
#
#   DUO_UDID=<udid> npm run captures:duo
#
# Inner-panel captures come out turned 90 degrees (the opened UI is landscape)
# and are rotated upright with sips; cover-panel captures are portrait.
set -euo pipefail
cd "$(dirname "$0")/.."
D="${DUO_UDID:-B3688EEA-04C1-4F28-BFC0-5EBBCD01624B}"
OUT=public/img/duo
mkdir -p "$OUT"

tap() { # tap the first accessibility element whose line contains $1
  argent run describe --udid "$D" --json \
    | python3 -c '
import json, re, sys
label = sys.argv[1]
for line in json.load(sys.stdin)["description"].splitlines():
    m = re.search(r"\((\d\.\d+), (\d\.\d+), (\d\.\d+), (\d\.\d+)\)\s*$", line)
    if m and label.lower() in line.lower():
        x, y, w, h = map(float, m.groups()); print(f"{x + w/2:.4f} {y + h/2:.4f}"); break
' "$1" | { read -r x y && argent run gesture-tap --udid "$D" --x "$x" --y "$y" >/dev/null; }
  sleep 1.5
}
shot() { # shot <name> [turn]
  argent run screenshot --udid "$D" --scale 1 --out "$OUT/$1.png" >/dev/null
  [ "${2:-}" = turn ] && sips -r 90 "$OUT/$1.png" >/dev/null
  echo "captured $1"
}

argent run fold --udid "$D" --posture open >/dev/null
argent run rotate --udid "$D" --orientation Portrait >/dev/null
argent run restart-app --udid "$D" --bundleId com.rhoadsdev.meno >/dev/null; sleep 5
shot open-today turn
tap 'AXButton "Library"';  shot open-library turn
tap 'AXButton "Stats"';    shot open-stats turn
tap 'AXButton "Today"';    tap 'AXButton "Practice"'; sleep 1; shot open-practice turn
tap 'Close practice';      tap 'Continue reading'; sleep 1; shot open-reader turn

argent run fold --udid "$D" --posture half-open >/dev/null; sleep 3
shot half-reader turn
tap 'id="BackButton"';     shot half-today turn

argent run fold --udid "$D" --posture closed >/dev/null; sleep 3
shot closed-today
tap 'AXButton "Practice"'; sleep 1; shot closed-practice
tap 'Close practice';      tap 'Continue reading'; sleep 1; shot closed-reader
tap 'id="BackButton"'
argent run fold --udid "$D" --posture open >/dev/null
