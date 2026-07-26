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

Verify the browser-side identity expansion safety gates:

```sh
node tools/verify_identity_expansion.mjs
```

This fails if tracking-only samples enter a centroid, a pose cluster mixes two
faces from one photo, or matching stops preserving separate pose centroids.

Optional port and image-limit overrides:

```sh
FDX_UI_PORT=18080 FDX_ACCURATE_PORT=13000 FDX_IMG_LENGTH_LIMIT=1280 ./run.sh
```

## Production release check

Run the complete offline release gate before packaging or deployment:

```sh
./tools/production_check.sh
```

On an NVIDIA deployment, require CUDA during the check:

```sh
FDX_DEVICE=gpu ./tools/production_check.sh
```

The command verifies model checksums, shell/Python/JavaScript syntax,
identity-expansion collision guards, separate pose centroids, and real
RetinaFace/AdaFace inference through the cropped-face pipeline.

With FDX already running, also require every public proxy/model route to return
the expected RetinaFace R50 and AdaFace IR101 versions:

```sh
FDX_VERIFY_LIVE_ROUTES=1 ./tools/production_check.sh
```

An existing CDC JSONL scan can be included in the same release gate:

```sh
FDX_CDC_SCAN_FILE=/tmp/fdx-cdc-regression-20260726.jsonl \
FDX_VERIFY_LIVE_ROUTES=1 ./tools/production_check.sh
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
- A low-resolution profile can expand across the selected photo collection
  through cached pose bridges. Initial source samples require 0.68 cosine;
  each further pose requires one 0.65 bridge and independent 0.58 support
  from another image. If the ordinary expansion cannot establish two samples,
  a low-resolution-only fallback requires at least three different photos:
  each must be at least 0.59 cosine from the gallery, and every accepted pair
  must be at least 0.68 cosine. The fallback is anchored to the source face
  closest to the gallery, preventing a repeated lookalike cluster from taking
  over the profile. For an extreme rear/side view, consecutive numbered
  photos can bridge one pose change only when the face is the mutual-nearest
  position and size match, and at least two independent transitions resolve
  to the same conservatively matched face cluster. Samples below 0.80 detector
  confidence may nominate a transition but are never added to an identity
  centroid. If a reliable base cluster contains two faces from one photo, only
  the face closest to the enrolled gallery is retained; a newly bridged pose
  cluster with that collision is rejected entirely. Base and bridged poses
  retain separate centroids so a new angle cannot erase an earlier match.
  Competing enrolled identities disable the expansion.
- Accepted gallery photos linked to the same stable identity are fused into a
  feature-norm-weighted centroid. Display names do not merge different people.
  Samples below 0.35 cosine agreement with the identity medoid are excluded.
- Detection results are cached by file fingerprint plus the exact detector,
  recognition model, embedding metric, and cache schema versions. A model or
  schema change clears the old IndexedDB detection store. Every cache lookup
  first verifies the live model status, so stale entries cannot bypass a dead
  or incorrectly routed backend. Completing source expansion only rescans
  already-held face embeddings in memory; it does not restart the upload or
  rerun model inference over the collection.
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
