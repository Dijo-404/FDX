# FDX Portable Arch/NVIDIA Build

This is the isolated Docker-free FDX build. It runs RetinaFace R50 detection
and AdaFace IR101 matching directly through ONNX Runtime. The recognition path
is tuned conservatively for small, dark crops and for rejecting unknown faces.

The default `auto` mode uses an NVIDIA GPU when one is available and otherwise
falls back to the CPU. On the intended Arch Linux + RTX 3050 laptop, `/status`
should report `CUDAExecutionProvider`.

## Copy to the other laptop

Copy this directory, or extract the supplied portable ZIP. The machine-specific
`.venv/` directory is intentionally excluded and rebuilt automatically.

Required native model files:

```text
models/onnx/retinaface-r50.onnx
models/onnx/adaface-ir101-ms1mv2.onnx
```

The portable build contains only these two active models. Verify both files
after copying with:

```sh
./tools/verify_models.sh
```

## Arch Linux setup

Install `uv` and ensure the NVIDIA driver utilities work:

```sh
sudo pacman -S --needed python uv nvidia-utils
nvidia-smi
```

Start FDX:

```sh
./run.sh
```

The first run creates `.venv/` and downloads the Python, ONNX Runtime, CUDA, and
cuDNN runtime packages. CUDA and cuDNN are installed inside the Python
environment; Docker and a system CUDA toolkit are not required. The NVIDIA
driver is still required.

Open `http://127.0.0.1:8080`.

Stop it with `Ctrl+C`, or from another terminal:

```sh
./stop.sh
```

## Verify GPU use

While FDX is running:

```sh
curl -s http://127.0.0.1:8080/status
nvidia-smi
```

The status response should contain:

```json
"execution_provider": "CUDAExecutionProvider"
```

To require the GPU and fail instead of silently using the CPU:

```sh
FDX_DEVICE=gpu ./run.sh
```

To force a CPU test:

```sh
FDX_DEVICE=cpu ./run.sh
```

Verify the cropped-face pipeline with a deliberately reduced, darkened image:

```sh
FDX_DEVICE=gpu ./.venv/bin/python tools/verify_cropped_pipeline.py
```

The command fails if CUDA is unavailable, RetinaFace cannot recover the dark
crop, or AdaFace does not return a finite, normalized 512-value embedding.

Optional port and image-limit overrides:

```sh
FDX_UI_PORT=18080 FDX_ACCURATE_PORT=13000 FDX_IMG_LENGTH_LIMIT=1280 ./run.sh
```

## Runtime layout

```text
Browser UI (8080)
  -> tools/detector_proxy.py
  -> tools/native_accurate_backend.py (3000)
  -> ONNX Runtime CUDA or CPU provider
  -> RetinaFace R50 + AdaFace IR101 in models/onnx/
```

Only one native detector process is started. The legacy `/api/fast/find_faces`
route is retained as an alias to the accurate backend so stale browser assets
remain compatible. No Docker daemon, container image, TensorFlow service,
database, or external model download is used at runtime.

## Matching configuration

- Detection image limit: 1280 pixels on the longest side.
- Normal detection threshold: 0.60 from the frontend.
- Full-image target-enrollment threshold: 0.98.
- Deliberately cropped target-enrollment threshold: 0.80.
- A face must have detector confidence of at least 0.80 before it can be named.
- Good-quality identity cosine threshold: 0.60; runner-up margin: 0.10.
- Low-resolution identity cosine threshold: 0.65; runner-up margin: 0.12.
- Gallery images with the same name are fused into a feature-norm-weighted
  identity centroid. Samples below 0.35 cosine agreement with the identity
  medoid are excluded from that centroid.
- AdaFace embeddings are L2-normalized and compared directly with cosine
  similarity. Failure to clear every gate leaves the face unknown.

These are deliberately conservative starting values chosen to lower false
matches. Calibrate the cosine and margin thresholds with genuine and impostor
pairs from the actual cameras before treating the scores as operationally
validated.

AdaFace and ArcFace embeddings are not compatible. After upgrading this build,
add the target faces again; the frontend intentionally uses a new gallery key
and will not compare cached ArcFace vectors with AdaFace vectors.

## Cropped and low-light faces

Manually drawn targets use a dedicated `input_mode=cropped` path. The browser
adds 30 percent context around the selection and sends a lossless PNG. The
native backend can then upscale the crop by as much as 4x, bounded by the
1280-pixel image limit. Dark crops are detected using the original pixels,
mild gamma correction, luminance-only CLAHE, and light denoising followed by
CLAHE; the strongest centered face supplies the landmarks.

AdaFace still receives the upscaled original pixels, not the enhanced variant.
This keeps contrast processing from silently changing identity features. It
embeds the aligned face and its horizontal flip, then uses the official
feature-norm-weighted fusion method. Faces below 40 pixels on either detected
axis are not enrolled or matched, faces from 40 to 79 pixels use stricter match
gates, and faces at least 80 pixels on both axes are treated as good quality.
Deliberately cropped enrollment uses a 0.80 detection threshold; full-image
enrollment retains the stricter 0.98 threshold.

The AdaFace ONNX model was converted from the official
`adaface_ir101_ms1mv2.ckpt` checkpoint. Its output was compared with the
official PyTorch implementation on a fixed batch; maximum absolute embedding
error was below `0.0000004`. AdaFace source code is MIT licensed, while model
use must also comply with the terms applicable to its MS1MV2 training data.
See the [official AdaFace repository](https://github.com/mk-minchul/AdaFace)
and [paper](https://arxiv.org/abs/2204.00964).
