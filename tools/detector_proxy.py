#!/usr/bin/env python3
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
FRONTEND_ROOT = ROOT / "frontend"
CORE_URL = "http://127.0.0.1:3000"


class DetectorHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(FRONTEND_ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        if self.path == "/health":
            self._proxy_get("/healthcheck")
            return
        if self.path == "/status":
            self._proxy_get("/status")
            return
        if self.path == "/":
            self.path = "/index.html"
        super().do_GET()

    def do_POST(self):
        parsed = urlsplit(self.path)
        if parsed.path != "/api/find_faces":
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
            f"{CORE_URL}/find_faces?{query}",
            data=body,
            headers=headers,
            method="POST",
        )
        self._send_upstream(request)

    def _proxy_get(self, path):
        self._send_upstream(Request(f"{CORE_URL}{path}", method="GET"))

    def _send_upstream(self, request):
        try:
            with urlopen(request, timeout=120) as response:
                self._write_response(response.status, response.headers, response.read())
        except HTTPError as exc:
            self._write_response(exc.code, exc.headers, exc.read())
        except URLError as exc:
            body = f'{{"message":"Detector backend is not reachable: {exc.reason}"}}'.encode()
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    def _write_response(self, status, headers, body):
        self.send_response(status)
        content_type = headers.get("Content-Type", "application/json")
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8080), DetectorHandler)
    print("Serving detector UI at http://127.0.0.1:8080")
    server.serve_forever()
