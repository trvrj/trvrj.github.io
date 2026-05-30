"""Local dev server with live reload for static site development."""

import os
import socket
from pathlib import Path

from livereload import Server

ROOT = Path(__file__).resolve().parent
PORT = 8000
HOST = "0.0.0.0"

WATCH_PATTERNS = (
    "**/*.html",
    "**/*.css",
    "**/*.js",
    "**/*.json",
    "**/*.md",
)

if __name__ == "__main__":
    os.chdir(ROOT)

    server = Server()
    for pattern in WATCH_PATTERNS:
        server.watch(pattern)

    local_ip = "localhost"
    try:
        local_ip = socket.gethostbyname(socket.gethostname())
    except OSError:
        pass

    print(f"Serving {ROOT} at http://localhost:{PORT}/")
    print(f"LAN URL for mobile: http://{local_ip}:{PORT}/")
    print("Live reload enabled — save a file to refresh the browser.")
    server.serve(port=PORT, host=HOST, root=str(ROOT), open_url_delay=1)
