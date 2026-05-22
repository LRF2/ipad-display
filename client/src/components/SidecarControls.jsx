import { useCallback, useEffect, useRef, useState } from "react";


const keyButtonStyle = (active = false) => ({
  minWidth: 44,
  minHeight: 38,
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 10,
  background: active ? "rgba(10,132,255,0.82)" : "rgba(18,24,32,0.82)",
  color: "#fff",
  fontSize: 13,
  fontFamily: "-apple-system, sans-serif",
  fontWeight: 600,
  boxShadow: "0 6px 18px rgba(0,0,0,0.22)",
});


const overlayStyle = {
  position: "absolute",
  zIndex: 8,
  pointerEvents: "auto",
  WebkitUserSelect: "none",
  userSelect: "none",
};


const MODIFIER_KEYS = [
  ["ctrl", "Ctrl"],
  ["alt", "Alt"],
  ["shift", "Shift"],
  ["win", "Win"],
];


const TOUCHBAR_KEYS = [
  ["esc", "Esc"],
  ["tab", "Tab"],
  ["enter", "Enter"],
  ["backspace", "Delete"],
  ["left", "Left"],
  ["up", "Up"],
  ["down", "Down"],
  ["right", "Right"],
];


const FUNCTION_KEYS = ["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12"];


const REPEATABLE_KEYS = new Set(["backspace", "left", "right", "up", "down"]);


export function SidecarControls({ sidebarPosition, touchbarPosition, send, disconnect }) {
  const keyboardInputRef = useRef(null);
  const repeatTimerRef = useRef(null);
  const repeatIntervalRef = useRef(null);
  const [lockedModifiers, setLockedModifiers] = useState({});

  const stopOverlayEvent = (event) => event.stopPropagation();

  const sendHotkey = useCallback(
    (keys) => {
      const modifiers = Object.keys(lockedModifiers).filter((key) => lockedModifiers[key]);
      send({ type: "hotkey", keys: [...modifiers, ...keys] });
    },
    [lockedModifiers, send]
  );

  const toggleModifier = useCallback(
    (key) => {
      setLockedModifiers((current) => {
        const nextActive = !current[key];
        send({ type: nextActive ? "keydown" : "keyup", key });
        return { ...current, [key]: nextActive };
      });
    },
    [send]
  );

  const releaseModifiers = useCallback(() => {
    Object.keys(lockedModifiers).forEach((key) => {
      if (lockedModifiers[key]) {
        send({ type: "keyup", key });
      }
    });
    setLockedModifiers({});
  }, [lockedModifiers, send]);

  const showKeyboard = useCallback(() => {
    keyboardInputRef.current?.focus();
  }, []);

  const onKeyboardKeyDown = useCallback(
    (event) => {
      if (event.key.length === 1) return;
      event.preventDefault();
      const key = event.key.length === 1 ? event.key : event.key.toLowerCase();
      if (key) send({ type: "keypress", key });
    },
    [send]
  );

  const onKeyboardInput = useCallback(
    (event) => {
      const text = event.currentTarget.value;
      if (text) {
        send({ type: "typewrite", text });
        event.currentTarget.value = "";
      }
    },
    [send]
  );

  const stopRepeating = useCallback(() => {
    clearTimeout(repeatTimerRef.current);
    clearInterval(repeatIntervalRef.current);
    repeatTimerRef.current = null;
    repeatIntervalRef.current = null;
  }, []);

  useEffect(() => stopRepeating, [stopRepeating]);

  const pressKey = useCallback(
    (key) => {
      sendHotkey([key]);
    },
    [sendHotkey]
  );

  const startRepeating = useCallback(
    (key) => {
      if (!REPEATABLE_KEYS.has(key)) return;
      stopRepeating();
      repeatTimerRef.current = setTimeout(() => {
        repeatIntervalRef.current = setInterval(() => pressKey(key), 80);
      }, 350);
    },
    [pressKey, stopRepeating]
  );

  const sidebarVisible = sidebarPosition !== "off";
  const touchbarVisible = touchbarPosition !== "off";

  return (
    <>
      <input
        ref={keyboardInputRef}
        aria-label="Remote keyboard input"
        onKeyDown={onKeyboardKeyDown}
        onInput={onKeyboardInput}
        style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 1, height: 1 }}
      />

      {sidebarVisible && (
        <div
          onClick={stopOverlayEvent}
          onTouchStart={stopOverlayEvent}
          onTouchMove={stopOverlayEvent}
          onTouchEnd={stopOverlayEvent}
          style={{
            ...overlayStyle,
            top: "50%",
            [sidebarPosition]: 10,
            transform: "translateY(-50%)",
            display: "grid",
            gap: 8,
          }}
        >
          {MODIFIER_KEYS.map(([key, label]) => (
            <button key={key} onClick={() => toggleModifier(key)} style={keyButtonStyle(lockedModifiers[key])}>
              {label}
            </button>
          ))}
          <button onClick={() => send({ type: "hotkey", keys: ["ctrl", "z"] })} style={keyButtonStyle(false)}>Undo</button>
          <button onClick={showKeyboard} style={keyButtonStyle(false)}>Keys</button>
          <button onClick={releaseModifiers} style={keyButtonStyle(false)}>Clear</button>
          <button onClick={disconnect} style={keyButtonStyle(false)}>Off</button>
        </div>
      )}

      {touchbarVisible && (
        <div
          onClick={stopOverlayEvent}
          onTouchStart={stopOverlayEvent}
          onTouchMove={stopOverlayEvent}
          onTouchEnd={stopOverlayEvent}
          style={{
            ...overlayStyle,
            left: "50%",
            [touchbarPosition]: 10,
            transform: "translateX(-50%)",
            display: "flex",
            flexWrap: "wrap",
            maxWidth: "min(760px, calc(100vw - 24px))",
            justifyContent: "center",
            gap: 8,
            padding: 8,
            borderRadius: 16,
            background: "rgba(0,0,0,0.48)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          {TOUCHBAR_KEYS.map(([key, label]) => (
            <button
              key={key}
              onPointerDown={() => startRepeating(key)}
              onPointerUp={stopRepeating}
              onPointerCancel={stopRepeating}
              onPointerLeave={stopRepeating}
              onClick={() => pressKey(key)}
              style={keyButtonStyle(false)}
            >
              {label}
            </button>
          ))}
          {FUNCTION_KEYS.map((key) => (
            <button key={key} onClick={() => sendHotkey([key])} style={keyButtonStyle(false)}>
              {key.toUpperCase()}
            </button>
          ))}
          <button onClick={() => send({ type: "hotkey", keys: ["ctrl", "c"] })} style={keyButtonStyle(false)}>Copy</button>
          <button onClick={() => send({ type: "hotkey", keys: ["ctrl", "v"] })} style={keyButtonStyle(false)}>Paste</button>
        </div>
      )}
    </>
  );
}
