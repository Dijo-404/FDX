# FDX Detection-Only Runner

This directory contains a trimmed, no-login face detection setup.

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

- `docker-compose.yml` - starts only `exadel/compreface-core:1.2.0`
- `frontend/` - small upload UI for image detection
- `tools/detector_proxy.py` - local proxy from the UI to `compreface-core`
- `model-weights/` - bundled model weights mounted into the detector container
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

## Included Weights

- `model-weights/facenet/calculator/20180402-114759/20180402-114759.pb`
- `model-weights/facemask/mask/inception_v3_on_mafa_kaggle123/`
- `model-weights/agegender/age/22801/`
- `model-weights/agegender/gender/21936/`
- `model-weights/mtcnn/data/mtcnn_weights.npy`
