import os
import secrets
import threading
import time

from fastapi import HTTPException, WebSocket


SESSION_TOKEN = os.getenv("IPAD_DISPLAY_TOKEN") or secrets.token_urlsafe(24)
PAIRING_PIN = os.getenv("IPAD_DISPLAY_PIN") or f"{secrets.randbelow(1_000_000):06d}"

pair_lock = threading.Lock()
failed_pair_attempts: list[float] = []


def is_authorized(token: str | None) -> bool:
    return bool(token) and secrets.compare_digest(token, SESSION_TOKEN)


def require_token(token: str | None) -> None:
    if not is_authorized(token):
        raise HTTPException(status_code=401, detail="Invalid or missing pairing token")


async def close_unauthorized(websocket: WebSocket) -> bool:
    token = websocket.query_params.get("token")
    if is_authorized(token):
        return False
    await websocket.close(code=1008)
    return True


def pair_rate_limited() -> bool:
    now = time.monotonic()
    with pair_lock:
        failed_pair_attempts[:] = [t for t in failed_pair_attempts if now - t < 60]
        return len(failed_pair_attempts) >= 5


def record_pair_failure() -> None:
    with pair_lock:
        failed_pair_attempts.append(time.monotonic())


def reset_pair_failures() -> None:
    with pair_lock:
        failed_pair_attempts.clear()
