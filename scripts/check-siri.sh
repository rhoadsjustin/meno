#!/usr/bin/env bash
# Runs the Siri verse lookup (native/siri) off-device: the reference parser
# and the lookup, against contexts built by services/siri and the bundled
# Bible database. Needs a Swift toolchain (Xcode's, or swift.org's on Linux).
#   npm run test:siri
set -euo pipefail
cd "$(dirname "$0")/.."

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

npx tsx scripts/siri-fixtures.ts "$work"
mkdir -p "$work/docs/SQLite"
cp assets/bibles/bundled.db "$work/docs/SQLite/bundled.db"

flags=()
if [[ "$(uname)" != "Darwin" ]]; then
  # Apple's SDKs ship a SQLite3 module; elsewhere, map the system header.
  mkdir -p "$work/mod"
  printf 'module SQLite3 [system] {\n  header "/usr/include/sqlite3.h"\n  link "sqlite3"\n  export *\n}\n' \
    >"$work/mod/module.modulemap"
  flags=(-I "$work/mod")
fi

# ${flags[@]+…}: macOS bash 3.2 treats an empty array as unbound under set -u.
"${SWIFTC:-swiftc}" ${flags[@]+"${flags[@]}"} -o "$work/check" \
  native/siri/ScriptureReference.swift native/siri/ScriptureLookup.swift native/siri/checks/main.swift
"$work/check" "$work"
