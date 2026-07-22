#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH='' cd -- "$(dirname "$0")" && pwd)

for pid_file in \
  "$ROOT_DIR/.fdx-native-runner.pid" \
  "$ROOT_DIR/.fdx-native-proxy.pid" \
  "$ROOT_DIR/.fdx-native-backend.pid"
do
  if [ -f "$pid_file" ]; then
    pid=$(cat "$pid_file")
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
    rm -f "$pid_file"
  fi
done
