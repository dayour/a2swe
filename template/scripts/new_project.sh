#!/bin/sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
exec node "$HERE/scripts/new_project.cjs" "$@"
