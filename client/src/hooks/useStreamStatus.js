import { useCallback, useEffect, useRef, useState } from "react";

import { buildFrameWebSocketUrl, buildStreamUrl, sendWebRtcOffer } from "../api";


export function useStreamStatus(token) {
  const [streamStatus, setStreamStatus] = useState(token ? "connecting" : "paired-required");
  const [frameSrc, setFrameSrc] = useState("");
  const [mediaStream, setMediaStream] = useState(null);
  const [useJpegSocket, setUseJpegSocket] = useState(false);
  const [useMjpegFallback, setUseMjpegFallback] = useState(false);
  const [streamNonce, setStreamNonce] = useState(0);
  const peerConnectionRef = useRef(null);
  const frameSocketRef = useRef(null);
  const streamRetryTimeoutRef = useRef(null);
  const streamRetryDelayRef = useRef(1000);
  const animationFrameRef = useRef(null);
  const activeFrameUrlRef = useRef("");
  const pendingFrameUrlRef = useRef("");

  const clearFrameUrls = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (activeFrameUrlRef.current) {
      URL.revokeObjectURL(activeFrameUrlRef.current);
      activeFrameUrlRef.current = "";
    }
    if (pendingFrameUrlRef.current) {
      URL.revokeObjectURL(pendingFrameUrlRef.current);
      pendingFrameUrlRef.current = "";
    }
    setFrameSrc("");
  }, []);

  const closePeerConnection = useCallback(() => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    setMediaStream(null);
  }, []);

  useEffect(() => {
    clearTimeout(streamRetryTimeoutRef.current);
    streamRetryDelayRef.current = 1000;
    setUseJpegSocket(false);
    setUseMjpegFallback(false);
    setStreamStatus(token ? "connecting" : "paired-required");
  }, [token, streamNonce]);

  useEffect(() => {
    if (!token || useJpegSocket || useMjpegFallback) return undefined;

    let cancelled = false;
    closePeerConnection();
    clearFrameUrls();
    setStreamStatus("connecting");

    const pc = new RTCPeerConnection({ iceServers: [] });
    peerConnectionRef.current = pc;
    const remoteStream = new MediaStream();

    pc.addTransceiver("video", { direction: "recvonly" });
    const transceiver = pc.getTransceivers().find((item) => item.receiver.track?.kind === "video");
    const capabilities = RTCRtpSender.getCapabilities?.("video");
    const h264 = capabilities?.codecs?.filter((codec) => codec.mimeType.toLowerCase() === "video/h264") ?? [];
    const rest = capabilities?.codecs?.filter((codec) => codec.mimeType.toLowerCase() !== "video/h264") ?? [];
    if (transceiver && h264.length) {
      transceiver.setCodecPreferences([...h264, ...rest]);
    }

    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => remoteStream.addTrack(track));
      if (!event.streams[0]) remoteStream.addTrack(event.track);
      setMediaStream(remoteStream);
      setStreamStatus("live");
      streamRetryDelayRef.current = 1000;
    };

    pc.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(pc.connectionState) && !cancelled) {
        setUseJpegSocket(true);
      }
    };

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => new Promise((resolve) => {
        if (pc.iceGatheringState === "complete") resolve();
        else pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === "complete") resolve();
        };
      }))
      .then(() => sendWebRtcOffer(token, pc.localDescription))
      .then((answer) => pc.setRemoteDescription(answer))
      .catch(() => {
        if (!cancelled) {
          setStreamStatus("error");
          setUseJpegSocket(true);
        }
      });

    return () => {
      cancelled = true;
      closePeerConnection();
    };
  }, [clearFrameUrls, closePeerConnection, token, useJpegSocket, useMjpegFallback]);

  useEffect(() => {
    if (!token || !useJpegSocket || useMjpegFallback) return undefined;

    clearFrameUrls();
    closePeerConnection();
    const ws = new WebSocket(buildFrameWebSocketUrl(token));
    frameSocketRef.current = ws;
    ws.binaryType = "arraybuffer";
    setStreamStatus("connecting");

    ws.onmessage = (event) => {
      if (pendingFrameUrlRef.current) {
        URL.revokeObjectURL(pendingFrameUrlRef.current);
      }
      pendingFrameUrlRef.current = URL.createObjectURL(
        new Blob([event.data], { type: "image/jpeg" })
      );

      if (!animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(() => {
          animationFrameRef.current = null;
          const nextFrameUrl = pendingFrameUrlRef.current;
          pendingFrameUrlRef.current = "";
          const previousFrameUrl = activeFrameUrlRef.current;
          activeFrameUrlRef.current = nextFrameUrl;
          setFrameSrc(nextFrameUrl);
          setStreamStatus("live");
          streamRetryDelayRef.current = 1000;
          if (previousFrameUrl) {
            URL.revokeObjectURL(previousFrameUrl);
          }
        });
      }
    };

    ws.onerror = () => {
      setStreamStatus("error");
      setUseMjpegFallback(true);
    };

    ws.onclose = () => {
      if (frameSocketRef.current === ws) {
        setUseMjpegFallback(true);
      }
    };

    return () => {
      if (frameSocketRef.current === ws) {
        frameSocketRef.current = null;
      }
      ws.onclose = null;
      ws.close();
      clearFrameUrls();
    };
  }, [clearFrameUrls, closePeerConnection, token, useJpegSocket, useMjpegFallback]);

  useEffect(() => {
    return () => {
      clearTimeout(streamRetryTimeoutRef.current);
      closePeerConnection();
      frameSocketRef.current?.close();
      clearFrameUrls();
    };
  }, [clearFrameUrls, closePeerConnection]);

  const handleStreamError = useCallback(() => {
    if (!token) return;
    if (!useJpegSocket) {
      setUseJpegSocket(true);
      return;
    }
    if (!useMjpegFallback) {
      setUseMjpegFallback(true);
      return;
    }
    setStreamStatus("error");
    clearTimeout(streamRetryTimeoutRef.current);
    const delay = streamRetryDelayRef.current;
    streamRetryDelayRef.current = Math.min(10000, delay * 1.6);
    streamRetryTimeoutRef.current = setTimeout(() => {
      setStreamStatus("connecting");
      setStreamNonce((nonce) => nonce + 1);
    }, delay);
  }, [token, useJpegSocket, useMjpegFallback]);

  const handleStreamLoad = useCallback(() => {
    setStreamStatus("live");
    streamRetryDelayRef.current = 1000;
  }, []);

  const reconnectStream = useCallback(() => {
    clearTimeout(streamRetryTimeoutRef.current);
    streamRetryDelayRef.current = 1000;
    setUseJpegSocket(false);
    setUseMjpegFallback(false);
    setStreamStatus(token ? "connecting" : "paired-required");
    closePeerConnection();
    clearFrameUrls();
    if (token) {
      setStreamNonce((nonce) => nonce + 1);
    }
  }, [clearFrameUrls, closePeerConnection, token]);

  return {
    streamStatus,
    mediaStream,
    streamSrc: useMjpegFallback ? buildStreamUrl(token, streamNonce) : frameSrc,
    streamMode: mediaStream && !useJpegSocket && !useMjpegFallback ? "webrtc" : useMjpegFallback ? "mjpeg" : "jpeg-ws",
    handleStreamError,
    handleStreamLoad,
    reconnectStream,
  };
}
