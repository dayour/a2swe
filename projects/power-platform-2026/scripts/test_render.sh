#!/bin/zsh
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd); cd "$ROOT"
COMP=$1; A=$2; TAG=${3:-$COMP}; B=build_dev_$TAG
[ -n "$COMP" ] && [ -n "$A" ] || { echo "usage: test_render.sh <Comp> <start_frame> [tag]"; exit 1; }
[ -d "$B" ] || npx remotion bundle src/index.ts --out-dir "$B" --log=error
OUT=$(mktemp -d "${TMPDIR:-/tmp}/a2swe_test_${TAG}_XXXXXX")
time npx remotion render "$B" "$COMP" "$OUT" --sequence --image-format=jpeg --frames=$((A-1))-$((A+28)) --log=error
ls "$OUT" | wc -l
echo "$OUT"
