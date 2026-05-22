import { TAP_MOVE_TOLERANCE } from "../constants";


export const getDisplayBox = (displayInfo, viewportSize, viewMode) => {
  if (!displayInfo) {
    return { width: viewportSize.w, height: viewportSize.h };
  }

  const fitScale = Math.min(
    viewportSize.w / displayInfo.width,
    viewportSize.h / displayInfo.height
  );
  const fillScale = Math.max(
    viewportSize.w / displayInfo.width,
    viewportSize.h / displayInfo.height
  );

  if (viewMode === "stretch") {
    return { width: viewportSize.w, height: viewportSize.h };
  }

  const scale =
    viewMode === "fill"
      ? fillScale
      : viewMode === "native"
        ? Math.min(1, fitScale)
        : fitScale;

  return {
    width: Math.round(displayInfo.width * scale),
    height: Math.round(displayInfo.height * scale),
  };
};


export const normalizeTouch = (touch, el) => {
  const rect = el.getBoundingClientRect();
  const x = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
  const y = Math.max(0, Math.min(1, (touch.clientY - rect.top) / rect.height));
  return {
    clientX: touch.clientX,
    clientY: touch.clientY,
    x,
    y,
  };
};


export const twoTouchGesture = (touches, el) => {
  const first = touches[0];
  const second = touches[1];
  const centerClientX = (first.clientX + second.clientX) / 2;
  const centerClientY = (first.clientY + second.clientY) / 2;
  const center = normalizeTouch({ clientX: centerClientX, clientY: centerClientY }, el);
  const dx = second.clientX - first.clientX;
  const dy = second.clientY - first.clientY;

  return {
    center,
    distance: Math.hypot(dx, dy),
  };
};


export const movedFromStart = (start, coords) =>
  Math.abs(coords.x - start.x) > TAP_MOVE_TOLERANCE ||
  Math.abs(coords.y - start.y) > TAP_MOVE_TOLERANCE;
