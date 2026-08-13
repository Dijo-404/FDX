#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH='' cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

if [ ! -f face-processing/models/MANIFEST.sha256 ]; then
  printf '%s\n' "Missing face-processing/models/MANIFEST.sha256" >&2
  exit 1
fi

sha256sum --check face-processing/models/MANIFEST.sha256
