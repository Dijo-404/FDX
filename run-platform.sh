#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$repo_root"

if [[ ! -f face-processing/models/detection/retinaface-r50.onnx || ! -f face-processing/models/recognition/adaface-ir101-ms1mv2.onnx ]]; then
  echo "FDX model files are missing. Run ./tools/verify_models.sh for details." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example. Change all production secrets before deployment."
fi

docker compose up --build -d
docker compose ps
echo "FDX is available at http://127.0.0.1:${FDX_WEB_PORT:-8080}"
