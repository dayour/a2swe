#!/bin/zsh
set -e
HERE=$(cd "$(dirname "$0")/.." && pwd)
DEST=$1; SLUG=${2:-video}
[ -n "$DEST" ] || { echo "usage: new_project.sh <dest_dir> <slug>"; exit 1; }
[ -f "$HERE/src/config.ts" ] && [ -d "$HERE/src/common" ] || { echo "Template not found at $HERE; run this script from template/scripts/"; exit 1; }
case "$SLUG" in
  ''|*[!A-Za-z0-9_-]*) echo "Slug must use letters, numbers, hyphen, or underscore: $SLUG"; exit 1;;
esac
mkdir -p "$DEST"
rsync -a --exclude node_modules --exclude 'build*' --exclude renders --exclude fin_frames --exclude stills --exclude 'audio/cache' "$HERE/" "$DEST/"
# portable in-place edit: `-i.bak` + rm works on both BSD/macOS and GNU/Linux sed
# (BSD `sed -i ''` breaks on GNU sed, which reads '' as the script and config.ts as a file)
sed -i.bak "s/slug: 'demo'/slug: '$SLUG'/" "$DEST/src/config.ts" && rm -f "$DEST/src/config.ts.bak"
mkdir -p "$DEST/public/assets/$SLUG" "$DEST/script" "$DEST/research" "$DEST/qc" "$DEST/stills" "$DEST/renders"
cd "$DEST" && npm install --silent && npx tsc --noEmit && echo "project ready: $DEST (slug=$SLUG)"
