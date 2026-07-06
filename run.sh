#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH='' cd -- "$(dirname "$0")" && pwd)
ML_DIR="$ROOT_DIR/face-processing/ml"
PID_FILE="$ROOT_DIR/.fdx-backend.pid"
LOG_FILE="$ROOT_DIR/.fdx-backend.log"
VENV_DIR="$ROOT_DIR/.venv"
PYTHON_BIN="$VENV_DIR/bin/python"
REQUIREMENTS="$ML_DIR/requirements-local.txt"
REQUIREMENTS_STAMP="$VENV_DIR/.fdx-requirements.cksum"

cd "$ROOT_DIR"

if [ ! -d models ]; then
  printf '%s\n' "Missing models/ directory."
  printf '%s\n' "Download the model weights from Drive and place them in ./models, then run this again."
  exit 1
fi

expected_requirements=$(cksum "$REQUIREMENTS")
installed_requirements=$(cat "$REQUIREMENTS_STAMP" 2>/dev/null || true)
if [ ! -x "$PYTHON_BIN" ] || [ "$installed_requirements" != "$expected_requirements" ]; then
  printf '%s\n' "Local detector runtime is missing or out of date."
  "$ROOT_DIR/tools/bootstrap_local.sh"
fi

if ! "$PYTHON_BIN" -c 'import cv2, flask, numpy, tensorflow' >/dev/null 2>&1; then
  printf '%s\n' "The local detector runtime is incomplete. Rebuilding it..." >&2
  "$ROOT_DIR/tools/bootstrap_local.sh"
fi

if [ -f "$PID_FILE" ]; then
  old_pid=$(cat "$PID_FILE")
  if [ -n "$old_pid" ] && kill -0 "$old_pid" 2>/dev/null; then
    kill "$old_pid" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
fi

backend_pid=""
cleanup() {
  if [ -n "$backend_pid" ] && kill -0 "$backend_pid" 2>/dev/null; then
    kill "$backend_pid" 2>/dev/null || true
    wait "$backend_pid" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

printf '%s\n' "Starting local detector backend..."
(
  cd "$ML_DIR"
  export ML_PORT=3000
  export IMG_LENGTH_LIMIT=1280
  export FACE_DETECTION_PLUGIN=facenet.FaceDetector
  export CALCULATION_PLUGIN=facenet.Calculator
  export EXTRA_PLUGINS=agegender.AgeDetector,agegender.GenderDetector
  export UWSGI_PROCESSES=1
  export UWSGI_THREADS=1
  export MODELS_ROOT="$ROOT_DIR/models"
  export PYTHONPATH="$ML_DIR:$ML_DIR/src:$ML_DIR/srcext${PYTHONPATH:+:$PYTHONPATH}"
  exec "$PYTHON_BIN" -m src.app
) >"$LOG_FILE" 2>&1 &

backend_pid=$!
printf '%s\n' "$backend_pid" > "$PID_FILE"

printf '%s\n' "Waiting for detector backend and model warm-up..."
ready=0
for _ in $(seq 1 90); do
  if ! kill -0 "$backend_pid" 2>/dev/null; then
    printf '%s\n' "Detector backend exited during startup:" >&2
    tail -40 "$LOG_FILE" >&2
    exit 1
  fi

  if "$PYTHON_BIN" - <<'PY' >/dev/null 2>&1
import urllib.request
urllib.request.urlopen("http://127.0.0.1:3000/healthcheck", timeout=2).read()
PY
  then
    ready=1
    break
  fi
  sleep 2
done

if [ "$ready" -ne 1 ]; then
  printf '%s\n' "Detector backend did not become ready. See .fdx-backend.log for details."
  tail -40 "$LOG_FILE" >&2
  exit 1
fi

printf '%s\n' "Open http://127.0.0.1:8080"
"$PYTHON_BIN" tools/detector_proxy.py
