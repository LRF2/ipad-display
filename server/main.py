"""
iPad Display Server - Phase 1 (MJPEG)
=====================================
- Captures screen with dxcam when available, mss fallback otherwise
- Streams as MJPEG to /stream
- Receives touch/input over WebSocket at /ws
- Serves the React PWA from /
"""

import sys
import threading
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from auth import PAIRING_PIN
from capture.manager import capture_loop
from config import ALLOWED_ORIGINS, HOST, IP_LABEL_USB, IP_LABEL_VIRTUAL, PORT, get_all_local_ips, get_local_ip
from routes.pairing import router as pairing_router
from routes.settings import router as settings_router
from routes.stream import router as stream_router
from routes.webrtc import router as webrtc_router
from routes.websocket import router as websocket_router


def create_app() -> FastAPI:
    app = FastAPI(title="iPad Display Server")

    if ALLOWED_ORIGINS:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=ALLOWED_ORIGINS,
            allow_methods=["GET", "PATCH", "POST"],
            allow_headers=["*"],
        )

    app.include_router(pairing_router)
    app.include_router(stream_router)
    app.include_router(settings_router)
    app.include_router(webrtc_router)
    app.include_router(websocket_router)

    dist = ROOT.parent / "client" / "dist"
    try:
        app.mount("/", StaticFiles(directory=str(dist), html=True), name="static")
    except Exception:
        @app.get("/")
        def root():
            return HTMLResponse("<h2>Build the React PWA first: cd client && npm run build</h2>")

    return app


def patch_windows_proactor() -> None:
    try:
        from asyncio import proactor_events as _pe
    except ImportError:
        return

    original_lost = getattr(_pe._ProactorBasePipeTransport, "_call_connection_lost")

    def quiet_lost(self, exc):
        try:
            original_lost(self, exc)
        except ConnectionResetError:
            pass

    setattr(_pe._ProactorBasePipeTransport, "_call_connection_lost", quiet_lost)


def print_startup_banner() -> None:
    all_ips = get_all_local_ips()
    real_ips = [ip for ip, label in all_ips if label not in (IP_LABEL_USB, IP_LABEL_VIRTUAL)]
    usb_ips = [ip for ip, label in all_ips if label == IP_LABEL_USB]
    virtual_ips = [ip for ip, label in all_ips if label == IP_LABEL_VIRTUAL]
    local_url = f"http://localhost:{PORT}"

    print("\n" + "=" * 50)
    print("  iPad Display Server")
    print("=" * 50)
    print(f"  Local:       {local_url}")
    for i, ip in enumerate(real_ips):
        label = "  Network:" if i == 0 else "          "
        print(f"{label}     http://{ip}:{PORT}")
    for i, ip in enumerate(usb_ips):
        label = "  USB:" if i == 0 else "       "
        print(f"{label}        http://{ip}:{PORT}  ← iPad over cable")
    if virtual_ips:
        print(f"  VPN/VM:      {', '.join(virtual_ips)}")
    print(f"  QR page:     http://localhost:{PORT}/pair-qr")
    print(f"  Pairing PIN: {PAIRING_PIN}")
    print()
    print("  HOW TO CONNECT")
    if usb_ips:
        print("  USB ready:  Open the USB address above on your iPad.")
    else:
        print("  Wi-Fi:  Open the Network URL above on your iPad,")
        print("          or scan the QR page with the iPad camera.")
        print("  USB:    Install 'Apple Devices' from the Microsoft Store,")
        print("          plug in the iPad, trust this PC, then restart")
        print("          this server — a USB address will appear above.")
        print()
        print("  USB not detected? Run this to see adapter names:")
        print("    python -c \"import psutil; [print(n, [a.address for a in v if a.family==2]) for n,v in psutil.net_if_addrs().items()]\"")
    print()
    print("  The log shows [ws] iPad connected via USB or Wi-Fi/LAN")
    print("  so you always know which connection is active.")
    print()
    print("  Existing token URLs still work for already paired devices.")
    print("=" * 50 + "\n")


app = create_app()


if __name__ == "__main__":
    patch_windows_proactor()

    try:
        from hdr import disable_for_capture
        disable_for_capture()
    except Exception as _hdr_err:
        print(f"[hdr] HDR management unavailable: {_hdr_err}")

    capture_thread = threading.Thread(target=capture_loop, daemon=True)
    capture_thread.start()

    print_startup_banner()
    uvicorn.run(app, host=HOST, port=PORT, log_level="warning", ws_ping_interval=None)
