import ipaddress
import json

import mss
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from auth import close_unauthorized
from config import clamp, get_usb_ips
from monitors import selected_monitor
from state import add_connection, get_config, remove_connection


def _build_usb_networks() -> list[ipaddress.IPv4Network]:
    networks = [ipaddress.IPv4Network("172.20.10.0/24")]  # Apple Personal Hotspot
    for ip in get_usb_ips():
        try:
            networks.append(ipaddress.IPv4Network(f"{ip}/24", strict=False))
        except ValueError:
            pass
    return networks


# Computed once at startup; USB adapters don't change while the server runs.
_usb_networks: list[ipaddress.IPv4Network] = _build_usb_networks()


def _is_usb_client(client_ip: str) -> bool:
    try:
        addr = ipaddress.IPv4Address(client_ip)
    except ValueError:
        return False
    return any(addr in net for net in _usb_networks)


router = APIRouter()
SCROLL_GAIN = 10


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    import pyautogui  # lazy: avoids hanging on import at startup
    pyautogui.PAUSE = 0

    if await close_unauthorized(websocket):
        return

    await websocket.accept()
    active = add_connection()
    client_ip = websocket.client.host if websocket.client else "unknown"
    connection_type = "USB" if _is_usb_client(client_ip) else "Wi-Fi/LAN"
    if active > 1:
        print(f"[ws] iPad reconnecting via {connection_type} ({client_ip}). Active: {active} (old session closing)")
    else:
        print(f"[ws] iPad connected via {connection_type} ({client_ip}). Active: {active}")

    try:
        with mss.MSS() as sct:
            display_version = -1
            display_w = 0
            display_h = 0
            display_x = 0
            display_y = 0

            while True:
                raw = await websocket.receive_text()
                try:
                    data = json.loads(raw)
                except json.JSONDecodeError:
                    continue

                config = get_config()
                if config["version"] != display_version:
                    _, monitor = selected_monitor(sct, config["monitor_index"])
                    display_w = monitor["width"]
                    display_h = monitor["height"]
                    display_x = monitor["left"]
                    display_y = monitor["top"]
                    display_version = config["version"]

                event_type = data.get("type")
                if event_type == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                    continue
                if not config["input_enabled"]:
                    continue

                nx = clamp(float(data.get("x", 0)))
                ny = clamp(float(data.get("y", 0)))
                abs_x = display_x + int(nx * display_w)
                abs_y = display_y + int(ny * display_h)

                if event_type == "mousemove":
                    pyautogui.moveTo(abs_x, abs_y, _pause=False)

                elif event_type == "mousedown":
                    pyautogui.moveTo(abs_x, abs_y, _pause=False)
                    pyautogui.mouseDown(_pause=False)

                elif event_type == "mouseup":
                    pyautogui.mouseUp(_pause=False)

                elif event_type == "click":
                    pyautogui.click(abs_x, abs_y, _pause=False)

                elif event_type == "rightclick":
                    pyautogui.rightClick(abs_x, abs_y, _pause=False)

                elif event_type == "scroll":
                    dy = float(data.get("dy", 0))
                    clicks = int(round((-dy / 8) * SCROLL_GAIN * config["scroll_sensitivity"]))
                    if clicks == 0 and dy:
                        clicks = -1 if dy > 0 else 1
                    pyautogui.scroll(clicks, x=abs_x, y=abs_y, _pause=False)

                elif event_type == "pinch":
                    scale = float(data.get("scale", 1.0))
                    clicks = 3 if scale > 1 else -3
                    pyautogui.keyDown("ctrl")
                    try:
                        pyautogui.scroll(clicks, x=abs_x, y=abs_y)
                    finally:
                        pyautogui.keyUp("ctrl")

                elif event_type == "keydown":
                    key = data.get("key", "")
                    if key:
                        try:
                            pyautogui.keyDown(key)
                        except Exception:
                            pass

                elif event_type == "keyup":
                    key = data.get("key", "")
                    if key:
                        try:
                            pyautogui.keyUp(key)
                        except Exception:
                            pass

                elif event_type == "keypress":
                    key = data.get("key", "")
                    if key:
                        try:
                            pyautogui.press(key, _pause=False)
                        except Exception:
                            pass

                elif event_type == "typewrite":
                    text = str(data.get("text", ""))
                    if text:
                        try:
                            pyautogui.write(text, interval=0, _pause=False)
                        except Exception:
                            pass

                elif event_type == "hotkey":
                    keys = data.get("keys", [])
                    if isinstance(keys, list) and keys:
                        try:
                            pyautogui.hotkey(*[str(key) for key in keys], interval=0)
                        except Exception:
                            pass

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        print(f"[ws] Error: {exc}")
    finally:
        active = remove_connection()
        print(f"[ws] iPad disconnected ({client_ip}). Active: {active}")
