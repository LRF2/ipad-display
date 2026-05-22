import time

import mss
from PIL import Image

from capture.base import publish_frame
from monitors import selected_monitor
from state import clear_latest_frame, get_config, has_stream_viewers

try:
    import dxcam
except ImportError:
    dxcam = None


def dxcam_capture_loop() -> None:
    if dxcam is None:
        raise RuntimeError("dxcam is not installed")

    # Track the dxgi output index separately from config version.
    # Camera is only recreated when the output changes, not on every
    # config tweak or viewer reconnect — avoids dxcam singleton warnings.
    active_output_idx = -1
    camera = None
    monitor_region = None
    paused = False

    with mss.MSS() as sct:
        print(f"[capture] Available monitors: {len(sct.monitors) - 1}")
        for i, monitor_info in enumerate(sct.monitors):
            print(f"  Monitor {i}: {monitor_info}")

        while True:
            if not has_stream_viewers():
                if not paused:
                    clear_latest_frame()
                    paused = True
                    print("[capture] No stream viewers; screen capture paused")
                time.sleep(0.25)
                continue

            paused = False
            config = get_config()
            idx, monitor = selected_monitor(sct, config["monitor_index"])
            output_idx = max(0, idx - 1)

            if output_idx != active_output_idx or camera is None:
                if camera is not None:
                    try:
                        camera.stop()
                    except Exception:
                        pass
                    del camera
                    camera = None
                # Clear dxcam's internal registry so it doesn't print
                # "instance already exists" warnings on the next create().
                try:
                    dxcam._cameras.clear()
                except AttributeError:
                    pass
                camera = dxcam.create(output_idx=output_idx, output_color="RGB")
                # dxcam regions are relative to the output, not the global desktop.
                monitor_region = (0, 0, monitor["width"], monitor["height"])
                active_output_idx = output_idx
                clear_latest_frame()
                print(
                    "[capture] Capturing monitor "
                    f"{idx} with dxcam output {output_idx} at {config['fps']}fps, "
                    f"quality {config['quality']}, scale {config['scale']}"
                )

            t0 = time.monotonic()
            try:
                capture_started = time.perf_counter()
                frame = camera.grab(region=monitor_region)
                if frame is not None:
                    img = Image.fromarray(frame, "RGB")
                    capture_ms = (time.perf_counter() - capture_started) * 1000
                    publish_frame(img, config, capture_ms=capture_ms)
            except Exception as exc:
                print(f"[capture] dxcam grab error on output {output_idx}: {exc}")
                # Force camera recreation on next iteration.
                try:
                    camera.stop()
                except Exception:
                    pass
                del camera
                camera = None
                try:
                    dxcam._cameras.clear()
                except AttributeError:
                    pass
                active_output_idx = -1

            sleep_time = (1.0 / config["fps"]) - (time.monotonic() - t0)
            if sleep_time > 0:
                time.sleep(sleep_time)
