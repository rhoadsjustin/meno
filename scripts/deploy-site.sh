#!/usr/bin/env bash
# Publish site/ to the orphan gh-pages branch, which GitHub Pages serves at
# https://rhoadsjustin.github.io/meno/ (Settings -> Pages -> branch gh-pages, root).
#
#   scripts/deploy-site.sh --dry-run   # list what would be published
#   scripts/deploy-site.sh             # build an orphan commit and force-push it
#
# The branch is a build artifact: every deploy replaces its history. Sources live
# in site/ (site/privacy-policy.html is a symlink to docs/ship/privacy-policy.html,
# dereferenced here). Regenerate images with scripts/site-images.py. To attach a
# custom domain later, add it to site/CNAME and point DNS at GitHub Pages.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE="${REMOTE:-origin}"
BRANCH="gh-pages"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

cp -RL "$ROOT/site/." "$STAGE/"
rm -f "$STAGE/.DS_Store"
touch "$STAGE/.nojekyll"

if [[ "${1:-}" == "--dry-run" ]]; then
  (cd "$STAGE" && find . -type f | sed 's|^\./||' | sort)
  du -sh "$STAGE" | awk '{print "total " $1}'
  exit 0
fi

URL="$(git -C "$ROOT" remote get-url "$REMOTE")"
SHA="$(git -C "$ROOT" rev-parse --short HEAD)"
NAME="$(git -C "$ROOT" config user.name)"
EMAIL="$(git -C "$ROOT" config user.email)"

cd "$STAGE"
git init -q -b "$BRANCH"
git add -A
git -c user.name="$NAME" -c user.email="$EMAIL" commit -q -m "Publish site from $SHA"
git push --force "$URL" "$BRANCH:$BRANCH"
echo "Published $SHA to $BRANCH -> https://rhoadsjustin.github.io/meno/ (Pages rebuilds in about a minute)"
