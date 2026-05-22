import time

import mss
from PIL import Image

from capture.base import publish_frame
from monitors import selected_monitor
from state import clear_latest_frame, get_config, has_stream_viewers


def mss_capture_loop() -> None:
    active_version = -1
    monitor = None

    with mss.MSS() as sct:
        print(f"[capture] Available monitors: {len(sct.monitors) - 1}")
        for i, monitor_info in enumerate(sct.monitors):
            print(f"  Monitor {i}: {monitor_info}")

        while True:
            if not has_stream_viewers():
                time.sleep(0.25)
                continue

            config = get_config()
            if config["version"] != active_version or monitor is None:
                idx, monitor = selected_monitor(sct, config["monitor_index"])
                active_version = config["version"]
                clear_latest_frame()
                print(
                    "[capture] Capturing monitor "
                    f"{idx} at {config['fps']}fps, quality {config['quality']}, scale {config['scale']}"
                )

            t0 = time.monotonic()
            try:
                capture_started = time.perf_counter()
                screenshot = sct.grab(monitor)
                img = Image.frombytes("RGB", screenshot.size, screenshot.bgra, "raw", "BGRX")
                capture_ms = (time.perf_counter() - capture_started) * 1000
                publish_frame(img, config, capture_ms=capture_ms)

            except Exception as exc:
                print(f"[capture] Error: {exc}")

            sleep_time = (1.0 / config["fps"]) - (time.monotonic() - t0)
            if sleep_time > 0:
                time.sleep(sleep_time)
