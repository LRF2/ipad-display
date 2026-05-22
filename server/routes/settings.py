from fastapi import APIRouter, Body, HTTPException, Query

from auth import require_token
from monitors import settings_response
from state import get_active_streams, get_config, get_frame_stats, get_stream_stats, update_config


router = APIRouter()


@router.get("/info")
def get_info(
    token: str | None = Query(default=None),
    viewport_width: int | None = Query(default=None),
    viewport_height: int | None = Query(default=None),
):
    require_token(token)
    return settings_response(viewport_width, viewport_height)


@router.get("/settings")
def get_settings(
    token: str | None = Query(default=None),
    viewport_width: int | None = Query(default=None),
    viewport_height: int | None = Query(default=None),
):
    require_token(token)
    return settings_response(viewport_width, viewport_height)


@router.get("/stats")
def get_stats(token: str | None = Query(default=None)):
    require_token(token)
    config = get_config()
    return {
        "fps": config["fps"],
        "quality": config["quality"],
        "scale": config["scale"],
        "auto_quality": config["auto_quality"],
        "active_streams": get_active_streams(),
        "stream_stats": get_frame_stats(),
        "delivery_stats": get_stream_stats(),
    }


@router.patch("/settings")
def patch_settings(
    token: str | None = Query(default=None),
    viewport_width: int | None = Query(default=None),
    viewport_height: int | None = Query(default=None),
    payload: dict | None = Body(default=None),
):
    require_token(token)
    try:
        update_config(payload or {})
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid settings payload")
    return settings_response(viewport_width, viewport_height)
