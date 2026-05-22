import json
import os
import socket
import threading
import time
from pathlib import Path


ROOT = Path(__file__).parent
CONFIG_PATH = ROOT / "config.local.json"
VIEW_MODES = {"fit", "fill", "stretch", "native"}
SIDEBAR_POSITIONS = {"left", "right", "off"}
TOUCHBAR_POSITIONS = {"top", "bottom", "off"}
RECOMMENDED_RESOLUTIONS = ["1600x1200", "1920x1440", "2048x1536"]

DEFAULT_CONFIG = {
    "monitor_index": 1,
    "fps": 30,
    "quality": 75,
    "scale": 1.0,
    "view_mode": "fit",
    "input_enabled": True,
    "touch_cursor": True,
    "sidebar_position": "left",
    "touchbar_position": "bottom",
    "display_brightness": 1.0,
    "display_contrast": 1.0,
    "display_saturation": 1.0,
    "auto_quality": False,
    "pinch_zoom_enabled": True,
    "three_finger_gestures": True,
    "scroll_sensitivity": 1.0,
}


def env_int(name: str, default: int, minimum: int | None = None, maximum: int | None = None) -> int:
    try:
        value = int(os.getenv(name, default))
    except ValueError:
        value = default
    if minimum is not None:
        value = max(minimum, value)
    if maximum is not None:
        value = min(maximum, value)
    return value


def env_float(name: str, default: float, minimum: float | None = None, maximum: float | None = None) -> float:
    try:
        value = float(os.getenv(name, default))
    except ValueError:
        value = default
    if minimum is not None:
        value = max(minimum, value)
    if maximum is not None:
        value = min(maximum, value)
    return value


def env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, value))


def clamp_int(value: int, minimum: int, maximum: int) -> int:
    return max(minimum, min(maximum, value))


def coerce_config(raw: dict) -> dict:
    config = dict(DEFAULT_CONFIG)
    for key in DEFAULT_CONFIG:
        if key in raw:
            config[key] = raw[key]

    config["monitor_index"] = max(1, int(config["monitor_index"]))
    config["fps"] = clamp_int(int(config["fps"]), 1, 120)
    config["quality"] = clamp_int(int(config["quality"]), 40, 95)
    config["scale"] = clamp(float(config["scale"]), 0.25, 1.0)
    config["view_mode"] = config["view_mode"] if config["view_mode"] in VIEW_MODES else "fit"
    config["input_enabled"] = bool(config["input_enabled"])
    config["touch_cursor"] = bool(config["touch_cursor"])
    config["sidebar_position"] = (
        config["sidebar_position"] if config["sidebar_position"] in SIDEBAR_POSITIONS else "left"
    )
    config["touchbar_position"] = (
        config["touchbar_position"] if config["touchbar_position"] in TOUCHBAR_POSITIONS else "bottom"
    )
    config["display_brightness"] = clamp(float(config["display_brightness"]), 0.75, 1.25)
    config["display_contrast"] = clamp(float(config["display_contrast"]), 0.75, 1.5)
    config["display_saturation"] = clamp(float(config["display_saturation"]), 0.75, 1.5)
    config["auto_quality"] = bool(config["auto_quality"])
    config["pinch_zoom_enabled"] = bool(config["pinch_zoom_enabled"])
    config["three_finger_gestures"] = bool(config["three_finger_gestures"])
    config["scroll_sensitivity"] = clamp(float(config["scroll_sensitivity"]), 0.25, 3.0)
    return config


def load_config_file() -> dict:
    if not CONFIG_PATH.exists():
        return {}
    try:
        with CONFIG_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def load_startup_config() -> dict:
    config = coerce_config(load_config_file())
    env_updates = {}
    if "IPAD_DISPLAY_MONITOR" in os.environ:
        env_updates["monitor_index"] = env_int("IPAD_DISPLAY_MONITOR", config["monitor_index"], minimum=1)
    if "IPAD_DISPLAY_FPS" in os.environ:
        env_updates["fps"] = env_int("IPAD_DISPLAY_FPS", config["fps"], minimum=1, maximum=120)
    if "IPAD_DISPLAY_JPEG_QUALITY" in os.environ:
        env_updates["quality"] = env_int("IPAD_DISPLAY_JPEG_QUALITY", config["quality"], minimum=40, maximum=95)
    if "IPAD_DISPLAY_SCALE" in os.environ:
        env_updates["scale"] = env_float("IPAD_DISPLAY_SCALE", config["scale"], minimum=0.25, maximum=1.0)
    if "IPAD_DISPLAY_VIEW_MODE" in os.environ:
        env_updates["view_mode"] = os.getenv("IPAD_DISPLAY_VIEW_MODE", config["view_mode"]).lower()
    if "IPAD_DISPLAY_INPUT_ENABLED" in os.environ:
        env_updates["input_enabled"] = env_bool("IPAD_DISPLAY_INPUT_ENABLED", config["input_enabled"])
    if "IPAD_DISPLAY_TOUCH_CURSOR" in os.environ:
        env_updates["touch_cursor"] = env_bool("IPAD_DISPLAY_TOUCH_CURSOR", config["touch_cursor"])
    if "IPAD_DISPLAY_SIDEBAR_POSITION" in os.environ:
        env_updates["sidebar_position"] = os.getenv("IPAD_DISPLAY_SIDEBAR_POSITION", config["sidebar_position"]).lower()
    if "IPAD_DISPLAY_TOUCHBAR_POSITION" in os.environ:
        env_updates["touchbar_position"] = os.getenv("IPAD_DISPLAY_TOUCHBAR_POSITION", config["touchbar_position"]).lower()
    if "IPAD_DISPLAY_BRIGHTNESS" in os.environ:
        env_updates["display_brightness"] = env_float("IPAD_DISPLAY_BRIGHTNESS", config["display_brightness"], minimum=0.75, maximum=1.25)
    if "IPAD_DISPLAY_CONTRAST" in os.environ:
        env_updates["display_contrast"] = env_float("IPAD_DISPLAY_CONTRAST", config["display_contrast"], minimum=0.75, maximum=1.5)
    if "IPAD_DISPLAY_SATURATION" in os.environ:
        env_updates["display_saturation"] = env_float("IPAD_DISPLAY_SATURATION", config["display_saturation"], minimum=0.75, maximum=1.5)
    if "IPAD_DISPLAY_AUTO_QUALITY" in os.environ:
        env_updates["auto_quality"] = env_bool("IPAD_DISPLAY_AUTO_QUALITY", config["auto_quality"])
    if "IPAD_DISPLAY_PINCH_ZOOM" in os.environ:
        env_updates["pinch_zoom_enabled"] = env_bool("IPAD_DISPLAY_PINCH_ZOOM", config["pinch_zoom_enabled"])
    if "IPAD_DISPLAY_THREE_FINGER_GESTURES" in os.environ:
        env_updates["three_finger_gestures"] = env_bool("IPAD_DISPLAY_THREE_FINGER_GESTURES", config["three_finger_gestures"])
    if "IPAD_DISPLAY_SCROLL_SENSITIVITY" in os.environ:
        env_updates["scroll_sensitivity"] = env_float("IPAD_DISPLAY_SCROLL_SENSITIVITY", config["scroll_sensitivity"], minimum=0.25, maximum=3.0)
    config.update(env_updates)
    return coerce_config(config)


def save_config_file(config: dict) -> None:
    persisted = {key: config[key] for key in DEFAULT_CONFIG}
    content = json.dumps(persisted, indent=2) + "\n"
    last_error = None

    for attempt in range(3):
        tmp_path = CONFIG_PATH.with_name(
            f"{CONFIG_PATH.stem}.{os.getpid()}.{threading.get_ident()}.{attempt}.tmp"
        )
        try:
            tmp_path.write_text(content, encoding="utf-8")
            tmp_path.replace(CONFIG_PATH)
            return
        except PermissionError as exc:
            last_error = exc
            try:
                tmp_path.unlink(missing_ok=True)
            except OSError:
                pass
            time.sleep(0.05 * (attempt + 1))

    try:
        CONFIG_PATH.write_text(content, encoding="utf-8")
    except OSError as exc:
        print(f"[settings] Warning: could not persist settings: {exc or last_error}")


def get_local_ip() -> str:
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    finally:
        sock.close()


_VIRTUAL_ADAPTER_KEYWORDS = (
    "tailscale", "vmware", "virtualbox", "vbox", "hyper-v", "loopback",
    "pseudo", "teredo", "isatap", "6to4", "vethernet",
)

# Interface name fragments that identify Apple's USB network driver.
# Windows registers it as "Apple Mobile Device Ethernet" or similar.
_APPLE_USB_KEYWORDS = ("apple mobile device", "iphone usb", "ipad usb", "apple usb")


def _is_virtual_adapter(name: str) -> bool:
    lower = name.lower()
    return any(kw in lower for kw in _VIRTUAL_ADAPTER_KEYWORDS)


def _is_apple_usb_adapter(name: str) -> bool:
    lower = name.lower()
    return any(kw in lower for kw in _APPLE_USB_KEYWORDS)


# Labels used in (ip, label) tuples returned by get_all_local_ips().
# "real"    — Wi-Fi, Ethernet, or USB tethering (routable LAN address)
# "usb"     — Apple Mobile Device Ethernet (may be 169.254.x.x)
# "virtual" — Tailscale, VMware, VirtualBox, etc.
IP_LABEL_REAL = "real"
IP_LABEL_USB = "usb"
IP_LABEL_VIRTUAL = "virtual"


def get_all_local_ips() -> list[tuple[str, str]]:
    """Return all relevant IPv4 addresses as (ip, label) pairs.

    Labels: 'real' (Wi-Fi/LAN/USB-tethering), 'usb' (Apple USB driver),
    'virtual' (VPN/VM adapters).

    Apple Mobile Device Ethernet uses APIPA (169.254.x.x) addresses.  We
    detect these two ways:
      1. Adapter name matches known Apple USB keywords (primary).
      2. Any UP, non-virtual adapter with a 169.254.x.x address (fallback —
         catches adapters whose names don't match our keyword list).
    """
    seen: set[str] = set()
    results: list[tuple[str, str]] = []

    try:
        import psutil
        iface_stats = psutil.net_if_stats()
        for iface_name, addrs in psutil.net_if_addrs().items():
            apple_usb = _is_apple_usb_adapter(iface_name)
            virtual = not apple_usb and _is_virtual_adapter(iface_name)
            is_up = iface_stats[iface_name].isup if iface_name in iface_stats else True

            for addr in addrs:
                ip = addr.address
                if addr.family != socket.AF_INET:
                    continue
                if ip.startswith("127."):
                    continue
                is_link_local = ip.startswith("169.254.")
                # Include link-local only for UP, non-virtual adapters.
                # Any such address is almost certainly Apple USB or a direct link.
                if is_link_local and (virtual or not is_up):
                    continue
                if ip not in seen:
                    seen.add(ip)
                    if apple_usb or (is_link_local and not virtual):
                        label = IP_LABEL_USB
                    elif virtual:
                        label = IP_LABEL_VIRTUAL
                    else:
                        label = IP_LABEL_REAL
                    results.append((ip, label))
        if results:
            return results
    except ImportError:
        pass

    # Fallback: getaddrinfo — no adapter-name information available.
    try:
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None, socket.AF_INET):
            ip = info[4][0]
            if ip.startswith("127.") or ip.startswith("169.254."):
                continue
            if ip not in seen:
                seen.add(ip)
                results.append((ip, IP_LABEL_REAL))
    except OSError:
        pass

    if not results:
        results.append((get_local_ip(), IP_LABEL_REAL))

    return results


def get_usb_ips() -> list[str]:
    """Return IPs that belong to Apple USB or tethering adapters."""
    usb_labels = {IP_LABEL_USB}
    # 172.20.10.x is Apple Personal Hotspot over USB (cellular iPads).
    return [
        ip for ip, label in get_all_local_ips()
        if label in usb_labels or ip.startswith("172.20.10.")
    ]


HOST = os.getenv("IPAD_DISPLAY_HOST", "0.0.0.0")
PORT = env_int("IPAD_DISPLAY_PORT", 8080, minimum=1, maximum=65535)
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("IPAD_DISPLAY_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]
