#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage:
  $0 --base-ref <git-ref> --output <patch-file> [--include <path>]...

Example:
  $0 --base-ref origin/main --output /tmp/saltire-backport.patch
USAGE
}

BASE_REF=""
OUTPUT=""
EXTRA_INCLUDES=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-ref)
      BASE_REF="${2:-}"
      shift 2
      ;;
    --output)
      OUTPUT="${2:-}"
      shift 2
      ;;
    --include)
      EXTRA_INCLUDES+=("${2:-}")
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$BASE_REF" || -z "$OUTPUT" ]]; then
  usage
  exit 1
fi

if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  echo "Base ref does not exist: $BASE_REF" >&2
  exit 1
fi

INCLUDES=(
  "src/engine"
  "src/types.ts"
  "README.md"
  "ENGINE_CONTRIBUTING.md"
  "docs/saltire-engine"
)

for p in "${EXTRA_INCLUDES[@]}"; do
  [[ -n "$p" ]] && INCLUDES+=("$p")
done

echo "Creating backport patch from $BASE_REF..."
echo "Include paths:"
printf '  - %s\n' "${INCLUDES[@]}"

TMP_PATCH="${OUTPUT}.tmp"
rm -f "$TMP_PATCH"

git format-patch --stdout "$BASE_REF"..HEAD -- "${INCLUDES[@]}" > "$TMP_PATCH"

if [[ ! -s "$TMP_PATCH" ]]; then
  echo "No include-scoped changes found between $BASE_REF and HEAD." >&2
  rm -f "$TMP_PATCH"
  exit 1
fi

DENYLIST_REGEX="diff --git a/(src/reference-game|docs/scorched-galaxy|public/assets)|diff --git b/(src/reference-game|docs/scorched-galaxy|public/assets)|from ['\"\"][./]*reference-game"
if rg -n "$DENYLIST_REGEX" "$TMP_PATCH" >/dev/null; then
  echo "Leak scan failed: patch contains game-specific references." >&2
  echo "Matched lines:" >&2
  rg -n "$DENYLIST_REGEX" "$TMP_PATCH" >&2 || true
  rm -f "$TMP_PATCH"
  exit 2
fi

mv "$TMP_PATCH" "$OUTPUT"
echo "Patch created: $OUTPUT"
echo "Dry-run summary:"
git diff --name-only "$BASE_REF"..HEAD -- "${INCLUDES[@]}"
