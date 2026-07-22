#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH='' cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

if [ ! -f models/MANIFEST.sha256 ]; then
  printf '%s\n' "Missing models/MANIFEST.sha256" >&2
  exit 1
fi

sha256sum --check models/MANIFEST.sha256
