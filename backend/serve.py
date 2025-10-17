# -*- coding: utf-8 -*-
"""
Chạy kết hợp cả core API (backend/server.py) và proxy (backend/proxy_server.py)
trên cùng một cổng bằng WSGI dispatcher đơn giản.

Chạy: python backend/serve.py  (mặc định 127.0.0.1:5000)
"""
from werkzeug.serving import run_simple

try:
    from backend.server import app as core_app  # type: ignore
except Exception:
    # Fallback import kiểu tương đối nếu chạy từ repo root
    from server import app as core_app  # type: ignore

try:
    from backend.proxy_server import app as proxy_app  # type: ignore
except Exception:
    from proxy_server import app as proxy_app  # type: ignore


def combined_app(environ, start_response):
    path = environ.get('PATH_INFO', '') or ''
    # Định tuyến mọi request bắt đầu bằng /api/proxy sang proxy_app
    if path.startswith('/api/proxy'):
        return proxy_app.wsgi_app(environ, start_response)
    # Còn lại chuyển cho core_app
    return core_app.wsgi_app(environ, start_response)


if __name__ == '__main__':
    # Chạy một tiến trình duy nhất, hot-reload dev
    run_simple('127.0.0.1', 5000, combined_app, use_debugger=True, use_reloader=True)

