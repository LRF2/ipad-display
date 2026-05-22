import { useCallback, useEffect, useRef, useState } from "react";

import { buildWebSocketUrl } from "../api";


export function useWebSocketInput(token) {
  const [wsStatus, setWsStatus] = useState(token ? "connecting" : "paired-required");
  const [latency, setLatency] = useState(null);
  const wsRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingTimeRef = useRef(null);
  const mouseDownRef = useRef(false);
  const shouldReconnectRef = useRef(true);

  const send = useCallback((payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const releaseMouse = useCallback(() => {
    if (mouseDownRef.current) {
      send({ type: "mouseup", x: 0, y: 0 });
      mouseDownRef.current = false;
    }
  }, [send]);

  const sendMouseDown = useCallback(
    (coords) => {
      mouseDownRef.current = true;
      send({ type: "mousedown", ...coords });
    },
    [send]
  );

  const connectWebSocket = useCallback(() => {
    if (!token || !shouldReconnectRef.current) return;

    const ws = new WebSocket(buildWebSocketUrl(token));
    wsRef.current = ws;
    setWsStatus("connecting");

    ws.onopen = () => {
      setWsStatus("live");
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          pingTimeRef.current = Date.now();
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 2000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "pong" && pingTimeRef.current) {
          setLatency(Date.now() - pingTimeRef.current);
        }
      } catch {
        // Ignore malformed control messages.
      }
    };

    ws.onclose = () => {
      releaseMouse();
      setWsStatus("connecting");
      clearInterval(pingIntervalRef.current);
      clearTimeout(reconnectTimeoutRef.current);
      if (shouldReconnectRef.current) {
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 2000);
      }
    };

    ws.onerror = () => setWsStatus("error");
  }, [releaseMouse, token]);

  useEffect(() => {
    shouldReconnectRef.current = true;
    if (token) {
      connectWebSocket();
    } else {
      setWsStatus("paired-required");
      setLatency(null);
    }

    return () => {
      shouldReconnectRef.current = false;
      clearTimeout(reconnectTimeoutRef.current);
      clearInterval(pingIntervalRef.current);
      wsRef.current?.close();
    };
  }, [connectWebSocket, token]);

  const reconnectWebSocket = useCallback(() => {
    clearTimeout(reconnectTimeoutRef.current);
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }
    setWsStatus(token ? "connecting" : "paired-required");
    if (token) {
      setTimeout(connectWebSocket, 50);
    }
  }, [connectWebSocket, token]);

  return {
    wsStatus,
    latency,
    send,
    sendMouseDown,
    releaseMouse,
    reconnectWebSocket,
  };
}
