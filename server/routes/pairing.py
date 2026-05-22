import secrets

from fastapi import APIRouter, Body, HTTPException
from fastapi.responses import HTMLResponse, Response

from auth import (
    PAIRING_PIN,
    SESSION_TOKEN,
    pair_rate_limited,
    record_pair_failure,
    reset_pair_failures,
)
from config import PORT, get_local_ip
from qr import make_qr_svg, pairing_page, pairing_url


router = APIRouter()


def current_pairing_url() -> str:
    return pairing_url(get_local_ip(), PORT, PAIRING_PIN)


@router.get("/pair-qr.svg")
def pair_qr_svg():
    try:
        svg = make_qr_svg(current_pairing_url())
    except ValueError:
        raise HTTPException(status_code=500, detail="Pairing URL is too long for the built-in QR encoder")
    return Response(content=svg, media_type="image/svg+xml")


@router.get("/pair-qr")
def pair_qr_page():
    url = current_pairing_url()
    return HTMLResponse(pairing_page(PAIRING_PIN, url))


@router.post("/pair")
def pair_device(payload: dict | None = Body(default=None)):
    if pair_rate_limited():
        raise HTTPException(status_code=429, detail="Too many pairing attempts. Try again in a minute.")

    pin = str((payload or {}).get("pin", "")).strip()
    if not secrets.compare_digest(pin, PAIRING_PIN):
        record_pair_failure()
        raise HTTPException(status_code=401, detail="Invalid pairing PIN")

    reset_pair_failures()
    return {"token": SESSION_TOKEN}
