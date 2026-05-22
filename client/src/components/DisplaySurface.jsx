import { useCallback, useEffect, useRef, useState } from "react";

import {
  LONG_PRESS_MS,
  PINCH_THRESHOLD,
  TAP_MAX_MS,
  TWO_FINGER_SCROLL_STEP,
} from "../constants";
import { movedFromStart, normalizeTouch, twoTouchGesture } from "../utils/display";
import { TouchCursor } from "./TouchCursor";


const threeTouchGesture = (touches) => {
  const activeTouches = Array.from(touches).slice(0, 3);
  const centerClientX = activeTouches.reduce((sum, touch) => sum + touch.clientX, 0) / activeTouches.length;
  const centerClientY = activeTouches.reduce((sum, touch) => sum + touch.clientY, 0) / activeTouches.length;
  const spread = activeTouches.reduce(
    (sum, touch) => sum + Math.hypot(touch.clientX - centerClientX, touch.clientY - centerClientY),
    0
  ) / activeTouches.length;

  return { centerClientX, centerClientY, spread };
};


function colorFilter(brightness, contrast, saturation) {
  if (brightness === 1 && contrast === 1 && saturation === 1) return undefined;
  return `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;
}

export function DisplaySurface({
  mediaStream,
  streamSrc,
  streamMode,
  streamStatus,
  displayBox,
  viewMode,
  inputEnabled,
  touchCursorEnabled,
  displayBrightness,
  displayContrast,
  displaySaturation,
  pinchZoomEnabled,
  threeFingerGestures,
  keepHudVisible,
  send,
  sendMouseDown,
  releaseMouse,
  onStreamLoad,
  onStreamError,
  setShowHUD,
}) {
  const [pinching, setPinching] = useState(false);
  const [touchCursor, setTouchCursor] = useState(null);
  const hudTimerRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const longPressFiredRef = useRef(false);
  const lastTouchRef = useRef(null);
  const lastTapRef = useRef(0);
  const gestureRef = useRef(null);
  const threeFingerRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    return () => {
      clearTimeout(hudTimerRef.current);
      clearTimeout(longPressTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (keepHudVisible) {
      clearTimeout(hudTimerRef.current);
    }
  }, [keepHudVisible]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream || null;
    }
  }, [mediaStream]);

  const clearLongPress = useCallback(() => {
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  }, []);

  const startTwoFingerGesture = useCallback(
    (event) => {
      clearLongPress();
      releaseMouse();
      setPinching(true);
      lastTouchRef.current = null;
      const gesture = twoTouchGesture(event.touches, event.currentTarget);
      gestureRef.current = {
        ...gesture,
        mode: null,
        pinchDistance: gesture.distance,
        scrollRemainderY: 0,
      };
      setTouchCursor({
        x: gestureRef.current.center.clientX,
        y: gestureRef.current.center.clientY,
        active: true,
      });
    },
    [clearLongPress, releaseMouse]
  );

  const onTouchStart = useCallback(
    (event) => {
      event.preventDefault();

      if (event.touches.length >= 3 && threeFingerGestures) {
        clearLongPress();
        releaseMouse();
        const gesture = threeTouchGesture(event.touches);
        threeFingerRef.current = {
          startX: gesture.centerClientX,
          startY: gesture.centerClientY,
          currentX: gesture.centerClientX,
          currentY: gesture.centerClientY,
          startSpread: gesture.spread,
          currentSpread: gesture.spread,
          time: Date.now(),
        };
        setTouchCursor({ x: gesture.centerClientX, y: gesture.centerClientY, active: true });
        return;
      }

      if (event.touches.length >= 2) {
        startTwoFingerGesture(event);
        return;
      }

      clearLongPress();
      longPressFiredRef.current = false;
      gestureRef.current = null;
      setPinching(false);
      const touch = event.touches[0];
      const coords = normalizeTouch(touch, event.currentTarget);
      setTouchCursor({ x: coords.clientX, y: coords.clientY, active: true });
      lastTouchRef.current = {
        ...coords,
        startX: coords.x,
        startY: coords.y,
        time: Date.now(),
        moved: false,
      };
      if (!inputEnabled) return;

      sendMouseDown(coords);
      longPressTimerRef.current = setTimeout(() => {
        const last = lastTouchRef.current;
        if (!last || last.moved) return;

        releaseMouse();
        send({ type: "rightclick", x: last.x, y: last.y });
        longPressFiredRef.current = true;
      }, LONG_PRESS_MS);

      // HUD stays until the user explicitly hides it (double-tap or Hide button).
    },
    [clearLongPress, inputEnabled, keepHudVisible, releaseMouse, send, sendMouseDown, setShowHUD, startTwoFingerGesture]
  );

  const onTouchMove = useCallback(
    (event) => {
      event.preventDefault();

      if (threeFingerRef.current) {
        if (event.touches.length >= 3) {
          const gesture = threeTouchGesture(event.touches);
          threeFingerRef.current.currentX = gesture.centerClientX;
          threeFingerRef.current.currentY = gesture.centerClientY;
          threeFingerRef.current.currentSpread = gesture.spread;
          setTouchCursor({ x: gesture.centerClientX, y: gesture.centerClientY, active: true });
        }
        return;
      }

      if (event.touches.length >= 2) {
        releaseMouse();
        setPinching(true);
        const nextGesture = twoTouchGesture(event.touches, event.currentTarget);
        const previousGesture = gestureRef.current;

        if (inputEnabled && previousGesture) {
          const scale = nextGesture.distance / Math.max(1, previousGesture.pinchDistance);
          const scrollDy = nextGesture.center.clientY - previousGesture.center.clientY;
          const scrollRemainderY = (previousGesture.scrollRemainderY ?? 0) + scrollDy;
          const mode = previousGesture.mode ?? null;
          const nextMode =
            mode ??
            (Math.abs(scrollRemainderY) >= TWO_FINGER_SCROLL_STEP
              ? "scroll"
              : pinchZoomEnabled && Math.abs(scale - 1) >= PINCH_THRESHOLD
                ? "pinch"
                : null);

          nextGesture.mode = nextMode;
          nextGesture.pinchDistance = previousGesture.pinchDistance;

          if (nextMode === "pinch" && pinchZoomEnabled) {
            send({ type: "pinch", x: nextGesture.center.x, y: nextGesture.center.y, scale });
            nextGesture.pinchDistance = nextGesture.distance;
            nextGesture.scrollRemainderY = 0;
          } else if (nextMode === "scroll" && Math.abs(scrollRemainderY) >= TWO_FINGER_SCROLL_STEP) {
            const scrollSteps = Math.trunc(scrollRemainderY / TWO_FINGER_SCROLL_STEP);
            send({
              type: "scroll",
              x: nextGesture.center.x,
              y: nextGesture.center.y,
              dy: scrollSteps * TWO_FINGER_SCROLL_STEP,
            });
            nextGesture.scrollRemainderY = scrollRemainderY - scrollSteps * TWO_FINGER_SCROLL_STEP;
          } else {
            nextGesture.scrollRemainderY = scrollRemainderY;
          }
        }

        gestureRef.current = nextGesture;
        setTouchCursor({
          x: nextGesture.center.clientX,
          y: nextGesture.center.clientY,
          active: true,
        });
        return;
      }

      if (pinching) {
        return;
      }

      const touch = event.touches[0];
      const coords = normalizeTouch(touch, event.currentTarget);
      setTouchCursor({ x: coords.clientX, y: coords.clientY, active: true });
      if (lastTouchRef.current) {
        lastTouchRef.current.moved =
          lastTouchRef.current.moved || movedFromStart(lastTouchRef.current, coords);
        if (lastTouchRef.current.moved) {
          clearLongPress();
        }
      }
      if (!inputEnabled) return;
      send({ type: "mousemove", ...coords });
    },
    [clearLongPress, inputEnabled, pinchZoomEnabled, pinching, releaseMouse, send]
  );

  const onTouchEnd = useCallback(
    (event) => {
      event.preventDefault();
      clearLongPress();

      if (threeFingerRef.current && event.touches.length === 0) {
        const gesture = threeFingerRef.current;
        const dx = gesture.currentX - gesture.startX;
        const spreadDelta = gesture.currentSpread - gesture.startSpread;
        threeFingerRef.current = null;
        releaseMouse();
        if (Date.now() - gesture.time < 600) {
          if (dx < -40) {
            send({ type: "hotkey", keys: ["ctrl", "z"] });
          } else if (dx > 40) {
            send({ type: "hotkey", keys: ["ctrl", "y"] });
          } else if (spreadDelta > 16) {
            send({ type: "hotkey", keys: ["ctrl", "v"] });
          } else if (spreadDelta < -16) {
            send({ type: "hotkey", keys: ["ctrl", "c"] });
          } else {
            send({ type: "hotkey", keys: ["ctrl", "c"] });
          }
        }
        setTouchCursor((cursor) => (cursor ? { ...cursor, active: false } : null));
        return;
      }

      if (gestureRef.current || pinching || event.touches.length > 0) {
        releaseMouse();
        if (event.touches.length >= 2) {
          const nextGesture = twoTouchGesture(event.touches, event.currentTarget);
          gestureRef.current = {
            ...nextGesture,
            mode: gestureRef.current?.mode ?? null,
            pinchDistance: gestureRef.current?.pinchDistance ?? nextGesture.distance,
            scrollRemainderY: gestureRef.current?.scrollRemainderY ?? 0,
          };
          return;
        }
        gestureRef.current = null;
        lastTouchRef.current = null;
        if (event.touches.length === 0) {
          setPinching(false);
          setTouchCursor((cursor) => (cursor ? { ...cursor, active: false } : null));
        }
        return;
      }

      const last = lastTouchRef.current;
      setTouchCursor((cursor) => (cursor ? { ...cursor, active: false } : null));
      releaseMouse();

      if (last && !last.moved && !longPressFiredRef.current && Date.now() - last.time < TAP_MAX_MS) {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          setShowHUD((shown) => !shown);
        }
        lastTapRef.current = now;
      }

      lastTouchRef.current = null;
    },
    [clearLongPress, pinching, releaseMouse, send, setShowHUD]
  );

  return (
    <>
      {mediaStream ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
          style={{
            display: "block",
            width: displayBox.width,
            height: displayBox.height,
            maxWidth: viewMode === "fill" ? "none" : undefined,
            maxHeight: viewMode === "fill" ? "none" : undefined,
            pointerEvents: streamStatus === "live" ? "auto" : "none",
            touchAction: "none",
            objectFit: "fill",
            filter: colorFilter(displayBrightness, displayContrast, displaySaturation),
          }}
          onLoadedMetadata={onStreamLoad}
          onError={onStreamError}
        />
      ) : (
        <img
          src={streamSrc}
          alt={streamMode === "mjpeg" ? "display fallback" : "display"}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
          style={{
            display: "block",
            width: displayBox.width,
            height: displayBox.height,
            maxWidth: viewMode === "fill" ? "none" : undefined,
            maxHeight: viewMode === "fill" ? "none" : undefined,
            pointerEvents: streamStatus === "live" ? "auto" : "none",
            touchAction: "none",
            filter: colorFilter(displayBrightness, displayContrast, displaySaturation),
          }}
          onLoad={onStreamLoad}
          onError={onStreamError}
        />
      )}

      {touchCursorEnabled && <TouchCursor cursor={touchCursor} />}
    </>
  );
}
