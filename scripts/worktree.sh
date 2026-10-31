#!/usr/bin/env bash
# Worktrees with shared dependencies, for running several sessions at once.
#
#   npm run worktree -- <name> [--base <ref>] [--branch <branch>]
#       New worktree at .claude/worktrees/<name> on a new branch (default
#       claude/<name>) cut from <ref> (default origin/main), ready to run.
#   npm run deps [-- --force]
#       Give the current checkout its node_modules (for example a worktree the
#       desktop app made). --force replaces a node_modules that is already there.
#
# How dependencies are shared: one clean `npm ci` per distinct package-lock.json
# lives in a store outside the repo (~/.cache/meno-deps/<lock hash>/). Each
# checkout gets an APFS clone of it (`cp -c`): a real node_modules folder whose
# files share disk blocks with the store until either side changes them. A clone
# of the 5.7 GB tree takes about 35 s and about 20 MB of disk.
#
# Why clones and not a symlink: `npm ci` run in a checkout with a symlinked
# node_modules empties the target folder, so one stray install would break every
# other session. A clone is that checkout's own folder, so npm, Metro, tsc and
# `npm run cleanup` treat it like any other node_modules.
#
# Also copies .env and expo-env.d.ts from the main checkout, and .expo/types as
# a starting point (`npx expo start` regenerates it).
set -euo pipefail

STORE="${MENO_DEPS_STORE:-$HOME/.cache/meno-deps}"

die() { echo "error: $*" >&2; exit 1; }
usage() { sed -n '2,/^set -euo/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//'; }

# Main checkout = first entry of `git worktree list`.
main_checkout() { git worktree list --porcelain | awk '/^worktree /{print substr($0,10); exit}'; }

# deps_key <checkout>: hash of the lockfile and any patch-package patches (a
# store entry is installed with its patches applied, so a new patch needs a new
# entry) + Node major (native binaries follow Node). With no patches the hash is
# the lockfile's alone, as before patches existed. Keep in step with
# scripts/cleanup-validation.sh.
deps_key() {
  local lock="$1/package-lock.json"
  [ -f "$lock" ] || die "no package-lock.json in $1"
  local node_major
  node_major=$(node -p 'process.versions.node.split(".")[0]')
  echo "$( { cat "$lock"; cat "$1"/patches/*.patch 2>/dev/null || true; } | shasum -a 256 | cut -c1-16)-node$node_major"
}

# ensure_store <checkout> -> prints the store dir holding a finished install.
ensure_store() {
  local src=$1 key dir lock
  key=$(deps_key "$src")
  dir="$STORE/$key"
  if [ ! -f "$dir/.ready" ]; then
    mkdir -p "$STORE"
    lock="$dir.lock"
    # One install per key across sessions; wait for another session's install.
    local waited=0
    until mkdir "$lock" 2>/dev/null; do
      [ -f "$dir/.ready" ] && break
      if [ $waited -ge 900 ]; then die "timed out waiting for $lock (remove it if no install is running)"; fi
      [ $waited -eq 0 ] && echo "==> Waiting for another session's install of $key" >&2
      sleep 5; waited=$((waited + 5))
    done
    if [ ! -f "$dir/.ready" ]; then
      trap 'rmdir "$lock" 2>/dev/null || true' EXIT
      echo "==> First checkout with this lockfile: npm ci into $dir (one time)" >&2
      rm -rf "$dir.partial"; mkdir -p "$dir.partial"
      cp "$src/package.json" "$src/package-lock.json" "$dir.partial/"
      [ -f "$src/.npmrc" ] && cp "$src/.npmrc" "$dir.partial/"
      [ -d "$src/patches" ] && cp -R "$src/patches" "$dir.partial/"
      (cd "$dir.partial" && npm ci --no-audit --no-fund >&2)
      echo "$key" > "$dir.partial/node_modules/.meno-deps-key"
      date '+%Y-%m-%d %H:%M' > "$dir.partial/.ready"
      rm -rf "$dir"; mv "$dir.partial" "$dir"
      rmdir "$lock" 2>/dev/null || true
      trap - EXIT
    fi
  fi
  touch "$dir/.ready"   # last-used time, for `npm run cleanup`
  echo "$dir"
}

# link_deps <checkout> <force>
link_deps() {
  local dest=$1 force=$2 store
  if [ -L "$dest/node_modules" ]; then
    rm "$dest/node_modules"          # an old symlink: drop the link only
  elif [ -e "$dest/node_modules" ]; then
    if [ -z "$force" ]; then
      die "$dest/node_modules already exists (pass --force to replace it with a clone)"
    fi
    echo "==> Removing the existing node_modules"
    rm -rf "$dest/node_modules"
  fi
  store=$(ensure_store "$dest")
  echo "==> Cloning node_modules from $store"
  cp -cR "$store/node_modules" "$dest/node_modules"
}

# copy_local_files <from main checkout> <to checkout>
copy_local_files() {
  local main=$1 dest=$2 f
  [ "$main" = "$dest" ] && return 0
  for f in .env expo-env.d.ts; do
    if [ -f "$main/$f" ] && [ ! -e "$dest/$f" ]; then cp "$main/$f" "$dest/$f"; echo "    copied $f"; fi
  done
  if [ -d "$main/.expo/types" ] && [ ! -e "$dest/.expo/types" ]; then
    mkdir -p "$dest/.expo"; cp -R "$main/.expo/types" "$dest/.expo/types"; echo "    copied .expo/types"
  fi
}

cmd_new() {
  local name="" base="origin/main" branch=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --base) base=${2:?--base needs a ref}; shift 2 ;;
      --branch) branch=${2:?--branch needs a name}; shift 2 ;;
      -h|--help) usage; exit 0 ;;
      -*) die "unknown option: $1" ;;
      *) [ -z "$name" ] || die "one name only"; name=$1; shift ;;
    esac
  done
  [ -n "$name" ] || { usage; exit 1; }
  [ -n "$branch" ] || branch="claude/$name"

  local main dest
  main=$(main_checkout)
  dest="$main/.claude/worktrees/$name"
  [ -e "$dest" ] && die "$dest already exists"
  git -C "$main" show-ref --verify --quiet "refs/heads/$branch" && die "branch $branch already exists"

  case "$base" in
    origin/*) git -C "$main" fetch --quiet origin "${base#origin/}" \
                || echo "    (could not fetch $base; using the local copy)" ;;
  esac
  echo "==> git worktree add $dest ($branch from $base)"
  git -C "$main" worktree add --quiet "$dest" -b "$branch" "$base"
  link_deps "$dest" ""
  copy_local_files "$main" "$dest"
  echo "==> Ready: $dest on $branch"
}

cmd_deps() {
  local force=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --force) force=1; shift ;;
      -h|--help) usage; exit 0 ;;
      *) die "unknown option: $1" ;;
    esac
  done
  local dest main
  dest=$(git rev-parse --show-toplevel)
  main=$(main_checkout)
  link_deps "$dest" "$force"
  copy_local_files "$main" "$dest"
  echo "==> node_modules ready in $dest"
}

case "${1:-}" in
  new) shift; cmd_new "$@" ;;
  deps) shift; cmd_deps "$@" ;;
  -h|--help|"") usage ;;
  *) die "unknown command: $1 (new | deps)" ;;
esac
