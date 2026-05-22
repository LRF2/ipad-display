import { FRAME_WS_PATH, PAIR_PATH, SETTINGS_PATH, STATS_PATH, STREAM_PATH, WEBRTC_OFFER_PATH, WS_PATH } from "./constants";


export const getServerBase = () => `${window.location.protocol}//${window.location.host}`;


const withStatus = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};


export const buildViewportParams = (viewportSize) => ({
  viewport_width: Math.round(viewportSize.w),
  viewport_height: Math.round(viewportSize.h),
});


export const buildApiUrl = (path, token, viewportSize) => {
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  if (viewportSize) {
    const viewport = buildViewportParams(viewportSize);
    params.set("viewport_width", viewport.viewport_width);
    params.set("viewport_height", viewport.viewport_height);
  }
  return `${getServerBase()}${path}?${params.toString()}`;
};


export const buildStreamUrl = (token, streamNonce) => {
  if (!token) return "";
  const params = new URLSearchParams({
    token,
    r: String(streamNonce),
  });
  return `${getServerBase()}${STREAM_PATH}?${params.toString()}`;
};


export const buildWebSocketUrl = (token) => {
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${window.location.host}${WS_PATH}?token=${encodeURIComponent(token)}`;
};


export const buildFrameWebSocketUrl = (token) => {
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${window.location.host}${FRAME_WS_PATH}?token=${encodeURIComponent(token)}`;
};


export const pairWithPin = async (pin) => {
  const response = await fetch(`${getServerBase()}${PAIR_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  if (!response.ok) {
    throw withStatus(`pair failed: ${response.status}`, response.status);
  }
  return response.json();
};


export const loadSettingsRequest = async (token, viewportSize) => {
  const response = await fetch(buildApiUrl(SETTINGS_PATH, token, viewportSize));
  if (!response.ok) {
    throw withStatus(`settings failed: ${response.status}`, response.status);
  }
  return response.json();
};


export const loadStatsRequest = async (token) => {
  const response = await fetch(buildApiUrl(STATS_PATH, token));
  if (!response.ok) {
    throw withStatus(`stats failed: ${response.status}`, response.status);
  }
  return response.json();
};


export const sendWebRtcOffer = async (token, offer) => {
  const response = await fetch(buildApiUrl(WEBRTC_OFFER_PATH, token), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sdp: offer.sdp, type: offer.type }),
  });
  if (!response.ok) {
    throw withStatus(`webrtc offer failed: ${response.status}`, response.status);
  }
  return response.json();
};


export const patchSettingsRequest = async (token, viewportSize, patch) => {
  const response = await fetch(buildApiUrl(SETTINGS_PATH, token, viewportSize), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) {
    throw withStatus(`settings update failed: ${response.status}`, response.status);
  }
  return response.json();
};
