#!/usr/bin/env python3
"""Smoke-test the accurate cropped-face path with a small dark input."""

from __future__ import annotations

import io
import json

import cv2
import numpy as np

import native_accurate_backend as backend


def _make_dark_crop(image: np.ndarray) -> np.ndarray:
    detections, _ = backend._detect(image, 0.60)
    if len(detections) == 0:
        raise RuntimeError("The reference image did not produce a face")
    box = detections[0]
    padding = int(max(box[2] - box[0], box[3] - box[1]) * 0.30)
    x_min = max(0, int(box[0]) - padding)
    y_min = max(0, int(box[1]) - padding)
    x_max = min(image.shape[1], int(box[2]) + padding)
    y_max = min(image.shape[0], int(box[3]) + padding)
    crop = image[y_min:y_max, x_min:x_max]
    scale = 96 / min(crop.shape[:2])
    small = cv2.resize(
        crop,
        (round(crop.shape[1] * scale), round(crop.shape[0] * scale)),
        interpolation=cv2.INTER_AREA,
    )
    return np.clip(small.astype(np.float32) * 0.28, 0, 255).astype(np.uint8)


def _post_image(client, path: str, image: np.ndarray, name: str):
    encoded, buffer = cv2.imencode(".png", image)
    if not encoded:
        raise RuntimeError("Unable to encode test image")
    return client.post(
        path,
        data={"file": (io.BytesIO(buffer.tobytes()), name)},
        content_type="multipart/form-data",
    )


def main() -> None:
    reference = cv2.imread(str(backend.WARMUP_IMAGE), cv2.IMREAD_COLOR)
    if reference is None:
        raise RuntimeError(f"Unable to read {backend.WARMUP_IMAGE}")
    reference_detections, reference_landmarks = backend._detect(reference, 0.60)
    if len(reference_detections) == 0:
        raise RuntimeError("The reference image did not produce a face")
    reference_embedding, _ = backend._embedding(
        backend._align_face(reference, reference_landmarks[0])
    )
    dark_crop = _make_dark_crop(reference)
    response = _post_image(
        backend.app.test_client(),
        "/find_faces?face_plugins=calculator&limit=0&det_prob_threshold=0.80&input_mode=cropped",
        dark_crop,
        "dark-small-crop.png",
    )
    payload = response.get_json()
    if response.status_code != 200:
        raise RuntimeError(f"Cropped-face request failed: {payload}")
    if len(payload.get("result", [])) != 1:
        raise RuntimeError(f"Expected one cropped face: {payload}")

    face = payload["result"][0]
    embedding = np.asarray(face.get("embedding", []), dtype=np.float32)
    embedding_norm = float(face.get("embedding_norm", 0))
    quality = face.get("quality", {})
    if embedding.shape != (512,) or not np.isfinite(embedding).all():
        raise RuntimeError("AdaFace returned an invalid cropped-face embedding")
    if not np.isclose(np.linalg.norm(embedding), 1.0, atol=1e-5):
        raise RuntimeError("AdaFace embedding is not L2-normalized")
    if not np.isfinite(embedding_norm) or embedding_norm <= 0:
        raise RuntimeError("AdaFace returned an invalid feature norm")
    genuine_cosine = float(reference_embedding @ embedding)
    if genuine_cosine < 0.65:
        raise RuntimeError(
            f"Dark-crop genuine cosine {genuine_cosine:.4f} is below the low-quality gate"
        )
    if quality.get("input_mode") != "cropped" or quality.get("upscale_factor", 1) <= 1:
        raise RuntimeError(f"Cropped preprocessing did not run: {quality}")
    if len(quality.get("attempted_variants", [])) != 4:
        raise RuntimeError(f"Low-light variants did not run: {quality}")

    summary = {
        "status": "OK",
        "execution_provider": backend.ACTIVE_PROVIDER,
        "source_crop": [dark_crop.shape[1], dark_crop.shape[0]],
        "box": face["box"],
        "embedding_length": int(embedding.size),
        "embedding_l2_norm": float(np.linalg.norm(embedding)),
        "adaface_feature_norm": embedding_norm,
        "reference_dark_crop_cosine": genuine_cosine,
        "quality": quality,
    }
    print(json.dumps(summary, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
