#!/bin/zsh
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd); cd "$ROOT"
V=${VER:-v1}
SLUG=$(python3 -c "import re;print(re.search(r\"slug:\\s*'([^']+)'\", open('src/config.ts').read()).group(1))")
mkdir -p renders
OUTF=${OUTFILE:-renders/${SLUG}-${V}.mp4}
FRAMES_DIR=${FRAMES_DIR:-fin_frames_${V}}
B=${BUILD_DIR:-build_full_${V}}
[ ! -e "$OUTF" ] || { echo "Refusing to overwrite existing render: $OUTF"; exit 1; }
[ ! -e "$FRAMES_DIR" ] || { echo "Refusing to overwrite existing frame directory: $FRAMES_DIR"; exit 1; }
[ ! -e "renders/sheet_${V}.html" ] || { echo "Refusing to overwrite existing sheet: renders/sheet_${V}.html"; exit 1; }
[ "${SKIP_BUNDLE:-0}" = 1 ] && [ -d "$B" ] || { [ ! -e "$B" ] || { echo "Build directory exists; set SKIP_BUNDLE=1 or BUILD_DIR to preserve it: $B"; exit 1; }; npx remotion bundle src/index.ts --out-dir "$B" --log=error; }
npx remotion render "$B" Video "$OUTF" --codec=h264 --crf=16 --concurrency=${CONC:-6} --timeout=${RTIMEOUT:-300000} --log=error
[ -s "$OUTF" ] || { echo "RENDER FAILED"; exit 1; }
mkdir -p "$FRAMES_DIR"
ffmpeg -v error -i "$OUTF" -q:v 4 "$FRAMES_DIR/f_%04d.jpg"
ls "$FRAMES_DIR" | wc -l > "fin_count_${V}.txt"
python3 scripts/sheet.py "$FRAMES_DIR" "renders/sheet_${V}.html" 60 || true
echo "$OUTF" > "render_${V}.done"
