#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH='' cd -- "$(dirname "$0")" && pwd)
FAST_PID_FILE="$ROOT_DIR/.fdx-fast-backend.pid"
LEGACY_PID_FILE="$ROOT_DIR/.fdx-backend.pid"
ACCURATE_CONTAINER=fdx-accurate-detector
LEGACY_CONTAINER=fdx-detector

for pid_file in "$FAST_PID_FILE" "$LEGACY_PID_FILE"; do
  if [ -f "$pid_file" ]; then
    pid=$(cat "$pid_file")
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
    rm -f "$pid_file"
  fi
done

pkill -f "tools/detector_proxy.py" 2>/dev/null || true

if command -v docker >/dev/null 2>&1; then
  docker rm -f "$ACCURATE_CONTAINER" "$LEGACY_CONTAINER" >/dev/null 2>&1 || true
fi
