#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"
docker compose down
pkill -f "tools/detector_proxy.py" 2>/dev/null || true
