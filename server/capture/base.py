from io import BytesIO
import time

import numpy as np
from PIL import Image

from state import set_latest_frame


RESAMPLE = getattr(Image, "Resampling", Image)
RESAMPLE_FAST = getattr(RESAMPLE, "BILINEAR")


def encode_frame(img: Image.Image, config: dict) -> tuple[bytes, float]:
    started = time.perf_counter()
    if config["scale"] != 1.0:
        new_w = max(1, int(img.width * config["scale"]))
        new_h = max(1, int(img.height * config["scale"]))
        img = img.resize((new_w, new_h), RESAMPLE_FAST)

    buf = BytesIO()
    img.save(buf, format="JPEG", quality=config["quality"], optimize=False, subsampling=0)
    return buf.getvalue(), (time.perf_counter() - started) * 1000


def publish_frame(img: Image.Image, config: dict, capture_ms: float | None = None) -> None:
    raw = np.array(img)  # owned copy — np.asarray() would be a view into PIL's buffer
    frame, encode_ms = encode_frame(img, config)
    set_latest_frame(
        frame,
        raw,
        {
            "captured_at": time.time(),
            "capture_ms": round(capture_ms, 2) if capture_ms is not None else None,
            "encode_ms": round(encode_ms, 2),
            "fps": config["fps"],
            "quality": config["quality"],
            "scale": config["scale"],
        },
    )
