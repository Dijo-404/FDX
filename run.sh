#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH='' cd -- "$(dirname "$0")" && pwd)
VENV_DIR="$ROOT_DIR/.venv"
PYTHON_BIN="$VENV_DIR/bin/python"
REQUIREMENTS="$ROOT_DIR/face-processing/ml/requirements-local.txt"
REQUIREMENTS_STAMP="$VENV_DIR/.fdx-requirements.cksum"
BACKEND_PID_FILE="$ROOT_DIR/.fdx-native-backend.pid"
PROXY_PID_FILE="$ROOT_DIR/.fdx-native-proxy.pid"
RUNNER_PID_FILE="$ROOT_DIR/.fdx-native-runner.pid"
BACKEND_LOG_FILE="$ROOT_DIR/.fdx-native-backend.log"
UI_PORT=${FDX_UI_PORT:-8080}
ACCURATE_PORT=${FDX_ACCURATE_PORT:-3000}
IMAGE_LENGTH_LIMIT=${FDX_IMG_LENGTH_LIMIT:-1280}
DEVICE=${FDX_DEVICE:-auto}

cd "$ROOT_DIR"

for model_path in \
  models/onnx/retinaface-r50.onnx \
  models/onnx/adaface-ir101-ms1mv2.onnx
do
  if [ ! -s "$model_path" ]; then
    printf '%s\n' "Missing native model: $model_path" >&2
    printf '%s\n' "Copy the complete portable-arch-gpu/models folder, then try again." >&2
    exit 1
  fi
done

if command -v lsof >/dev/null 2>&1; then
  for port in "$UI_PORT" "$ACCURATE_PORT"; do
    port_users=$(lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
    if [ -n "$port_users" ]; then
      printf '%s\n' "Port $port is already in use:" >&2
      printf '%s\n' "$port_users" >&2
      exit 1
    fi
  done
fi

expected_stamp=$(
  cksum "$REQUIREMENTS"
  printf '%s\n' "onnxruntime=1.21.1"
  case "$DEVICE" in
    gpu|cuda) printf '%s\n' "runtime=gpu" ;;
    cpu) printf '%s\n' "runtime=cpu" ;;
    *)
      if command -v nvidia-smi >/dev/null 2>&1 && nvidia-smi -L >/dev/null 2>&1; then
        printf '%s\n' "runtime=gpu"
      else
        printf '%s\n' "runtime=cpu"
      fi
      ;;
  esac
)
installed_stamp=$(cat "$REQUIREMENTS_STAMP" 2>/dev/null || true)
if [ ! -x "$PYTHON_BIN" ] || [ "$installed_stamp" != "$expected_stamp" ]; then
  "$ROOT_DIR/tools/bootstrap_local.sh"
fi

if ! "$PYTHON_BIN" -c 'import cv2, flask, numpy, onnxruntime' >/dev/null 2>&1; then
  printf '%s\n' "The native runtime is incomplete. Rebuilding it..." >&2
  "$ROOT_DIR/tools/bootstrap_local.sh"
fi

stop_pid_file() {
  pid_file="$1"
  if [ -f "$pid_file" ]; then
    old_pid=$(cat "$pid_file")
    if [ -n "$old_pid" ] && kill -0 "$old_pid" 2>/dev/null; then
      kill "$old_pid" 2>/dev/null || true
    fi
    rm -f "$pid_file"
  fi
}

stop_pid_file "$BACKEND_PID_FILE"
stop_pid_file "$PROXY_PID_FILE"

backend_pid=""
proxy_pid=""
cleanup() {
  if [ -n "$proxy_pid" ] && kill -0 "$proxy_pid" 2>/dev/null; then
    kill "$proxy_pid" 2>/dev/null || true
    wait "$proxy_pid" 2>/dev/null || true
  fi
  if [ -n "$backend_pid" ] && kill -0 "$backend_pid" 2>/dev/null; then
    kill "$backend_pid" 2>/dev/null || true
    wait "$backend_pid" 2>/dev/null || true
  fi
  rm -f "$BACKEND_PID_FILE" "$PROXY_PID_FILE" "$RUNNER_PID_FILE"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

printf '%s\n' "$$" > "$RUNNER_PID_FILE"
printf '%s\n' "Starting native RetinaFace R50 + AdaFace IR101 backend on port $ACCURATE_PORT..."
(
  export ML_PORT="$ACCURATE_PORT"
  export IMG_LENGTH_LIMIT="$IMAGE_LENGTH_LIMIT"
  export MODELS_ROOT="$ROOT_DIR/models"
  export FDX_DEVICE="$DEVICE"
  export GPU_IDX="${FDX_GPU_INDEX:-0}"
  exec "$PYTHON_BIN" "$ROOT_DIR/tools/native_accurate_backend.py"
) >"$BACKEND_LOG_FILE" 2>&1 &
backend_pid=$!
printf '%s\n' "$backend_pid" > "$BACKEND_PID_FILE"

wait_for_backend() {
  for _ in $(seq 1 180); do
    if ! kill -0 "$backend_pid" 2>/dev/null; then
      printf '%s\n' "Native backend exited during startup:" >&2
      tail -80 "$BACKEND_LOG_FILE" >&2
      exit 1
    fi
    if "$PYTHON_BIN" - "$ACCURATE_PORT" <<'PY' >/dev/null 2>&1
import sys
import urllib.request
urllib.request.urlopen(f"http://127.0.0.1:{sys.argv[1]}/healthcheck", timeout=2).read()
PY
    then
      return 0
    fi
    sleep 2
  done
  return 1
}

printf '%s\n' "Waiting for native backend and model warm-up..."
if ! wait_for_backend; then
  printf '%s\n' "Native backend did not become ready:" >&2
  tail -80 "$BACKEND_LOG_FILE" >&2
  exit 1
fi

provider=$("$PYTHON_BIN" - "$ACCURATE_PORT" <<'PY'
import json
import sys
import urllib.request
payload = json.load(urllib.request.urlopen(f"http://127.0.0.1:{sys.argv[1]}/status", timeout=5))
print(payload.get("execution_provider", "unknown"))
PY
)
printf '%s\n' "Backend ready with $provider."
printf '%s\n' "Open http://127.0.0.1:$UI_PORT"
FDX_UI_PORT="$UI_PORT" \
FDX_ACCURATE_CORE_URL="http://127.0.0.1:$ACCURATE_PORT" \
  "$PYTHON_BIN" "$ROOT_DIR/tools/detector_proxy.py" &
proxy_pid=$!
printf '%s\n' "$proxy_pid" > "$PROXY_PID_FILE"
wait "$proxy_pid"
