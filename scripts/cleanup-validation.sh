#!/usr/bin/env bash
# Post-merge cleanup — reclaim the disk that validation runs leave behind.
#
# Validating a PR (the local E2E gate, `npx expo run:ios` builds, Maestro runs,
# a worktree per session) leaves several GB per branch on this machine: Release
# and Debug derived data, node_modules + Pods in every worktree, and Maestro's
# debug output. Once the PR is merged none of it is needed. This removes exactly
# that, and nothing a live session is still using.
#
# What goes:
#   1. Worktrees of merged branches (merged into origin/main, or the tip of a
#      merged PR) with a clean tree. One the desktop app made (`<name>-<6 hex>`)
#      is stripped of node_modules/ios/android/.expo and left for the app to
#      archive; one made by hand is removed with `git worktree remove`.
#   2. Build output (`ios/build*`, `android/build`, `android/app/build`) in the
#      main checkout and every remaining worktree, plus Meno's Xcode
#      DerivedData, once nothing has written to it for an hour. `ios/build/
#      generated` stays: `pod install` writes the codegen sources there.
#   3. Maestro debug output (`$TMPDIR/meno-e2e-debug.*`, `~/.maestro/tests`)
#      older than an hour, while no Maestro run is in progress.
#
# A worktree is left alone when it is busy: a device-warden lease names it, a
# running process has its cwd inside it, this script was invoked from inside
# it, or a tracked file changed in the last hour. The main checkout is never
# removed. Simulators are reported, never touched.
#
# Usage: npm run cleanup                 # do it
#        npm run cleanup -- --dry-run    # show what would go
#        scripts/cleanup-validation.sh --background   # from a hook: detach
set -euo pipefail
shopt -s nullglob

# Hooks launched by the desktop app get a minimal PATH; gh lives in Homebrew.
export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin"

DRY_RUN=""
BACKGROUND=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --background) BACKGROUND=1 ;;
    -h|--help) sed -n '2,/^set -euo/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $arg" >&2; exit 1 ;;
  esac
done

TMP="${TMPDIR:-/tmp}"; TMP="${TMP%/}"
LOG="$TMP/meno-cleanup.log"
LOCK="$TMP/meno-cleanup.lock"
IDLE_MINUTES=60

if [ -n "$BACKGROUND" ]; then
  # Detach so a SessionStart hook returns at once; the work logs to $LOG.
  nohup bash "$0" >>"$LOG" 2>&1 </dev/null &
  echo "meno cleanup running in the background (log: $LOG)"
  exit 0
fi

INVOKED_FROM="$(pwd -P)"
cd "$(dirname "$0")/.."
MAIN="$(git worktree list --porcelain | awk '/^worktree /{print substr($0,10); exit}')"
cd "$MAIN"

# One run at a time across sessions; a lock older than two hours is stale.
if ! mkdir "$LOCK" 2>/dev/null; then
  if [ -n "$(/usr/bin/find "$LOCK" -maxdepth 0 -mmin +120 2>/dev/null)" ]; then
    rmdir "$LOCK" 2>/dev/null || true
  fi
  mkdir "$LOCK" 2>/dev/null || { echo "another cleanup is running ($LOCK)"; exit 0; }
fi
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

echo "==> Meno post-merge cleanup, $(date '+%Y-%m-%d %H:%M')${DRY_RUN:+ (dry run)}"
FREE_BEFORE=$(df -k / | awk 'NR==2 {print $4}')

size() { du -sh "$1" 2>/dev/null | cut -f1; }
# remove <path> <label>
remove() {
  local path=$1 label=$2 s
  [ -e "$path" ] || return 0
  s=$(size "$path")
  if [ -n "$DRY_RUN" ]; then echo "    would remove $label ($s)"; return 0; fi
  rm -rf "$path"
  echo "    removed $label ($s)"
}
# empty_build_dir <dir> <label>: everything but generated/
empty_build_dir() {
  local dir=$1 label=$2 s child
  s=$(size "$dir")
  if [ -n "$DRY_RUN" ]; then echo "    would empty $label ($s, keeping generated/)"; return 0; fi
  for child in "$dir"/* "$dir"/.[!.]*; do
    [ "$(basename "$child")" = generated ] && continue
    rm -rf "$child"
  done
  echo "    emptied $label ($s, kept generated/)"
}
# has_build_output <dir>: anything in it besides generated/
has_build_output() {
  local child
  for child in "$1"/* "$1"/.[!.]*; do
    [ "$(basename "$child")" = generated ] || return 0
  done
  return 1
}
# written_recently <path>: any file changed within IDLE_MINUTES
written_recently() {
  [ -n "$(/usr/bin/find "$1" -mmin "-$IDLE_MINUTES" -print 2>/dev/null | head -n 1)" ]
}
# worked_on_recently <worktree>: like written_recently, ignoring generated trees
worked_on_recently() {
  [ -n "$(/usr/bin/find "$1" \( -name node_modules -o -name Pods -o -name .git \
            -o -path "$1/ios/build*" \) -prune -o -type f -mmin "-$IDLE_MINUTES" -print 2>/dev/null \
          | head -n 1)" ]
}

# Directories some live session is working in: device-warden lease cwds whose
# holder is alive, the cwd of every running process of ours, and wherever this
# script was invoked from.
busy_dirs() {
  echo "$INVOKED_FROM"
  local f
  for f in "$HOME"/.claude/device-warden/leases/*.json; do
    jq -r '.holders[]? | "\(.pid) \(.cwd)"' "$f" 2>/dev/null | while read -r pid cwd; do
      [ -n "$cwd" ] && kill -0 "$pid" 2>/dev/null && echo "$cwd"
    done
  done
  lsof -a -u "$(id -u)" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p'
}
BUSY_DIRS="$(busy_dirs | sort -u)"
# is_busy <dir>: a busy dir is at or below it
is_busy() {
  local d=$1 b
  while IFS= read -r b; do
    case "$b" in "$d"|"$d"/*) return 0 ;; esac
  done <<<"$BUSY_DIRS"
  return 1
}

# Merged = ancestor of origin/main, or the tip of a PR GitHub merged (squash
# merges leave no ancestry, so the PR's recorded head commit is the proof).
git fetch --quiet origin main 2>/dev/null || echo "    (could not fetch origin/main; using the local copy)"
MERGED_TIPS="$(gh pr list --state merged --limit 200 --json headRefName,headRefOid \
                 --jq '.[] | "\(.headRefName) \(.headRefOid)"' 2>/dev/null || true)"
[ -z "$MERGED_TIPS" ] && echo "    (gh unavailable: only branches merged into origin/main count as merged)"
# is_merged <branch> <tip-sha>
is_merged() {
  git merge-base --is-ancestor "$2" origin/main 2>/dev/null && return 0
  printf '%s\n' "$MERGED_TIPS" | grep -qx -- "$1 $2"
}

list_worktrees() {   # path<TAB>branch, one per line
  git worktree list --porcelain | awk '
    /^worktree /{path=substr($0,10)}
    /^branch /{branch=substr($0,19)}
    /^detached/{branch="(detached)"}
    /^$/{ if (path!="") print path "\t" branch; path=""; branch="" }
    END{ if (path!="") print path "\t" branch }'
}

echo "==> Worktrees of merged branches"
while IFS=$'\t' read -r w branch; do
  [ "$w" = "$MAIN" ] && continue
  [ -d "$w" ] || continue
  label=${w#"$MAIN"/}
  tip=$(git -C "$w" rev-parse HEAD 2>/dev/null || true)
  if [ "$branch" = "(detached)" ] || [ -z "$tip" ]; then echo "    keep $label (detached HEAD)"; continue; fi
  if ! is_merged "$branch" "$tip"; then echo "    keep $label ($branch: not merged)"; continue; fi
  if [ -n "$(git -C "$w" status --porcelain 2>/dev/null)" ]; then echo "    keep $label (uncommitted changes)"; continue; fi
  if is_busy "$w"; then echo "    keep $label (a session is using it)"; continue; fi
  if worked_on_recently "$w"; then echo "    keep $label (files changed in the last ${IDLE_MINUTES} min)"; continue; fi
  case "$(basename "$w")" in
    *-[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f])
      echo "    $label ($branch merged): stripping, left for the app to archive"
      for d in node_modules ios android .expo; do remove "$w/$d" "$label/$d"; done ;;
    *)
      if [ -n "$DRY_RUN" ]; then echo "    would remove worktree $label ($branch merged, $(size "$w"))"
      else
        s=$(size "$w")
        git worktree remove --force "$w" && echo "    removed worktree $label ($branch merged, $s)"
      fi ;;
  esac
done < <(list_worktrees)
[ -n "$DRY_RUN" ] || git worktree prune

echo "==> Build output idle for ${IDLE_MINUTES}+ minutes"
while IFS=$'\t' read -r w _; do
  [ -d "$w" ] || continue
  label=${w#"$MAIN"/}; [ "$w" = "$MAIN" ] && label="."
  if is_busy "$w"; then echo "    skip $label (a session is using it)"; continue; fi
  for b in "$w"/ios/build "$w"/ios/build-* "$w"/android/build "$w"/android/app/build; do
    [ -d "$b" ] || continue
    has_build_output "$b" || continue
    if written_recently "$b"; then echo "    skip ${b#"$MAIN"/} (written to recently)"; continue; fi
    if [ "$(basename "$b")" = build ] && [ -d "$b/generated" ]; then empty_build_dir "$b" "${b#"$MAIN"/}"
    else remove "$b" "${b#"$MAIN"/}"; fi
  done
done < <(list_worktrees)
for d in "$HOME"/Library/Developer/Xcode/DerivedData/Meno-*; do
  if written_recently "$d"; then echo "    skip DerivedData/$(basename "$d") (written to recently)"; continue; fi
  remove "$d" "DerivedData/$(basename "$d")"
done

echo "==> Maestro output"
if pgrep -qf 'maestro' 2>/dev/null; then
  echo "    skip: a Maestro run is in progress"
else
  for d in "$TMP"/meno-e2e-debug.* "$HOME"/.maestro/tests/*; do
    if written_recently "$d"; then echo "    skip $d (written to recently)"; continue; fi
    remove "$d" "$d"
  done
fi

echo "==> Shared dependency store (scripts/worktree.sh)"
# A store entry is one clean install per package-lock.json. Checkouts hold APFS
# clones of it, not links, so removing an entry never breaks a checkout; keep
# the ones some checkout's lockfile still names, and anything used recently.
DEPS_STORE="${MENO_DEPS_STORE:-$HOME/.cache/meno-deps}"
if [ -d "$DEPS_STORE" ]; then
  node_major=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo "?")
  WANTED_KEYS="$(while IFS=$'\t' read -r w _; do
      [ -f "$w/package-lock.json" ] && echo "$(shasum -a 256 "$w/package-lock.json" | cut -c1-16)-node$node_major"
    done < <(list_worktrees) | sort -u)"
  for d in "$DEPS_STORE"/*; do
    [ -d "$d" ] || continue
    key=$(basename "$d")
    case "$key" in
      *.lock|*.partial)
        # Leftovers of an interrupted install.
        [ -n "$(/usr/bin/find "$d" -maxdepth 0 -mmin +120 2>/dev/null)" ] && remove "$d" "deps store $key" ;;
      *)
        if printf '%s\n' "$WANTED_KEYS" | grep -qx -- "$key"; then echo "    keep $key (a checkout's lockfile)"; continue; fi
        if [ -n "$(/usr/bin/find "$d/.ready" -mmin "-$IDLE_MINUTES" 2>/dev/null)" ]; then echo "    keep $key (used recently)"; continue; fi
        remove "$d" "deps store $key" ;;
    esac
  done
fi

FREE_AFTER=$(df -k / | awk 'NR==2 {print $4}')
echo "==> Not touched: simulators use $(size "$HOME/Library/Developer/CoreSimulator/Devices") in CoreSimulator/Devices" \
     "(erase an idle one with: xcrun simctl erase <udid>)"
if [ -n "$DRY_RUN" ]; then
  echo "==> Dry run: nothing removed. $(df -h / | awk 'NR==2 {print $4}') free on /"
else
  echo "==> Freed $(( (FREE_AFTER - FREE_BEFORE) / 1024 )) MB; $(df -h / | awk 'NR==2 {print $4}') free on /"
fi
