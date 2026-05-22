import asyncio
import fractions

from fastapi import APIRouter, Body, HTTPException, Query

from auth import require_token
from config import clamp
from state import decrement_streams, get_config, get_latest_raw_snapshot, increment_streams

try:
    import numpy as np
    from av import VideoFrame
    from aiortc import RTCPeerConnection, RTCRtpSender, RTCSessionDescription, VideoStreamTrack
except ImportError:
    np = None
    VideoFrame = None
    RTCPeerConnection = None
    RTCRtpSender = None
    RTCSessionDescription = None
    VideoStreamTrack = object


router = APIRouter()
peer_connections: set = set()


# ── Hardware H.264 encoder detection ─────────────────────────────────────────
# Probed lazily on first WebRTC offer. A real open() is attempted with minimal
# dimensions to catch cases where the codec is present in the FFmpeg build but
# the driver/runtime is unavailable (e.g. NVENC without CUDA).
# The patch is applied only once; subsequent calls are no-ops.

_hw_encoder_probed = False
_hw_codec: str | None = None


def _ensure_hw_encoder_patched() -> None:
    global _hw_encoder_probed, _hw_codec
    if _hw_encoder_probed:
        return
    _hw_encoder_probed = True

    if RTCPeerConnection is None:
        return

    import av as _av

    hw_codecs = ["h264_nvenc", "h264_amf", "h264_qsv"]
    found: str | None = None

    for name in hw_codecs:
        try:
            ctx = _av.CodecContext.create(name, "w")
            ctx.width = 64
            ctx.height = 64
            ctx.pix_fmt = "yuv420p"
            ctx.time_base = fractions.Fraction(1, 30)
            ctx.open()
            del ctx
            found = name
            break
        except Exception:
            pass

    if found:
        print(f"[webrtc] Hardware H.264 encoder detected: {found}")
        orig_create = _av.CodecContext.create

        def _patched_create(codec_name, mode, *args, _hw=found, **kwargs):
            if codec_name == "libx264" and mode == "w":
                try:
                    return orig_create(_hw, mode, *args, **kwargs)
                except Exception:
                    pass
            return orig_create(codec_name, mode, *args, **kwargs)

        _av.CodecContext.create = staticmethod(_patched_create)
        _hw_codec = found
    else:
        print("[webrtc] No hardware H.264 encoder found, using libx264")


# ── Screen capture track ──────────────────────────────────────────────────────

class ScreenVideoTrack(VideoStreamTrack):
    def __init__(self):
        super().__init__()
        self._stream_registered = False
        self._last_frame_id = -1
        self._stopped = False

    async def recv(self):
        if self._stopped:
            raise asyncio.CancelledError()

        if not self._stream_registered:
            increment_streams()
            self._stream_registered = True

        # Poll shared capture state for a new frame BEFORE advancing the PTS
        # clock — calling next_timestamp() first would burn PTS against wall
        # time while waiting, causing presentation drift at the receiver.
        while True:
            frame_id, raw = get_latest_raw_snapshot()
            if raw is not None and frame_id != self._last_frame_id:
                self._last_frame_id = frame_id
                break
            await asyncio.sleep(0.005)

        pts, time_base = await self.next_timestamp()

        config = get_config()
        scale = clamp(float(config["scale"]), 0.25, 1.0)
        if scale != 1.0:
            from PIL import Image
            pil = Image.fromarray(raw, "RGB")
            pil = pil.resize(
                (max(1, int(pil.width * scale)), max(1, int(pil.height * scale))),
                getattr(getattr(Image, "Resampling", Image), "BILINEAR"),
            )
            raw = np.asarray(pil)

        frame = VideoFrame.from_ndarray(raw, format="rgb24")
        frame.pts = pts
        frame.time_base = time_base
        return frame

    def stop(self):
        if self._stopped:
            return
        self._stopped = True
        if self._stream_registered:
            decrement_streams()
            self._stream_registered = False
        super().stop()


# ── Signaling ─────────────────────────────────────────────────────────────────

def prefer_h264(transceiver) -> None:
    capabilities = RTCRtpSender.getCapabilities("video")
    h264 = [codec for codec in capabilities.codecs if codec.mimeType.lower() == "video/h264"]
    rest = [codec for codec in capabilities.codecs if codec.mimeType.lower() != "video/h264"]
    if h264:
        transceiver.setCodecPreferences(h264 + rest)


@router.post("/webrtc/offer")
async def webrtc_offer(token: str | None = Query(default=None), payload: dict = Body(default=None)):
    require_token(token)
    _ensure_hw_encoder_patched()
    if RTCPeerConnection is None:
        raise HTTPException(
            status_code=501,
            detail="WebRTC dependencies are not installed. Run: pip install -r server/requirements.txt",
        )
    if not payload or "sdp" not in payload or "type" not in payload:
        raise HTTPException(status_code=400, detail="Invalid WebRTC offer")

    pc = RTCPeerConnection()
    peer_connections.add(pc)
    track = ScreenVideoTrack()
    transceiver = pc.addTransceiver(track, direction="sendonly")
    prefer_h264(transceiver)

    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        if pc.connectionState in {"failed", "closed", "disconnected"}:
            track.stop()
            await pc.close()
            peer_connections.discard(pc)

    offer = RTCSessionDescription(sdp=payload["sdp"], type=payload["type"])
    await pc.setRemoteDescription(offer)
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    return {"sdp": pc.localDescription.sdp, "type": pc.localDescription.type}


async def close_peer_connections() -> None:
    await asyncio.gather(*(pc.close() for pc in list(peer_connections)), return_exceptions=True)
    peer_connections.clear()
