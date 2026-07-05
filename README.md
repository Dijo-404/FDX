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
- `frontend/` - upload UI for image detection and sampled video face tracking
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

## Video tracking

Upload a browser-supported video from the Detection page. The UI samples frames,
detects faces, assigns persistent face IDs using embeddings and box overlap, and
draws smoothly interpolated tracked boxes during playback. One-frame detections
are discarded to reduce visual noise. If target faces have been added, matching
tracks use their saved names.

Long videos are automatically limited to at most 600 sampled frames. The sampling
control sets the preferred interval; the UI increases it when needed to stay under
that limit.
