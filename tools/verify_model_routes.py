#!/usr/bin/env python3
"""Verify that every public detector route reaches RetinaFace R50 + AdaFace IR101."""

from __future__ import annotations

import argparse
import json
import math
import mimetypes
import os
import uuid
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BASE_URL = os.environ.get("FDX_PROXY_URL", "http://127.0.0.1:8080")
EXPECTED_DETECTOR = "insightface.FaceDetector@retinaface_r50_v1"
EXPECTED_CALCULATOR = "adaface.Calculator@ir101-ms1mv2"
REFERENCE_IMAGE = (
    ROOT / "face-processing" / "ml" / "assets" / "warmup" / "einstein.jpeg"
)
STATUS_ROUTES = ("/status", "/accurate/status", "/fast/status")
FIND_ROUTES = (
    "/api/find_faces",
    "/api/accurate/find_faces",
    "/api/fast/find_faces",
)


def read_json(request: Request, timeout: float = 30) -> tuple[int, dict]:
    try:
        with urlopen(request, timeout=timeout) as response:
            return response.status, json.load(response)
    except HTTPError as exc:
        try:
            payload = json.loads(exc.read())
        except Exception:
            payload = {"message": f"HTTP {exc.code}"}
        return exc.code, payload
    except URLError as exc:
        raise RuntimeError(f"Detector proxy is not reachable: {exc.reason}") from exc


def get_json(base_url: str, route: str) -> tuple[int, dict]:
    return read_json(Request(f"{base_url}{route}", method="GET"))


def multipart_image(path: Path) -> tuple[bytes, str]:
    boundary = f"----fdx-route-check-{uuid.uuid4().hex}"
    content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    body = (
        (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="{path.name}"\r\n'
            f"Content-Type: {content_type}\r\n\r\n"
        ).encode()
        + path.read_bytes()
        + f"\r\n--{boundary}--\r\n".encode()
    )
    return body, boundary


def post_reference(base_url: str, route: str) -> tuple[int, dict]:
    body, boundary = multipart_image(REFERENCE_IMAGE)
    query = "face_plugins=calculator&limit=0&det_prob_threshold=0.60"
    request = Request(
        f"{base_url}{route}?{query}",
        data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Content-Length": str(len(body)),
        },
        method="POST",
    )
    return read_json(request, timeout=120)


def validate_status(route: str, status: int, payload: dict) -> dict:
    if status != 200 or payload.get("status") != "OK":
        raise RuntimeError(f"{route} failed: HTTP {status} {payload}")
    plugins = payload.get("available_plugins", {})
    if plugins.get("detector") != EXPECTED_DETECTOR:
        raise RuntimeError(f"{route} is not using RetinaFace R50: {plugins}")
    if plugins.get("calculator") != EXPECTED_CALCULATOR:
        raise RuntimeError(f"{route} is not using AdaFace IR101: {plugins}")
    if payload.get("similarity_metric") != "cosine":
        raise RuntimeError(f"{route} has an unexpected similarity metric")
    if payload.get("recognition", {}).get("embedding_size") != 512:
        raise RuntimeError(f"{route} has an unexpected embedding size")
    return {
        "route": route,
        "provider": payload.get("execution_provider"),
        "detector": plugins["detector"],
        "calculator": plugins["calculator"],
    }


def validate_find(route: str, status: int, payload: dict) -> dict:
    if status != 200:
        raise RuntimeError(f"{route} failed: HTTP {status} {payload}")
    plugins = payload.get("plugins_versions", {})
    if plugins.get("detector") != EXPECTED_DETECTOR:
        raise RuntimeError(f"{route} returned the wrong detector: {plugins}")
    if plugins.get("calculator") != EXPECTED_CALCULATOR:
        raise RuntimeError(f"{route} returned the wrong calculator: {plugins}")
    faces = payload.get("result", [])
    if not faces:
        raise RuntimeError(f"{route} returned no reference face")
    embedding = faces[0].get("embedding", [])
    if len(embedding) != 512 or not all(math.isfinite(value) for value in embedding):
        raise RuntimeError(f"{route} returned an invalid AdaFace embedding")
    embedding_norm = math.sqrt(sum(value * value for value in embedding))
    if not math.isclose(embedding_norm, 1.0, abs_tol=1e-5):
        raise RuntimeError(f"{route} returned a non-normalized embedding")
    return {
        "route": route,
        "faces": len(faces),
        "embedding_length": len(embedding),
        "embedding_l2_norm": embedding_norm,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    args = parser.parse_args()
    base_url = args.base_url.rstrip("/")

    health_status, health = get_json(base_url, "/health")
    if health_status != 200 or health.get("ok") is not True:
        raise RuntimeError(f"/health failed: HTTP {health_status} {health}")

    statuses = [
        validate_status(route, *get_json(base_url, route))
        for route in STATUS_ROUTES
    ]
    detections = [
        validate_find(route, *post_reference(base_url, route))
        for route in FIND_ROUTES
    ]
    print(
        json.dumps(
            {
                "status": "OK",
                "base_url": base_url,
                "health": health,
                "status_routes": statuses,
                "find_routes": detections,
                "legacy_fast_route_is_accurate_alias": True,
            },
            indent=2,
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
