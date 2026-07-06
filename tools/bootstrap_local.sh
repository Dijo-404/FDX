#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH='' cd -- "$(dirname "$0")/.." && pwd)
VENV_DIR="$ROOT_DIR/.venv"
REQUIREMENTS="$ROOT_DIR/face-processing/ml/requirements-local.txt"

find_python38() {
  for candidate in python3.8 python3; do
    if command -v "$candidate" >/dev/null 2>&1 \
      && "$candidate" -c 'import sys; raise SystemExit(sys.version_info[:2] != (3, 8))'; then
      command -v "$candidate"
      return 0
    fi
  done
  return 1
}

if command -v uv >/dev/null 2>&1; then
  printf '%s\n' "Preparing the local Python 3.8 detector runtime with uv..."
  uv python install 3.8
  uv venv --clear --python 3.8 "$VENV_DIR"
  uv pip install --python "$VENV_DIR/bin/python" -r "$REQUIREMENTS"
else
  PYTHON38=$(find_python38 || true)
  if [ -z "$PYTHON38" ]; then
    printf '%s\n' "Python 3.8 or uv is required to create the local detector runtime." >&2
    printf '%s\n' "Install uv from https://docs.astral.sh/uv/ and run ./run.sh again." >&2
    exit 1
  fi

  printf '%s\n' "Preparing the local Python 3.8 detector runtime..."
  "$PYTHON38" -m venv --clear "$VENV_DIR"
  "$VENV_DIR/bin/python" -m pip install --upgrade pip
  "$VENV_DIR/bin/python" -m pip install -r "$REQUIREMENTS"
fi

"$VENV_DIR/bin/python" - <<'PY'
import cv2
import flask
import numpy
import tensorflow

print(
    "Local detector runtime ready:",
    f"TensorFlow {tensorflow.__version__},",
    f"Flask {flask.__version__},",
    f"OpenCV {cv2.__version__},",
    f"NumPy {numpy.__version__}",
)
PY

cksum "$REQUIREMENTS" > "$VENV_DIR/.fdx-requirements.cksum"
