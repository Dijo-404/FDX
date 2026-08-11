#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH='' cd -- "$(dirname "$0")/.." && pwd)
PYTHON_BIN=${FDX_PYTHON_BIN:-"$ROOT_DIR/.venv/bin/python"}

cd "$ROOT_DIR"

if [ ! -x "$PYTHON_BIN" ]; then
  printf '%s\n' "Missing Python runtime: $PYTHON_BIN" >&2
  printf '%s\n' "Run ./tools/bootstrap_local.sh before the production check." >&2
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' "Node.js is required for the frontend production checks." >&2
  exit 1
fi

printf '%s\n' "Checking model artifacts..."
./tools/verify_models.sh

printf '%s\n' "Checking shell and application syntax..."
sh -n run.sh stop.sh tools/bootstrap_local.sh tools/verify_models.sh
node --check frontend/app.js
"$PYTHON_BIN" - <<'PY'
from pathlib import Path

for path in (
    Path("tools/detector_proxy.py"),
    Path("tools/native_accurate_backend.py"),
    Path("tools/verify_cdc_weak_consensus.py"),
    Path("tools/verify_model_routes.py"),
    Path("tools/verify_cropped_pipeline.py"),
):
    compile(path.read_text(), str(path), "exec")
print("Python syntax: OK")
PY

printf '%s\n' "Checking identity-expansion safety gates..."
node tools/verify_identity_expansion.mjs

printf '%s\n' "Checking video upload and frame tracking..."
node tools/verify_video_tracking.mjs

if [ -n "${FDX_CDC_SCAN_FILE:-}" ]; then
  printf '%s\n' "Checking low-resolution consensus against the CDC scan..."
  "$PYTHON_BIN" tools/verify_cdc_weak_consensus.py --scan "$FDX_CDC_SCAN_FILE"
else
  printf '%s\n' "CDC regression skipped (set FDX_CDC_SCAN_FILE to a cached JSONL scan)."
fi

printf '%s\n' "Checking the native cropped-face pipeline..."
"$PYTHON_BIN" tools/verify_cropped_pipeline.py

if [ "${FDX_VERIFY_LIVE_ROUTES:-0}" = "1" ]; then
  printf '%s\n' "Checking live proxy and model routes..."
  "$PYTHON_BIN" tools/verify_model_routes.py
else
  printf '%s\n' "Live route check skipped (set FDX_VERIFY_LIVE_ROUTES=1 to require it)."
fi

printf '%s\n' "Production check: OK"
