#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH='' cd -- "$(dirname "$0")" && pwd)
ML_DIR="$ROOT_DIR/face-processing/ml"
FAST_PID_FILE="$ROOT_DIR/.fdx-fast-backend.pid"
FAST_LOG_FILE="$ROOT_DIR/.fdx-fast-backend.log"
VENV_DIR="$ROOT_DIR/.venv"
PYTHON_BIN="$VENV_DIR/bin/python"
REQUIREMENTS="$ML_DIR/requirements-local.txt"
REQUIREMENTS_STAMP="$VENV_DIR/.fdx-requirements.cksum"
UI_PORT=8080
ACCURATE_PORT=3000
FAST_PORT=3001
ACCURATE_CONTAINER=fdx-accurate-detector
LEGACY_CONTAINER=fdx-detector
ACCURATE_IMAGE=exadel/compreface-core:1.2.0-arcface-r100

cd "$ROOT_DIR"

if command -v lsof >/dev/null 2>&1; then
  ui_port_users=$(lsof -nP -iTCP:"$UI_PORT" -sTCP:LISTEN 2>/dev/null || true)
  if [ -n "$ui_port_users" ]; then
    printf '%s\n' "Port $UI_PORT is already in use. FDX needs this port for tools/detector_proxy.py." >&2
    printf '%s\n' "Stop the process below, then run ./run.sh again:" >&2
    printf '%s\n' "$ui_port_users" >&2
    exit 1
  fi
fi

if ! command -v docker >/dev/null 2>&1; then
  printf '%s\n' "Docker is required for the accurate ArcFace backend." >&2
  exit 1
fi

docker rm -f "$ACCURATE_CONTAINER" "$LEGACY_CONTAINER" >/dev/null 2>&1 || true

if command -v lsof >/dev/null 2>&1; then
  for api_port in "$ACCURATE_PORT" "$FAST_PORT"; do
    api_port_users=$(lsof -nP -iTCP:"$api_port" -sTCP:LISTEN 2>/dev/null || true)
    if [ -n "$api_port_users" ]; then
      printf '%s\n' "Port $api_port is already in use. FDX needs ports $ACCURATE_PORT and $FAST_PORT." >&2
      printf '%s\n' "$api_port_users" >&2
      exit 1
    fi
  done
fi

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

if [ -f "$FAST_PID_FILE" ]; then
  old_pid=$(cat "$FAST_PID_FILE")
  if [ -n "$old_pid" ] && kill -0 "$old_pid" 2>/dev/null; then
    kill "$old_pid" 2>/dev/null || true
  fi
  rm -f "$FAST_PID_FILE"
fi

fast_backend_pid=""
cleanup() {
  if [ -n "$fast_backend_pid" ] && kill -0 "$fast_backend_pid" 2>/dev/null; then
    kill "$fast_backend_pid" 2>/dev/null || true
    wait "$fast_backend_pid" 2>/dev/null || true
  fi
  docker rm -f "$ACCURATE_CONTAINER" >/dev/null 2>&1 || true
  rm -f "$FAST_PID_FILE"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

printf '%s\n' "Starting accurate ArcFace backend on port $ACCURATE_PORT..."
docker run --rm -d \
  --name "$ACCURATE_CONTAINER" \
  -p "127.0.0.1:$ACCURATE_PORT:3000" \
  -e ML_PORT=3000 \
  -e IMG_LENGTH_LIMIT=640 \
  -e FACE_DETECTION_PLUGIN='insightface.FaceDetector@retinaface_r50_v1' \
  -e CALCULATION_PLUGIN='insightface.Calculator@arcface-r100-msfdrop75' \
  -e EXTRA_PLUGINS=' ' \
  -e RUN_MODE=true \
  -e UWSGI_PROCESSES=1 \
  -e UWSGI_THREADS=1 \
  -v "$ROOT_DIR/models:/app/ml/.models:ro" \
  "$ACCURATE_IMAGE" >/dev/null

printf '%s\n' "Starting fast FaceNet prefilter backend on port $FAST_PORT..."
(
  cd "$ML_DIR"
  export ML_PORT="$FAST_PORT"
  export IMG_LENGTH_LIMIT=640
  export FACE_DETECTION_PLUGIN=facenet.FaceDetector
  export CALCULATION_PLUGIN=facenet.Calculator
  export EXTRA_PLUGINS=
  export UWSGI_PROCESSES=1
  export UWSGI_THREADS=1
  export MODELS_ROOT="$ROOT_DIR/models"
  export PYTHONPATH="$ML_DIR:$ML_DIR/src:$ML_DIR/srcext${PYTHONPATH:+:$PYTHONPATH}"
  exec "$PYTHON_BIN" -m src.app
) >"$FAST_LOG_FILE" 2>&1 &

fast_backend_pid=$!
printf '%s\n' "$fast_backend_pid" > "$FAST_PID_FILE"

wait_for_backend() {
  port="$1"
  name="$2"
  for _ in $(seq 1 120); do
    if [ "$name" = "fast" ] && ! kill -0 "$fast_backend_pid" 2>/dev/null; then
      printf '%s\n' "Fast backend exited during startup:" >&2
      tail -40 "$FAST_LOG_FILE" >&2
      exit 1
    fi

    if "$PYTHON_BIN" - "$port" <<'PY' >/dev/null 2>&1
import sys
import urllib.request
port = sys.argv[1]
urllib.request.urlopen(f"http://127.0.0.1:{port}/healthcheck", timeout=2).read()
PY
    then
      return 0
    fi
    sleep 2
  done
  return 1
}

printf '%s\n' "Waiting for accurate backend and model warm-up..."
if ! wait_for_backend "$ACCURATE_PORT" accurate; then
  printf '%s\n' "Accurate backend did not become ready. Recent container logs:" >&2
  docker logs --tail 80 "$ACCURATE_CONTAINER" >&2 || true
  exit 1
fi

printf '%s\n' "Waiting for fast backend and model warm-up..."
if ! wait_for_backend "$FAST_PORT" fast; then
  printf '%s\n' "Fast backend did not become ready. See .fdx-fast-backend.log for details."
  tail -40 "$FAST_LOG_FILE" >&2
  exit 1
fi

printf '%s\n' "Open http://127.0.0.1:8080"
"$PYTHON_BIN" tools/detector_proxy.py
