"""
Vercel Serverless Function Entry Point for Python Flask
Routes incoming API requests to the unified Flask application instance.
"""
import sys
import os

# Ensure project root and server directories are in sys.path
API_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(API_DIR, '..'))
SERVER_DIR = os.path.join(ROOT_DIR, 'server')

for p in [ROOT_DIR, SERVER_DIR, API_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

from server.app import app


# WSGI Middleware to ensure Vercel rewrites map cleanly to Flask request paths
class VercelPathFixer:
    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        candidates = [
            environ.get("HTTP_X_FORWARDED_URI"),
            environ.get("HTTP_X_MATCHED_PATH"),
            environ.get("RAW_URI"),
            environ.get("REQUEST_URI"),
            environ.get("PATH_INFO")
        ]

        real_path = ""
        for c in candidates:
            if not c:
                continue
            parts = str(c).split("?", 1)
            path_only = parts[0]
            if path_only not in ("/api/index.py", "/index.py", "/api/index", "/index"):
                real_path = path_only
                if len(parts) > 1 and not environ.get("QUERY_STRING"):
                    environ["QUERY_STRING"] = parts[1]
                break

        if real_path:
            if not real_path.startswith("/api") and not real_path.startswith("/uploads"):
                real_path = f"/api{real_path}" if real_path.startswith("/") else f"/api/{real_path}"
            environ["PATH_INFO"] = real_path

        return self.wsgi_app(environ, start_response)


# Apply WSGI path fixer for serverless environments
app.wsgi_app = VercelPathFixer(app.wsgi_app)
