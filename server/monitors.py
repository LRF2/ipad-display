import mss

from config import RECOMMENDED_RESOLUTIONS
from state import get_config, get_frame_stats


def selected_monitor(sct: mss.MSS, monitor_index: int | None = None) -> tuple[int, dict]:
    monitors = sct.monitors
    configured_index = monitor_index if monitor_index is not None else get_config()["monitor_index"]
    idx = configured_index if configured_index < len(monitors) else 1
    return idx, monitors[idx]


def monitor_list(sct: mss.MSS) -> list[dict]:
    monitors = []
    for idx, monitor in enumerate(sct.monitors):
        if idx == 0:
            continue
        monitors.append(
            {
                "index": idx,
                "name": f"Monitor {idx}",
                "width": monitor["width"],
                "height": monitor["height"],
                "left": monitor["left"],
                "top": monitor["top"],
                "aspect": round(monitor["width"] / monitor["height"], 4),
            }
        )
    return monitors


def resolution_advisory(monitor: dict, viewport_width: int | None, viewport_height: int | None) -> dict:
    monitor_aspect = monitor["width"] / monitor["height"]
    viewport_aspect = None
    mismatch_percent = None
    status = "unknown"
    message = "Open from the iPad to compare the monitor shape with this device."

    if viewport_width and viewport_height:
        viewport_aspect = viewport_width / viewport_height
        mismatch_percent = abs(monitor_aspect - viewport_aspect) / viewport_aspect * 100
        if mismatch_percent <= 5:
            status = "good"
            message = "This monitor shape is close to the iPad viewport."
        else:
            status = "warning"
            message = (
                "This monitor shape differs from the iPad viewport. Use Fit to see everything, "
                "Fill to remove bars, or change the virtual display to an iPad-shaped resolution."
            )

    return {
        "status": status,
        "message": message,
        "monitor_aspect": round(monitor_aspect, 4),
        "viewport_aspect": round(viewport_aspect, 4) if viewport_aspect else None,
        "mismatch_percent": round(mismatch_percent, 1) if mismatch_percent is not None else None,
        "recommended_resolutions": RECOMMENDED_RESOLUTIONS,
    }


def settings_response(viewport_width: int | None = None, viewport_height: int | None = None) -> dict:
    config = get_config()
    with mss.MSS() as sct:
        idx, monitor = selected_monitor(sct, config["monitor_index"])
        return {
            "monitor_index": idx,
            "width": monitor["width"],
            "height": monitor["height"],
            "fps": config["fps"],
            "quality": config["quality"],
            "scale": config["scale"],
            "view_mode": config["view_mode"],
            "input_enabled": config["input_enabled"],
            "touch_cursor": config["touch_cursor"],
            "sidebar_position": config["sidebar_position"],
            "touchbar_position": config["touchbar_position"],
            "display_brightness": config["display_brightness"],
            "display_contrast": config["display_contrast"],
            "display_saturation": config["display_saturation"],
            "auto_quality": config["auto_quality"],
            "pinch_zoom_enabled": config["pinch_zoom_enabled"],
            "three_finger_gestures": config["three_finger_gestures"],
            "scroll_sensitivity": config["scroll_sensitivity"],
            "monitors": monitor_list(sct),
            "advisory": resolution_advisory(monitor, viewport_width, viewport_height),
            "stream_stats": get_frame_stats(),
        }
