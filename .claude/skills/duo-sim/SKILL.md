---
name: duo-sim
description: Drive the iPhone Duo (foldable) simulator for Meno — fold between the cover and inner panels, rotate, capture each panel, and know which coordinate space argent is using. Use whenever checking Meno's layout on iPhone Duo or testing poses (opened, closed, half-open, rotated, Split View).
---

# iPhone Duo simulator for Meno

The Duo has two panels. iOS shows the UI on exactly one of them:

| Posture | Panel | Pixels | Points (3x) | Size classes |
|---|---|---|---|---|
| closed (0°) | cover | 1398 × 2034 | 466 × 678 | compact width, regular height |
| half-open (120°), open (180°) | inner | 2007 × 2853 | 669 × 951 | regular × regular |

Unfolded, the UI is **landscape** (951 wide × 669 tall) unless the device is
rotated; the inner panel ignores Meno's portrait lock. On the cover panel the
status bar is a vertical strip at the top-right under the camera, and the
safe area's `right` inset is non-zero for the whole height — Meno applies
left and right insets separately (`useContentLayout().sides`), never mirrored.

## Tools (argent ≥ 0.26; `fold` landed in 0.26, `foldable: true` in list-devices)

- Simulator: **iPhone Duo**, udid `B3688EEA-04C1-4F28-BFC0-5EBBCD01624B`, iOS 27.1 runtime. Boot with `boot-device`; it opens in the active Xcode's Device Hub.
- Fold: `fold { udid, posture: "closed" | "half-open" | "open" }` or `{ angle: 0–180 }`. Returns `{ activeScreen, screen: { panel, width, height }, posture, hingeAngle }` and waits until input lands again. Fold between gestures, never mid-gesture.
- Rotate: `rotate` sets the **device** orientation, not the UI's. Unfolded, `Portrait` gives a landscape UI and `LandscapeLeft` gives a portrait UI (669 × 951).
- Every argent tool (`screenshot`, `describe`, `gesture-*`) uses the **active panel**, also after a fold made in Device Hub. Coordinates and screenshot size change with the panel: re-run `describe` after every fold or rotate, never reuse frames from before.
- If this session's MCP server predates 0.26 (no `fold` tool in the list), call it from the shell instead — the CLI talks to the same tool-server:

```bash
argent run fold --udid B3688EEA-04C1-4F28-BFC0-5EBBCD01624B --posture open --json
```

```bash
argent run rotate --udid B3688EEA-04C1-4F28-BFC0-5EBBCD01624B --orientation LandscapeLeft
```

## Fallbacks without argent

- Read the posture: `xcrun simctl io <udid> enumerate` lists one `Display class: 0` port at 1398×2034 when closed and a second at 2007×2853 when opened.
- Capture a specific panel: `xcrun simctl io <udid> screenshot --display=<port UUID from enumerate> out.png`.
- Pose buttons live only in Device Hub (`Xcode.app/Contents/Applications/DeviceHub.app`, Xcode 27.1+); there is no `simctl` pose command. Use `DEVELOPER_DIR=/Users/rhoads/Downloads/Xcode.app/Contents/Developer` for the 27.1 tools.
- Never screen-capture the Mac desktop to look at Device Hub; it exposes unrelated windows.

## Driving it from a shell (argent CLI)

When the session's MCP server predates 0.26, or a tap through MCP does not land
on the rotated inner panel, the CLI is the reliable path. Taps very close to a
screen edge in the turned coordinate space are flaky; nudge 0.005 inward.

```bash
argent run describe --udid B3688EEA-04C1-4F28-BFC0-5EBBCD01624B --json
```

```bash
argent run gesture-tap --udid B3688EEA-04C1-4F28-BFC0-5EBBCD01624B --x 0.84 --y 0.95
```

```bash
argent run screenshot --udid B3688EEA-04C1-4F28-BFC0-5EBBCD01624B --scale 1 --out duo.png && sips -r 90 duo.png
```

Unfolded captures come out turned 90°; `sips -r 90` puts the landscape UI the
right way up for review.

## What to check for Meno, per pose

Wide windows (`useContentLayout().isWide`, width ≥ 600pt) switch the layouts
in `src/components/content-layout.ts`: Today and Stats go two-pane as even
halves (`panes.row` + `panes.half`, so a half-folded hinge lands between the
panes), Library becomes a two-up grid, and the Reader gets a chapter sidebar.
Extra-wide windows (≥ 900pt) add the practice context rail (reference, chunk
progress, the tier ladder). Narrow windows keep the shipped phone layouts.

Navigation controls follow Apple's "vertical controls" rule: Practice,
Review, Reader and Stitch configure native bar items in-page via
`src/components/screen-header.tsx` (`ScreenHeader` + `Stack.Toolbar`), so
Close, Back and the chapter chevrons move to the side with the status bar and
tab bar on the cover panel and in the opened landscape pose. Do not add JS
header rows to stack screens; modals keep their bottom Cancel/Continue bars.

1. Closed: content avoids the right status-bar strip; tabs, practice, reader all usable at 466pt wide; no two-pane layout appears (466 < 600).
2. Open (landscape UI): Today shows the hero left and the ladder/secondary cards right; Stats shows numerals and the practice grid beside the badges; Library is a two-up grid; Practice has the rail on the right and the primary action stays on screen at 669pt of height; the Reader's chapter sidebar jumps chapters.
3. Open + `rotate LandscapeLeft` (portrait UI, 669 × 951): same checks, one column.
4. Half-open: same panel as open; nothing should jump.
5. Fold while a session is running (practice, speak): state survives, no re-mount.
6. Split View (Device Hub: drag the home indicator to one side): the window becomes compact again; nothing assumes the inner panel is always wide.
