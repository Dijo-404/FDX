#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  printf '%s\n' "Docker is required to run the detector."
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  printf '%s\n' "Python 3 is required to run the local UI proxy."
  exit 1
fi

if [ ! -d models ]; then
  printf '%s\n' "Missing models/ directory."
  printf '%s\n' "Download the model weights from Drive and place them in ./models, then run this again."
  exit 1
fi

docker rm -f fdx-detector >/dev/null 2>&1 || true
docker run -d \
  --name fdx-detector \
  --restart unless-stopped \
  -p 3000:3000 \
  -e ML_PORT=3000 \
  -e IMG_LENGTH_LIMIT=1280 \
  -e FACE_DETECTION_PLUGIN=facenet.FaceDetector \
  -e CALCULATION_PLUGIN=facenet.Calculator \
  -e EXTRA_PLUGINS=agegender.AgeDetector,agegender.GenderDetector \
  -e UWSGI_PROCESSES=1 \
  -e UWSGI_THREADS=1 \
  -v "$(pwd)/models:/app/ml/.models:ro" \
  exadel/compreface-core:1.2.0 >/dev/null

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
  printf '%s\n' "Detector backend did not become ready. Run 'docker logs fdx-detector' for details."
  exit 1
fi

printf '%s\n' "Open http://127.0.0.1:8080"
python3 tools/detector_proxy.py
