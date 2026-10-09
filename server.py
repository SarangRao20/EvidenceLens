"""Tiny stdlib SSE server that exposes run_pipeline to the web frontend.

    python server.py            # http://127.0.0.1:8000

Endpoints:
    GET /api/health
    GET /api/analyze?q=<question>   -> text/event-stream
        event: progress  data: {"message": str, "fraction": float}
        event: result    data: {"report": {...}}
        event: error     data: {"message": str}

No extra dependencies: http.server + threading + queue.
"""
from __future__ import annotations

import json
import queue
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from src.report import run_pipeline

HOST, PORT = "127.0.0.1", 8000
MAX_QUESTION_LEN = 300


def sse(event: str, payload: dict) -> bytes:
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n".encode()


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, code: int, payload: dict):
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):  # noqa: N802 (http.server naming)
        url = urlparse(self.path)
        if url.path == "/api/health":
            return self._send_json(200, {"ok": True})
        if url.path != "/api/analyze":
            return self._send_json(404, {"error": "not found"})

        question = (parse_qs(url.query).get("q", [""])[0]).strip()
        if not question or len(question) > MAX_QUESTION_LEN:
            return self._send_json(400, {"error": f"q must be 1-{MAX_QUESTION_LEN} characters"})

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.end_headers()

        events: queue.Queue[bytes | None] = queue.Queue()

        def work():
            try:
                report, _signals = run_pipeline(
                    question,
                    progress_callback=lambda msg, frac: events.put(
                        sse("progress", {"message": msg, "fraction": frac})
                    ),
                )
                events.put(sse("result", {"report": json.loads(report.model_dump_json())}))
            except Exception as e:  # reported to the client, never crashes the server
                events.put(sse("error", {"message": str(e)}))
            finally:
                events.put(None)

        threading.Thread(target=work, daemon=True).start()
        try:
            while (chunk := events.get()) is not None:
                self.wfile.write(chunk)
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            pass  # client navigated away

    def log_message(self, fmt, *args):  # quieter console
        pass


if __name__ == "__main__":
    print(f"EvidenceLens API on http://{HOST}:{PORT}")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
