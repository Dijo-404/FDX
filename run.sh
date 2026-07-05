#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"

docker compose up -d detector

printf '%s\n' "Waiting for detector backend..."
for _ in $(seq 1 90); do
  if python3 - <<'PY' >/dev/null 2>&1
import urllib.request
urllib.request.urlopen("http://127.0.0.1:3000/healthcheck", timeout=2).read()
PY
  then
    break
  fi
  sleep 2
done

printf '%s\n' "Open http://127.0.0.1:8080"
python3 tools/detector_proxy.py
