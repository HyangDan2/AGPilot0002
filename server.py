#!/usr/bin/env python3
"""
HD2Lab Todo Master - Local Development Server
Ensures proper MIME types for ES Modules (.js, .mjs) across all platforms.
"""

import http.server
import socketserver
import sys

PORT = 8080

class ESModuleHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Prevent aggressive caching during local development
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

# Explicitly register required MIME types
ESModuleHTTPHandler.extensions_map.update({
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.webmanifest': 'application/manifest+json',
})

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    # Allow port reuse immediately
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("", port), ESModuleHTTPHandler) as httpd:
            print(f"==================================================")
            print(f"🚀 HD2Lab Todo Master 로컬 서버 실행 중")
            print(f"👉 접속 주소: http://localhost:{port}")
            print(f"   (종료하려면 터미널에서 Ctrl + C 를 누르세요)")
            print(f"==================================================")
            httpd.serve_forever()
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"⚠️  포트 {port}가 이미 사용 중입니다. 다른 포트로 시도합니다 (8081)...")
            with socketserver.TCPServer(("", 8081), ESModuleHTTPHandler) as httpd:
                print(f"👉 접속 주소: http://localhost:8081")
                httpd.serve_forever()
        else:
            raise e
