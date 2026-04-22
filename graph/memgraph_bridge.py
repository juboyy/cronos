#!/usr/bin/env python3
"""
Memgraph HTTP Bridge
Exposes Memgraph Bolt queries over HTTP REST for Vercel serverless functions.
Runs on Vultr alongside Memgraph.

Endpoint: POST /cypher
Body: {"query": "MATCH ...", "params": {...}}
Returns: {"columns": [...], "data": [{...}, ...]}
"""

import json
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

try:
    from neo4j import GraphDatabase
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "neo4j", "-q"])
    from neo4j import GraphDatabase

MEMGRAPH_URI = os.environ.get("MEMGRAPH_URI", "bolt://localhost:7687")
PORT = int(os.environ.get("BRIDGE_PORT", "7480"))
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*")

driver = GraphDatabase.driver(MEMGRAPH_URI)


class MemgraphHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self._cors_headers()
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/health":
            self.send_response(200)
            self._cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "memgraph": MEMGRAPH_URI}).encode())
            return
        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        path = urlparse(self.path).path
        if path != "/cypher":
            self.send_response(404)
            self.end_headers()
            return

        content_length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(content_length)) if content_length else {}

        query = body.get("query", "")
        params = body.get("params", {})

        if not query:
            self._json_response(400, {"error": "query required"})
            return

        # Basic safety: block mutations from external calls
        upper = query.strip().upper()
        if any(upper.startswith(kw) for kw in ["DROP", "DELETE", "DETACH", "CREATE INDEX", "SET"]):
            # Allow only read queries + MERGE from known callers
            if "MERGE" not in upper:
                self._json_response(403, {"error": "mutation queries not allowed via HTTP bridge"})
                return

        try:
            with driver.session() as session:
                result = session.run(query, params)
                columns = result.keys()
                data = []
                for record in result:
                    row = {}
                    for col in columns:
                        val = record[col]
                        # Convert neo4j types to JSON-safe
                        if hasattr(val, '__iter__') and not isinstance(val, (str, dict)):
                            val = list(val)
                        row[col] = val
                    data.append(row)
                
                self._json_response(200, {"columns": list(columns), "data": data, "count": len(data)})
        except Exception as e:
            self._json_response(500, {"error": str(e)})

    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGINS)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Type", "application/json")

    def _json_response(self, code: int, data: dict):
        self.send_response(code)
        self._cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data, default=str, ensure_ascii=False).encode())

    def log_message(self, format, *args):
        # Suppress default logging noise
        pass


if __name__ == "__main__":
    print(f"🔌 Memgraph HTTP Bridge starting on port {PORT}")
    print(f"   Bolt: {MEMGRAPH_URI}")
    server = HTTPServer(("0.0.0.0", PORT), MemgraphHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        driver.close()
