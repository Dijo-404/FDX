#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH='' cd -- "$(dirname "$0")/.." && pwd)
VENV_DIR="$ROOT_DIR/.venv"
REQUIREMENTS="$ROOT_DIR/face-processing/ml/requirements-local.txt"
DEVICE=${FDX_DEVICE:-auto}
ORT_VERSION=1.21.1

case "$DEVICE" in
  auto|cpu|gpu|cuda) ;;
  *)
    printf '%s\n' "FDX_DEVICE must be auto, cpu, gpu, or cuda (got: $DEVICE)." >&2
    exit 1
    ;;
esac

use_gpu=false
if [ "$DEVICE" = gpu ] || [ "$DEVICE" = cuda ]; then
  use_gpu=true
elif [ "$DEVICE" = auto ] && command -v nvidia-smi >/dev/null 2>&1; then
  if nvidia-smi -L >/dev/null 2>&1; then
    use_gpu=true
  fi
fi

find_compatible_python() {
  for candidate in python3.11 python3; do
    if command -v "$candidate" >/dev/null 2>&1 \
      && "$candidate" -c 'import sys; raise SystemExit(not ((3, 10) <= sys.version_info[:2] < (3, 13)))'; then
      command -v "$candidate"
      return 0
    fi
  done
  return 1
}

if command -v uv >/dev/null 2>&1; then
  printf '%s\n' "Preparing the native Python 3.11 runtime with uv..."
  uv python install 3.11
  uv venv --clear --python 3.11 "$VENV_DIR"
  uv pip install --python "$VENV_DIR/bin/python" -r "$REQUIREMENTS"
  if [ "$use_gpu" = true ]; then
    printf '%s\n' "Installing ONNX Runtime CUDA and bundled CUDA/cuDNN libraries..."
    uv pip install --python "$VENV_DIR/bin/python" "onnxruntime-gpu[cuda,cudnn]==$ORT_VERSION"
  else
    uv pip install --python "$VENV_DIR/bin/python" "onnxruntime==$ORT_VERSION"
  fi
else
  PYTHON_BIN=$(find_compatible_python || true)
  if [ -z "$PYTHON_BIN" ]; then
    printf '%s\n' "Python 3.10-3.12 or uv is required." >&2
    printf '%s\n' "On Arch Linux: sudo pacman -S python uv" >&2
    exit 1
  fi

  printf '%s\n' "Preparing the native Python runtime..."
  "$PYTHON_BIN" -m venv --clear "$VENV_DIR"
  "$VENV_DIR/bin/python" -m pip install --upgrade pip
  "$VENV_DIR/bin/python" -m pip install -r "$REQUIREMENTS"
  if [ "$use_gpu" = true ]; then
    "$VENV_DIR/bin/python" -m pip install "onnxruntime-gpu[cuda,cudnn]==$ORT_VERSION"
  else
    "$VENV_DIR/bin/python" -m pip install "onnxruntime==$ORT_VERSION"
  fi
fi

"$VENV_DIR/bin/python" - <<'PY'
import cv2
import flask
import numpy
import onnxruntime

print(
    "Native runtime ready:",
    f"ONNX Runtime {onnxruntime.__version__},",
    f"providers={onnxruntime.get_available_providers()},",
    f"Flask {flask.__version__},",
    f"OpenCV {cv2.__version__},",
    f"NumPy {numpy.__version__}",
)
PY

runtime_kind=cpu
if [ "$use_gpu" = true ]; then
  runtime_kind=gpu
fi
{
  cksum "$REQUIREMENTS"
  printf '%s\n' "onnxruntime=$ORT_VERSION"
  printf '%s\n' "runtime=$runtime_kind"
} > "$VENV_DIR/.fdx-requirements.cksum"
