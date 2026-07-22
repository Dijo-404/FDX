#!/usr/bin/env python3
"""Docker-free RetinaFace R50 + AdaFace IR101 HTTP backend.

The response format intentionally matches the CompreFace face-processing API
used by the existing browser frontend.
"""

from __future__ import annotations

import os
import threading
import time
from functools import lru_cache
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort
from flask import Flask, jsonify, request


ROOT = Path(__file__).resolve().parents[1]
MODEL_ROOT = Path(os.environ.get("MODELS_ROOT", ROOT / "models"))
DETECTOR_MODEL = MODEL_ROOT / "onnx" / "retinaface-r50.onnx"
CALCULATOR_MODEL = MODEL_ROOT / "onnx" / "adaface-ir101-ms1mv2.onnx"
WARMUP_IMAGE = ROOT / "face-processing" / "ml" / "assets" / "warmup" / "einstein.jpeg"
PORT = int(os.environ.get("ML_PORT", "3000"))
IMAGE_LENGTH_LIMIT = int(os.environ.get("IMG_LENGTH_LIMIT", "1280"))
DEVICE = os.environ.get("FDX_DEVICE", "auto").strip().lower()
GPU_INDEX = int(os.environ.get("GPU_IDX", "0"))
NMS_THRESHOLD = 0.4
DEFAULT_DETECTION_THRESHOLD = 0.8
CROPPED_MIN_SIDE = 320
CROPPED_MAX_UPSCALE = 4.0
CROPPED_DARK_BRIGHTNESS = 120.0
CROPPED_LOW_CONTRAST = 36.0
DETECTOR_VERSION = "insightface.FaceDetector@retinaface_r50_v1"
CALCULATOR_VERSION = "adaface.Calculator@ir101-ms1mv2"
INFERENCE_LOCK = threading.Lock()

ARCFACE_TEMPLATE = np.array(
    [
        [38.2946, 51.6963],
        [73.5318, 51.5014],
        [56.0252, 71.7366],
        [41.5493, 92.3655],
        [70.7299, 92.2041],
    ],
    dtype=np.float32,
)


def _preload_nvidia_libraries() -> None:
    if (
        DEVICE == "cpu"
        or "CUDAExecutionProvider" not in ort.get_available_providers()
        or not hasattr(ort, "preload_dlls")
    ):
        return
    try:
        # The GPU bootstrap installs CUDA and cuDNN wheels beside ORT. Loading
        # from site-packages avoids depending on Arch's system CUDA version.
        ort.preload_dlls(directory="")
    except Exception as exc:  # ORT can still try the system libraries.
        print(f"CUDA library preload warning: {exc}", flush=True)


def _provider_order():
    available = ort.get_available_providers()
    wants_gpu = DEVICE in {"auto", "gpu", "cuda"}
    if wants_gpu and "CUDAExecutionProvider" in available:
        return [
            (
                "CUDAExecutionProvider",
                {
                    "device_id": GPU_INDEX,
                    "cudnn_conv_algo_search": "HEURISTIC",
                    "do_copy_in_default_stream": "1",
                },
            ),
            "CPUExecutionProvider",
        ]
    if DEVICE in {"gpu", "cuda"}:
        raise RuntimeError(
            "FDX_DEVICE=gpu was requested, but ONNX Runtime has no CUDA provider. "
            "Run tools/bootstrap_local.sh again on the NVIDIA laptop."
        )
    return ["CPUExecutionProvider"]


def _create_session(model_path: Path, providers):
    if not model_path.is_file():
        raise FileNotFoundError(f"Missing model: {model_path}")
    options = ort.SessionOptions()
    options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    return ort.InferenceSession(str(model_path), sess_options=options, providers=providers)


_preload_nvidia_libraries()
REQUESTED_PROVIDERS = _provider_order()
DETECTOR_SESSION = _create_session(DETECTOR_MODEL, REQUESTED_PROVIDERS)
CALCULATOR_SESSION = _create_session(CALCULATOR_MODEL, REQUESTED_PROVIDERS)
ACTIVE_PROVIDER = DETECTOR_SESSION.get_providers()[0]

if DEVICE in {"gpu", "cuda"} and ACTIVE_PROVIDER != "CUDAExecutionProvider":
    raise RuntimeError(
        "CUDA was explicitly requested, but the detector session fell back to CPU. "
        "Check the NVIDIA driver and rerun tools/bootstrap_local.sh."
    )


def _generate_anchors(base_size: int, scales) -> np.ndarray:
    base_anchor = np.array([0, 0, base_size - 1, base_size - 1], dtype=np.float32)
    width = base_anchor[2] - base_anchor[0] + 1
    height = base_anchor[3] - base_anchor[1] + 1
    x_center = base_anchor[0] + 0.5 * (width - 1)
    y_center = base_anchor[1] + 0.5 * (height - 1)
    widths = width * np.asarray(scales, dtype=np.float32)
    heights = height * np.asarray(scales, dtype=np.float32)
    return np.column_stack(
        (
            x_center - 0.5 * (widths - 1),
            y_center - 0.5 * (heights - 1),
            x_center + 0.5 * (widths - 1),
            y_center + 0.5 * (heights - 1),
        )
    ).astype(np.float32)


BASE_ANCHORS = {
    32: _generate_anchors(16, (32, 16)),
    16: _generate_anchors(16, (8, 4)),
    8: _generate_anchors(16, (2, 1)),
}


@lru_cache(maxsize=100)
def _anchors_for_plane(height: int, width: int, stride: int) -> np.ndarray:
    shift_x, shift_y = np.meshgrid(
        np.arange(width, dtype=np.float32) * stride,
        np.arange(height, dtype=np.float32) * stride,
    )
    shifts = np.stack((shift_x, shift_y, shift_x, shift_y), axis=-1)
    return (shifts[:, :, None, :] + BASE_ANCHORS[stride][None, None, :, :]).reshape(-1, 4)


def _bbox_predict(boxes: np.ndarray, deltas: np.ndarray) -> np.ndarray:
    widths = boxes[:, 2] - boxes[:, 0] + 1.0
    heights = boxes[:, 3] - boxes[:, 1] + 1.0
    center_x = boxes[:, 0] + 0.5 * (widths - 1.0)
    center_y = boxes[:, 1] + 0.5 * (heights - 1.0)
    predicted_center_x = deltas[:, 0] * widths + center_x
    predicted_center_y = deltas[:, 1] * heights + center_y
    predicted_width = np.exp(deltas[:, 2]) * widths
    predicted_height = np.exp(deltas[:, 3]) * heights
    return np.column_stack(
        (
            predicted_center_x - 0.5 * (predicted_width - 1.0),
            predicted_center_y - 0.5 * (predicted_height - 1.0),
            predicted_center_x + 0.5 * (predicted_width - 1.0),
            predicted_center_y + 0.5 * (predicted_height - 1.0),
        )
    )


def _landmark_predict(boxes: np.ndarray, deltas: np.ndarray) -> np.ndarray:
    widths = boxes[:, 2] - boxes[:, 0] + 1.0
    heights = boxes[:, 3] - boxes[:, 1] + 1.0
    center_x = boxes[:, 0] + 0.5 * (widths - 1.0)
    center_y = boxes[:, 1] + 0.5 * (heights - 1.0)
    predicted = deltas.copy()
    predicted[:, :, 0] = deltas[:, :, 0] * widths[:, None] + center_x[:, None]
    predicted[:, :, 1] = deltas[:, :, 1] * heights[:, None] + center_y[:, None]
    return predicted


def _nms(boxes: np.ndarray, threshold: float) -> list[int]:
    if boxes.size == 0:
        return []
    x1, y1, x2, y2, scores = boxes.T
    areas = (x2 - x1 + 1) * (y2 - y1 + 1)
    order = scores.argsort()[::-1]
    keep = []
    while order.size:
        index = int(order[0])
        keep.append(index)
        xx1 = np.maximum(x1[index], x1[order[1:]])
        yy1 = np.maximum(y1[index], y1[order[1:]])
        xx2 = np.minimum(x2[index], x2[order[1:]])
        yy2 = np.minimum(y2[index], y2[order[1:]])
        width = np.maximum(0.0, xx2 - xx1 + 1)
        height = np.maximum(0.0, yy2 - yy1 + 1)
        overlap = (width * height) / (areas[index] + areas[order[1:]] - width * height)
        order = order[np.where(overlap <= threshold)[0] + 1]
    return keep


def _downscale(image: np.ndarray):
    height, width = image.shape[:2]
    longest = max(height, width)
    if longest <= IMAGE_LENGTH_LIMIT:
        return image, 1.0
    scale = IMAGE_LENGTH_LIMIT / float(longest)
    resized = cv2.resize(
        image,
        (max(1, round(width * scale)), max(1, round(height * scale))),
        interpolation=cv2.INTER_AREA,
    )
    return resized, scale


def _detect(image: np.ndarray, threshold: float):
    resized, scale = _downscale(image)
    input_tensor = np.transpose(resized, (2, 0, 1))[None].astype(np.float32, copy=False)
    outputs = DETECTOR_SESSION.run(None, {DETECTOR_SESSION.get_inputs()[0].name: input_tensor})

    proposal_groups = []
    score_groups = []
    landmark_groups = []
    for level, stride in enumerate((32, 16, 8)):
        scores = outputs[level * 3]
        bbox_deltas = outputs[level * 3 + 1]
        landmark_deltas = outputs[level * 3 + 2]
        anchor_count = BASE_ANCHORS[stride].shape[0]
        scores = scores[:, anchor_count:, :, :]
        height, width = bbox_deltas.shape[2:]
        anchors = _anchors_for_plane(height, width, stride)

        scores = scores.transpose(0, 2, 3, 1).reshape(-1, 1)
        bbox_deltas = bbox_deltas.transpose(0, 2, 3, 1).reshape(-1, 4)
        proposals = _bbox_predict(anchors, bbox_deltas)
        selected = np.where(scores.ravel() >= threshold)[0]
        proposal_groups.append(proposals[selected] / scale)
        score_groups.append(scores[selected])

        landmark_deltas = landmark_deltas.transpose(0, 2, 3, 1).reshape(-1, 5, 2)
        landmarks = _landmark_predict(anchors, landmark_deltas)
        landmark_groups.append(landmarks[selected] / scale)

    proposals = np.vstack(proposal_groups)
    if proposals.shape[0] == 0:
        return np.zeros((0, 5), dtype=np.float32), np.zeros((0, 5, 2), dtype=np.float32)

    scores = np.vstack(score_groups)
    landmarks = np.vstack(landmark_groups).astype(np.float32, copy=False)
    order = scores.ravel().argsort()[::-1]
    proposals = proposals[order]
    scores = scores[order]
    landmarks = landmarks[order]
    detections = np.hstack((proposals[:, :4], scores)).astype(np.float32, copy=False)
    keep = _nms(detections, NMS_THRESHOLD)
    return detections[keep], landmarks[keep]


def _luminance_stats(image: np.ndarray) -> tuple[float, float]:
    luminance = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)[:, :, 0]
    return float(luminance.mean()), float(luminance.std())


def _gamma_brighten(image: np.ndarray, brightness: float) -> np.ndarray:
    # Aim for a moderate luminance rather than flattening highlights. The
    # bounded gamma keeps this as a detection aid, not a restorative edit.
    normalized_brightness = np.clip(brightness / 255.0, 0.02, 0.98)
    gamma = float(np.clip(np.log(0.56) / np.log(normalized_brightness), 0.45, 0.90))
    lookup = np.array(
        [((value / 255.0) ** gamma) * 255.0 for value in range(256)],
        dtype=np.uint8,
    )
    return cv2.LUT(image, lookup)


def _clahe_luminance(image: np.ndarray) -> np.ndarray:
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    luminance, channel_a, channel_b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = cv2.merge((clahe.apply(luminance), channel_a, channel_b))
    return cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)


def _cropped_detection_variants(image: np.ndarray):
    brightness, contrast = _luminance_stats(image)
    yield "original", image

    if brightness < CROPPED_DARK_BRIGHTNESS:
        yield "gamma", _gamma_brighten(image, brightness)
        yield "clahe", _clahe_luminance(image)
        # A small bilateral pass reduces amplified chroma/luminance noise
        # without inventing new facial structure.
        denoised = cv2.bilateralFilter(image, 5, 20, 20)
        yield "denoise_clahe", _clahe_luminance(denoised)
    elif contrast < CROPPED_LOW_CONTRAST:
        yield "clahe", _clahe_luminance(image)


def _upscale_cropped_image(image: np.ndarray) -> tuple[np.ndarray, float]:
    height, width = image.shape[:2]
    shortest = max(1, min(height, width))
    longest = max(height, width)
    desired_scale = CROPPED_MIN_SIDE / float(shortest)
    limit_scale = IMAGE_LENGTH_LIMIT / float(max(1, longest))
    scale = max(1.0, min(desired_scale, CROPPED_MAX_UPSCALE, limit_scale))
    if scale <= 1.0:
        return image, 1.0
    resized = cv2.resize(
        image,
        (max(1, round(width * scale)), max(1, round(height * scale))),
        interpolation=cv2.INTER_LANCZOS4,
    )
    return resized, scale


def _cropped_candidate_score(detection: np.ndarray, image_shape) -> float:
    height, width = image_shape[:2]
    box_width = max(0.0, float(detection[2] - detection[0]))
    box_height = max(0.0, float(detection[3] - detection[1]))
    area_fraction = (box_width * box_height) / float(max(1, width * height))
    center_x = (float(detection[0]) + float(detection[2])) / 2.0
    center_y = (float(detection[1]) + float(detection[3])) / 2.0
    center_distance = np.hypot(
        (center_x - width / 2.0) / max(1.0, width / 2.0),
        (center_y - height / 2.0) / max(1.0, height / 2.0),
    )
    return float(detection[4]) + 0.08 * min(1.0, np.sqrt(area_fraction)) - 0.04 * center_distance


def _detect_cropped(image: np.ndarray, threshold: float):
    working_image, source_scale = _upscale_cropped_image(image)
    brightness, contrast = _luminance_stats(image)
    attempted_variants = []
    best = None

    for variant_name, variant_image in _cropped_detection_variants(working_image):
        attempted_variants.append(variant_name)
        detections, landmarks = _detect(variant_image, threshold)
        for index, detection in enumerate(detections):
            score = _cropped_candidate_score(detection, working_image.shape)
            if best is None or score > best[0]:
                best = (score, detection.copy(), landmarks[index].copy(), variant_name)

    metadata = {
        "input_mode": "cropped",
        "brightness": round(brightness, 2),
        "contrast": round(contrast, 2),
        "upscale_factor": round(source_scale, 4),
        "attempted_variants": attempted_variants,
        "selected_variant": best[3] if best is not None else None,
    }
    if best is None:
        return (
            np.zeros((0, 5), dtype=np.float32),
            np.zeros((0, 5, 2), dtype=np.float32),
            working_image,
            source_scale,
            metadata,
        )
    return (
        best[1][None, :],
        best[2][None, :, :],
        working_image,
        source_scale,
        metadata,
    )


def _similarity_transform(source: np.ndarray, destination: np.ndarray) -> np.ndarray:
    """Least-squares 2D similarity transform compatible with scikit-image."""
    source = source.astype(np.float64)
    destination = destination.astype(np.float64)
    source_mean = source.mean(axis=0)
    destination_mean = destination.mean(axis=0)
    source_centered = source - source_mean
    destination_centered = destination - destination_mean
    covariance = destination_centered.T @ source_centered / source.shape[0]
    u, singular_values, vh = np.linalg.svd(covariance)
    signs = np.ones(2)
    if np.linalg.det(covariance) < 0:
        signs[-1] = -1
    rotation = u @ np.diag(signs) @ vh
    variance = np.sum(source_centered**2) / source.shape[0]
    scale = float(np.sum(singular_values * signs) / variance)
    matrix = np.empty((2, 3), dtype=np.float64)
    matrix[:, :2] = scale * rotation
    matrix[:, 2] = destination_mean - scale * rotation @ source_mean
    return matrix.astype(np.float32)


def _align_face(image: np.ndarray, landmarks: np.ndarray) -> np.ndarray:
    matrix = _similarity_transform(landmarks, ARCFACE_TEMPLATE)
    return cv2.warpAffine(image, matrix, (112, 112), borderValue=0.0)


def _embedding(face: np.ndarray) -> tuple[np.ndarray, float]:
    """Return the official AdaFace flip-fused embedding and its mean feature norm."""
    input_tensor = np.transpose(face, (2, 0, 1))[None].astype(np.float32, copy=False)
    input_tensor = input_tensor / 127.5 - 1.0
    flip_tensor = input_tensor[:, :, :, ::-1].copy()
    batch = np.concatenate((input_tensor, flip_tensor), axis=0)
    embeddings, norms = CALCULATOR_SESSION.run(
        None, {CALCULATOR_SESSION.get_inputs()[0].name: batch}
    )
    norms = np.asarray(norms, dtype=np.float32).reshape(-1, 1)
    weights = norms / max(float(norms.sum()), np.finfo(np.float32).eps)
    fused = np.sum(np.asarray(embeddings, dtype=np.float32) * weights, axis=0)
    fused_norm = float(np.linalg.norm(fused))
    if not np.isfinite(fused_norm) or fused_norm <= 0:
        raise RuntimeError("AdaFace returned an invalid embedding")
    return fused / fused_norm, float(norms.mean())


def _read_uploaded_image() -> np.ndarray:
    uploaded = request.files.get("file")
    if uploaded is None:
        raise ValueError("No file was attached")
    encoded = np.frombuffer(uploaded.read(), dtype=np.uint8)
    image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Image has incorrect format or is broken")
    return image


def _plugin_names() -> set[str]:
    return {name.strip() for name in request.args.get("face_plugins", "").split(",") if name.strip()}


app = Flask("fdx-native-accurate-backend")


@app.get("/healthcheck")
def healthcheck():
    return jsonify(status="OK", execution_provider=ACTIVE_PROVIDER)


@app.get("/status")
def status():
    return jsonify(
        status="OK",
        build_version="native-onnx",
        calculator_version=CALCULATOR_VERSION,
        similarity_metric="cosine",
        available_plugins={"detector": DETECTOR_VERSION, "calculator": CALCULATOR_VERSION},
        execution_provider=ACTIVE_PROVIDER,
        image_length_limit=IMAGE_LENGTH_LIMIT,
        recognition={
            "embedding_size": 512,
            "input_size": [112, 112],
            "color_order": "BGR",
            "normalization": "pixel / 127.5 - 1",
            "flip_test": True,
            "fusion": "feature-norm-weighted average",
        },
        cropped_face_preprocessing={
            "min_side": CROPPED_MIN_SIDE,
            "max_upscale": CROPPED_MAX_UPSCALE,
            "dark_brightness": CROPPED_DARK_BRIGHTNESS,
            "low_contrast": CROPPED_LOW_CONTRAST,
            "embedding_source": "original",
        },
    )


@app.post("/find_faces")
def find_faces():
    try:
        image = _read_uploaded_image()
        threshold = float(request.args.get("det_prob_threshold", DEFAULT_DETECTION_THRESHOLD))
        if not 0 <= threshold <= 1:
            raise ValueError("Detection threshold must be between 0 and 1")
        input_mode = request.args.get("input_mode", "standard").strip().lower()
        if input_mode not in {"standard", "cropped"}:
            raise ValueError("input_mode must be standard or cropped")
        requested_plugins = _plugin_names()
        with INFERENCE_LOCK:
            started = time.perf_counter()
            if input_mode == "cropped":
                detections, landmarks, embedding_image, coordinate_scale, preprocessing = (
                    _detect_cropped(image, threshold)
                )
            else:
                detections, landmarks = _detect(image, threshold)
                embedding_image = image
                coordinate_scale = 1.0
                preprocessing = None
            detector_ms = int((time.perf_counter() - started) * 1000)
            if len(detections) == 0:
                return jsonify(message="No face is found in the given image"), 400

            order = np.argsort(
                -((detections[:, 2] - detections[:, 0]) * (detections[:, 3] - detections[:, 1]))
            )
            results = []
            for index in order:
                detection = detections[index]
                source_detection = detection.copy()
                source_detection[:4] /= coordinate_scale
                x_min = max(0, int(source_detection[0]))
                y_min = max(0, int(source_detection[1]))
                x_max = min(image.shape[1], int(source_detection[2]))
                y_max = min(image.shape[0], int(source_detection[3]))
                face_result = {
                    "box": {
                        "x_min": x_min,
                        "y_min": y_min,
                        "x_max": x_max,
                        "y_max": y_max,
                        "probability": float(detection[4]),
                    },
                    "execution_time": {"detector": detector_ms // len(detections)},
                }
                if preprocessing is not None:
                    face_result["quality"] = {
                        **preprocessing,
                        "source_face_width": round(
                            max(0.0, float(source_detection[2] - source_detection[0])), 2
                        ),
                        "source_face_height": round(
                            max(0.0, float(source_detection[3] - source_detection[1])), 2
                        ),
                    }
                if "calculator" in requested_plugins:
                    calculator_started = time.perf_counter()
                    embedding, embedding_norm = _embedding(
                        _align_face(embedding_image, landmarks[index])
                    )
                    face_result["embedding"] = embedding.astype(float).tolist()
                    face_result["embedding_norm"] = embedding_norm
                    face_result["execution_time"]["calculator"] = int(
                        (time.perf_counter() - calculator_started) * 1000
                    )
                results.append(face_result)

        plugins = {"detector": DETECTOR_VERSION}
        if "calculator" in requested_plugins:
            plugins["calculator"] = CALCULATOR_VERSION
        limit = int(request.args.get("limit", "0") or 0)
        if limit > 0:
            results = results[:limit]
        return jsonify(plugins_versions=plugins, result=results)
    except ValueError as exc:
        return jsonify(message=f"400 Bad Request: {exc}"), 400
    except Exception as exc:
        app.logger.exception("Face processing failed")
        return jsonify(message=f"Face processing failed: {exc}"), 500


def _warm_up() -> None:
    image = cv2.imread(str(WARMUP_IMAGE), cv2.IMREAD_COLOR)
    if image is None:
        raise RuntimeError(f"Unable to read warm-up image: {WARMUP_IMAGE}")
    detections, landmarks = _detect(image, 0.6)
    if len(detections) == 0:
        raise RuntimeError("RetinaFace warm-up did not detect the test face")
    embedding, embedding_norm = _embedding(_align_face(image, landmarks[0]))
    if embedding.shape != (512,) or not np.isfinite(embedding).all():
        raise RuntimeError("AdaFace warm-up returned an invalid embedding")
    if not np.isfinite(embedding_norm) or embedding_norm <= 0:
        raise RuntimeError("AdaFace warm-up returned an invalid feature norm")
    print(
        f"Native backend ready: {DETECTOR_VERSION}, {CALCULATOR_VERSION}, "
        f"provider={ACTIVE_PROVIDER}, image_limit={IMAGE_LENGTH_LIMIT}",
        flush=True,
    )


if __name__ == "__main__":
    _warm_up()
    app.run(host="127.0.0.1", port=PORT, debug=False, threaded=False)
