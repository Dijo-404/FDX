#!/usr/bin/env python3
import json
import os
import socket
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
FRONTEND_ROOT = ROOT / "frontend"
ACCURATE_CORE_URL = os.environ.get("FDX_ACCURATE_CORE_URL", "http://127.0.0.1:3000")
# The portable build intentionally uses one accurate native backend. Keep the
# legacy fast routes as aliases so older cached frontend code still works.
FAST_CORE_URL = os.environ.get("FDX_FAST_CORE_URL", ACCURATE_CORE_URL)
UI_PORT = int(os.environ.get("FDX_UI_PORT", "8080"))
GET_TIMEOUT_SECONDS = 10
HEALTH_TIMEOUT_SECONDS = 2
POST_TIMEOUT_SECONDS = 300
HEALTH_BUSY_GRACE_SECONDS = POST_TIMEOUT_SECONDS + 30
CLIENT_DISCONNECT_ERRORS = (BrokenPipeError, ConnectionAbortedError, ConnectionResetError)
HEALTH_CACHE_LOCK = threading.Lock()
HEALTH_LAST_OK = {}
STATUS_CACHE_LOCK = threading.Lock()
STATUS_CACHE = {}


class DetectorHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(FRONTEND_ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self._write_health()
            return
        if self.path == "/status":
            self._proxy_status(ACCURATE_CORE_URL)
            return
        if self.path == "/accurate/status":
            self._proxy_status(ACCURATE_CORE_URL)
            return
        if self.path == "/fast/status":
            self._proxy_status(FAST_CORE_URL)
            return
        if self.path == "/":
            self.path = "/index.html"
        super().do_GET()

    def do_POST(self):
        parsed = urlsplit(self.path)
        backend_url = self._get_backend_url(parsed.path)
        if backend_url is None:
            self.send_error(404)
            return

        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length)
        query = parsed.query or "face_plugins="
        if "face_plugins" not in query:
            query = f"{query}&face_plugins=" if query else "face_plugins="

        headers = {
            "Content-Type": self.headers.get("Content-Type", "application/octet-stream"),
            "Content-Length": str(len(body)),
        }
        request = Request(
            f"{backend_url}/find_faces?{query}",
            data=body,
            headers=headers,
            method="POST",
        )
        self._send_upstream(request, backend_url=backend_url)

    def _get_backend_url(self, path):
        if path in {"/api/find_faces", "/api/accurate/find_faces"}:
            return ACCURATE_CORE_URL
        if path == "/api/fast/find_faces":
            return FAST_CORE_URL
        return None

    def _proxy_status(self, backend_url):
        if self._write_cached_status(backend_url):
            return
        self._send_upstream(
            Request(f"{backend_url}/status", method="GET"),
            backend_url=backend_url,
            status_cache_key=backend_url,
        )

    def _write_health(self):
        accurate = self._check_backend(ACCURATE_CORE_URL)
        fast = self._check_backend(FAST_CORE_URL)
        healthy = accurate["ok"]
        self._write_json(
            200 if healthy else 503,
            {
                "ok": healthy,
                "accurate": accurate,
                "fast": fast,
            },
        )

    def _check_backend(self, backend_url):
        try:
            with urlopen(f"{backend_url}/healthcheck", timeout=HEALTH_TIMEOUT_SECONDS) as response:
                ok = 200 <= response.status < 300
                if ok:
                    self._mark_backend_healthy(backend_url)
                return {"ok": ok, "status": response.status}
        except HTTPError as exc:
            return self._recent_health_or_error(
                backend_url,
                f"returned HTTP {exc.code}",
                status=exc.code,
            )
        except (TimeoutError, socket.timeout):
            return self._recent_health_or_error(backend_url, "timed out")
        except URLError as exc:
            if isinstance(exc.reason, (TimeoutError, socket.timeout)):
                return self._recent_health_or_error(backend_url, "timed out")
            return {"ok": False, "message": str(exc.reason)}

    def _mark_backend_healthy(self, backend_url):
        with HEALTH_CACHE_LOCK:
            HEALTH_LAST_OK[backend_url] = time.monotonic()

    def _recent_health_or_error(self, backend_url, message, status=None):
        with HEALTH_CACHE_LOCK:
            last_ok = HEALTH_LAST_OK.get(backend_url)
        if last_ok is not None:
            last_ok_seconds_ago = time.monotonic() - last_ok
            if last_ok_seconds_ago <= HEALTH_BUSY_GRACE_SECONDS:
                result = {
                    "ok": True,
                    "stale": True,
                    "message": f"{message}; backend was recently healthy",
                    "last_ok_seconds_ago": round(last_ok_seconds_ago, 1),
                }
                if status is not None:
                    result["status"] = status
                return result
        result = {"ok": False, "message": message}
        if status is not None:
            result["status"] = status
        return result

    def _send_upstream(self, request, backend_url=None, status_cache_key=None):
        timeout = POST_TIMEOUT_SECONDS if request.get_method() == "POST" else GET_TIMEOUT_SECONDS
        try:
            with urlopen(request, timeout=timeout) as response:
                body = response.read()
                if backend_url is not None:
                    self._mark_backend_healthy(backend_url)
                if status_cache_key is not None:
                    self._cache_status_response(status_cache_key, response.status, response.headers, body)
                self._write_response(response.status, response.headers, body)
        except HTTPError as exc:
            if backend_url is not None and exc.code < 500:
                self._mark_backend_healthy(backend_url)
            if status_cache_key is not None and exc.code >= 500 and self._write_cached_status(status_cache_key):
                return
            self._write_response(exc.code, exc.headers, exc.read())
        except (TimeoutError, socket.timeout):
            if status_cache_key is not None and self._write_cached_status(status_cache_key):
                return
            self._write_json(
                504,
                {
                    "message": (
                        f"Detector backend did not respond within {timeout}s. "
                        "It may still be processing a large image."
                    )
                },
            )
        except URLError as exc:
            if status_cache_key is not None and self._write_cached_status(status_cache_key):
                return
            self._write_json(502, {"message": f"Detector backend is not reachable: {exc.reason}"})

    def _cache_status_response(self, cache_key, status, headers, body):
        content_type = headers.get("Content-Type", "application/json")
        with STATUS_CACHE_LOCK:
            STATUS_CACHE[cache_key] = (status, content_type, body)

    def _write_cached_status(self, cache_key):
        with STATUS_CACHE_LOCK:
            cached = STATUS_CACHE.get(cache_key)
        if cached is None:
            return False
        status, content_type, body = cached
        self._write_response(status, {"Content-Type": content_type}, body)
        return True

    def _write_response(self, status, headers, body):
        try:
            self.send_response(status)
            content_type = headers.get("Content-Type", "application/json")
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except CLIENT_DISCONNECT_ERRORS:
            return

    def _write_json(self, status, payload):
        body = json.dumps(payload).encode()
        try:
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except CLIENT_DISCONNECT_ERRORS:
            return


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", UI_PORT), DetectorHandler)
    print(f"Serving detector UI at http://127.0.0.1:{UI_PORT}")
    server.serve_forever()
