#!/bin/zsh
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd); cd "$ROOT"
SEC=${1:-30}; FROM=${2:-0}
SLUG=$(python3 -c "import re;print(re.search(r\"slug:\\s*'([^']+)'\", open('src/config.ts').read()).group(1))")
TOTAL=$(python3 -c "import re;print(re.search(r'TOTAL_FRAMES\s*=\s*(\d+)', open('src/common/timeline.ts').read()).group(1))")
A=$((FROM * 30)); B=$((A + SEC * 30 - 1))
[ $B -gt $((TOTAL - 1)) ] && B=$((TOTAL - 1))
mkdir -p renders
OUTF="renders/${SLUG}_preview_${FROM}-$((FROM + SEC))s.mp4"
BDIR=${BUILD_DIR:-build_prev_${FROM}_${SEC}}
[ ! -e "$OUTF" ] || { echo "Refusing to overwrite existing preview: $OUTF"; exit 1; }
[ "${SKIP_BUNDLE:-0}" = 1 ] && [ -d "$BDIR" ] || { [ ! -e "$BDIR" ] || { echo "Build directory exists; set SKIP_BUNDLE=1 or BUILD_DIR to preserve it: $BDIR"; exit 1; }; npx remotion bundle src/index.ts --out-dir "$BDIR" --log=error; }
npx remotion render "$BDIR" Video "$OUTF" --codec=h264 --crf=18 --frames=$A-$B --concurrency=${CONC:-6} --timeout=${RTIMEOUT:-300000} --log=error
[ -s "$OUTF" ] || { echo "PREVIEW FAILED"; exit 1; }
echo "$OUTF"
