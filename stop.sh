#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"
docker rm -f fdx-detector >/dev/null 2>&1 || true
pkill -f "tools/detector_proxy.py" 2>/dev/null || true
