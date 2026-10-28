#!/usr/bin/env python3
"""Local server of the site for looking at changes: http://127.0.0.1:8765/app/

The same as `python3 -m http.server 8765 --bind 127.0.0.1`, but every answer says «Cache-Control: no-cache»:
the browser asks again each time and gets the new app.js, style.css or data.js right after a change (an unchanged
file costs only a short «304 Not Modified»). The plain http.server lets the browser keep old files for a while.
Any static hosting serves the folder as it is; open /app/ there.

    python3 scripts/serve.py [port]
"""
import functools
import http.server
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    handler = functools.partial(NoCache, directory=str(ROOT))
    with http.server.ThreadingHTTPServer(('127.0.0.1', port), handler) as server:
        print(f'http://127.0.0.1:{port}/app/')
        server.serve_forever()
