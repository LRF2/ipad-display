import asyncio

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse

from auth import close_unauthorized, require_token
from state import decrement_streams, get_config, get_latest_frame_snapshot, increment_streams, record_stream_delivery


router = APIRouter()
FRAME_WS_MAX_FPS = 120


async def websocket_disconnected(websocket: WebSocket, timeout: float = 0.001) -> bool:
    try:
        await asyncio.wait_for(websocket.receive(), timeout=timeout)
        return False
    except asyncio.TimeoutError:
        return False
    except (WebSocketDisconnect, RuntimeError):
        return True


async def mjpeg_generator():
    boundary = b"--frame"
    last_frame_id = -1
    increment_streams()

    try:
        while True:
            frame_id, frame = get_latest_frame_snapshot()
            if frame and frame_id != last_frame_id:
                skipped_frames = max(0, frame_id - last_frame_id - 1) if last_frame_id >= 0 else 0
                last_frame_id = frame_id
                record_stream_delivery(skipped_frames)
                yield (
                    boundary + b"\r\n"
                    b"Content-Type: image/jpeg\r\n"
                    b"Content-Length: " + str(len(frame)).encode() + b"\r\n"
                    b"\r\n" + frame + b"\r\n"
                )
            else:
                await asyncio.sleep(0.005)
    finally:
        decrement_streams()


@router.get("/stream")
async def video_stream(token: str | None = Query(default=None)):
    require_token(token)
    return StreamingResponse(
        mjpeg_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.websocket("/frames")
async def frame_stream(websocket: WebSocket):
    if await close_unauthorized(websocket):
        return

    await websocket.accept()
    increment_streams()
    last_frame_id = -1
    last_send_time = 0.0

    try:
        while True:
            loop = asyncio.get_event_loop()
            target_fps = min(FRAME_WS_MAX_FPS, get_config()["fps"])
            min_interval = 1.0 / target_fps
            elapsed = loop.time() - last_send_time

            if elapsed < min_interval:
                # Not yet time for the next frame — short sleep then re-check.
                await asyncio.sleep(min(min_interval - elapsed, 0.003))
                continue

            frame_id, frame = get_latest_frame_snapshot()
            if frame and frame_id != last_frame_id:
                skipped_frames = max(0, frame_id - last_frame_id - 1) if last_frame_id >= 0 else 0
                last_frame_id = frame_id
                await websocket.send_bytes(frame)
                record_stream_delivery(skipped_frames)
                last_send_time = loop.time()
            else:
                if await websocket_disconnected(websocket, timeout=0.003):
                    break
    except WebSocketDisconnect:
        pass
    except RuntimeError:
        pass
    finally:
        decrement_streams()
