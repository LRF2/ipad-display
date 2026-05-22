from capture.dxcam_capture import dxcam, dxcam_capture_loop
from capture.mss_capture import mss_capture_loop


def capture_loop() -> None:
    if dxcam is not None:
        try:
            dxcam_capture_loop()
            return
        except Exception as exc:
            print(f"[capture] dxcam unavailable, falling back to mss: {exc}")
    mss_capture_loop()
