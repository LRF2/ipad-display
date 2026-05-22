import threading
import time

import mss

from config import (
    DEFAULT_CONFIG,
    SIDEBAR_POSITIONS,
    TOUCHBAR_POSITIONS,
    VIEW_MODES,
    clamp,
    clamp_int,
    load_startup_config,
    save_config_file,
)


latest_frame: bytes = b""
latest_frame_id = 0
latest_frame_stats: dict = {}
latest_raw_frame = None  # numpy ndarray | None — stored opaquely, no numpy import needed here
frame_lock = threading.Lock()
stream_stats = {
    "delivered_frames": 0,
    "dropped_frames": 0,
    "stream_fps": 0.0,
    "drop_rate": 0.0,
    "_window_frames": 0,
    "_window_dropped": 0,
    "_window_started": time.monotonic(),
}
stream_stats_lock = threading.Lock()
active_connections = 0
active_connections_lock = threading.Lock()
active_streams = 0
active_streams_lock = threading.Lock()
config_lock = threading.Lock()
config_version = 0
runtime_config = load_startup_config()


def get_config() -> dict:
    with config_lock:
        return {**runtime_config, "version": config_version}


def update_config(payload: dict, persist: bool = True) -> dict:
    global config_version

    allowed = set(DEFAULT_CONFIG)
    updates = {key: payload[key] for key in allowed if key in payload}
    if not updates:
        return get_config()

    if "monitor_index" in updates:
        with mss.MSS() as sct:
            max_monitor = max(1, len(sct.monitors) - 1)
        updates["monitor_index"] = clamp_int(int(updates["monitor_index"]), 1, max_monitor)
    if "fps" in updates:
        updates["fps"] = clamp_int(int(updates["fps"]), 1, 120)
    if "quality" in updates:
        updates["quality"] = clamp_int(int(updates["quality"]), 40, 95)
    if "scale" in updates:
        updates["scale"] = clamp(float(updates["scale"]), 0.25, 1.0)
    if "view_mode" in updates:
        mode = str(updates["view_mode"]).lower()
        updates["view_mode"] = mode if mode in VIEW_MODES else "fit"
    if "input_enabled" in updates:
        updates["input_enabled"] = bool(updates["input_enabled"])
    if "touch_cursor" in updates:
        updates["touch_cursor"] = bool(updates["touch_cursor"])
    if "sidebar_position" in updates:
        position = str(updates["sidebar_position"]).lower()
        updates["sidebar_position"] = position if position in SIDEBAR_POSITIONS else "left"
    if "touchbar_position" in updates:
        position = str(updates["touchbar_position"]).lower()
        updates["touchbar_position"] = position if position in TOUCHBAR_POSITIONS else "bottom"
    if "display_brightness" in updates:
        updates["display_brightness"] = clamp(float(updates["display_brightness"]), 0.75, 1.25)
    if "display_contrast" in updates:
        updates["display_contrast"] = clamp(float(updates["display_contrast"]), 0.75, 1.5)
    if "display_saturation" in updates:
        updates["display_saturation"] = clamp(float(updates["display_saturation"]), 0.75, 1.5)
    if "auto_quality" in updates:
        updates["auto_quality"] = bool(updates["auto_quality"])
    if "pinch_zoom_enabled" in updates:
        updates["pinch_zoom_enabled"] = bool(updates["pinch_zoom_enabled"])
    if "three_finger_gestures" in updates:
        updates["three_finger_gestures"] = bool(updates["three_finger_gestures"])
    if "scroll_sensitivity" in updates:
        updates["scroll_sensitivity"] = clamp(float(updates["scroll_sensitivity"]), 0.25, 3.0)

    with config_lock:
        runtime_config.update(updates)
        config_version += 1
        if persist:
            save_config_file(runtime_config)
        return {**runtime_config, "version": config_version}


def set_latest_frame(frame: bytes, raw=None, stats: dict | None = None) -> None:
    global latest_frame, latest_frame_id, latest_frame_stats, latest_raw_frame
    with frame_lock:
        latest_frame = frame
        latest_raw_frame = raw
        latest_frame_id += 1
        latest_frame_stats = {
            "frame_id": latest_frame_id,
            "size_bytes": len(frame),
            **(stats or {}),
        }


def get_latest_frame() -> bytes:
    with frame_lock:
        return latest_frame


def get_latest_frame_snapshot() -> tuple[int, bytes]:
    with frame_lock:
        return latest_frame_id, latest_frame


def get_latest_raw_snapshot() -> tuple[int, object]:
    """Returns (frame_id, raw_ndarray | None). Caller owns the numpy dependency."""
    with frame_lock:
        return latest_frame_id, latest_raw_frame


def get_frame_stats() -> dict:
    with frame_lock:
        return dict(latest_frame_stats)


def record_stream_delivery(skipped_frames: int = 0) -> None:
    now = time.monotonic()
    skipped = max(0, skipped_frames)
    with stream_stats_lock:
        stream_stats["delivered_frames"] += 1
        stream_stats["dropped_frames"] += skipped
        stream_stats["_window_frames"] += 1
        stream_stats["_window_dropped"] += skipped
        elapsed = now - stream_stats["_window_started"]
        if elapsed >= 1:
            stream_stats["stream_fps"] = round(stream_stats["_window_frames"] / elapsed, 1)
            stream_stats["drop_rate"] = round(stream_stats["_window_dropped"] / elapsed, 1)
            stream_stats["_window_frames"] = 0
            stream_stats["_window_dropped"] = 0
            stream_stats["_window_started"] = now


def get_stream_stats() -> dict:
    with stream_stats_lock:
        return {
            "delivered_frames": stream_stats["delivered_frames"],
            "dropped_frames": stream_stats["dropped_frames"],
            "stream_fps": stream_stats["stream_fps"],
            "drop_rate": stream_stats["drop_rate"],
        }


def clear_latest_frame() -> None:
    global latest_frame, latest_frame_stats, latest_raw_frame
    with frame_lock:
        latest_frame = b""
        latest_raw_frame = None
        latest_frame_stats = {}
        # Do not bump latest_frame_id — consumers use frame truthiness to
        # skip empty frames. Bumping here would cause a spurious "new frame"
        # signal that all consumers would need to defend against.


def increment_streams() -> None:
    global active_streams
    with active_streams_lock:
        active_streams += 1


def decrement_streams() -> None:
    global active_streams
    should_clear_frame = False
    with active_streams_lock:
        active_streams = max(0, active_streams - 1)
        should_clear_frame = active_streams == 0
    if should_clear_frame:
        clear_latest_frame()


def has_stream_viewers() -> bool:
    with active_streams_lock:
        return active_streams > 0


def get_active_streams() -> int:
    with active_streams_lock:
        return active_streams


def add_connection() -> int:
    global active_connections
    with active_connections_lock:
        active_connections += 1
        return active_connections


def remove_connection() -> int:
    global active_connections
    with active_connections_lock:
        active_connections = max(0, active_connections - 1)
        return active_connections
