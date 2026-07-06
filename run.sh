#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
ML_DIR="$ROOT_DIR/face-processing/ml"
PID_FILE="$ROOT_DIR/.fdx-detector.pid"
LOG_FILE="$ROOT_DIR/.fdx-detector.log"

cd "$ROOT_DIR"

if ! command -v python3 >/dev/null 2>&1; then
  printf '%s\n' "Python 3 is required to run the detector and local UI proxy."
  exit 1
fi

if [ ! -d models ]; then
  printf '%s\n' "Missing models/ directory."
  printf '%s\n' "Download the model weights from Drive and place them in ./models, then run this again."
  exit 1
fi

if [ -f "$PID_FILE" ]; then
  old_pid=$(cat "$PID_FILE")
  if [ -n "$old_pid" ] && kill -0 "$old_pid" 2>/dev/null; then
    kill "$old_pid" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
fi

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
  exec python3 -m src.app
) >"$LOG_FILE" 2>&1 &

printf '%s\n' "$!" > "$PID_FILE"

printf '%s\n' "Waiting for detector backend..."
ready=0
for _ in $(seq 1 90); do
  if python3 - <<'PY' >/dev/null 2>&1
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
  printf '%s\n' "Detector backend did not become ready. See .fdx-detector.log for details."
  exit 1
fi

printf '%s\n' "Open http://127.0.0.1:8080"
python3 tools/detector_proxy.py
