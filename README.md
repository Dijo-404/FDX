# FDX Detection-Only Runner

This directory contains a trimmed, no-login face detection setup.

## Setup

Install Docker and Python 3.

Download the model weights from Drive and place them in `models/`.

Expected layout:

```text
models/
  facenet/
  facemask/
  agegender/
  mtcnn/
```

## Run

```sh
./run.sh
```

Open:

```text
http://127.0.0.1:8080
```

Stop the detector container and local UI proxy:

```sh
./stop.sh
```

## Layout

- `run.sh` - starts `exadel/compreface-core:1.2.0` and the local UI
- `stop.sh` - stops the detector container and local UI proxy
- `frontend/` - small upload UI for image detection
- `tools/detector_proxy.py` - local proxy from the UI to `compreface-core`
- `models/` - local model weights from Drive, mounted into the detector container
- `face-processing/` - Python face processing source/config for inspection
- `backend/` - notes for the detection backend

## Removed

- Admin service
- API service
- Postgres service
- User accounts and login flow
- Original upstream frontend
- Container OS folders and runtime libraries
- Python caches, test folders, and sample images
