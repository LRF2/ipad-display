import { useEffect, useRef } from "react";


export function useWakeLock(active) {
  const fallbackRef = useRef(null);

  useEffect(() => {
    if (!active) return undefined;

    // ── Primary: Screen Wake Lock API (requires HTTPS or localhost) ──────────
    if ("wakeLock" in navigator) {
      let cancelled = false;
      let lock = null;

      const requestLock = async () => {
        try {
          lock = await navigator.wakeLock.request("screen");
          lock.addEventListener("release", () => {
            lock = null;
            if (!cancelled && document.visibilityState === "visible") {
              requestLock();
            }
          });
        } catch {
          lock = null;
        }
      };

      const handleVisibilityChange = () => {
        if (!cancelled && document.visibilityState === "visible" && !lock) {
          requestLock();
        }
      };

      requestLock();
      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        cancelled = true;
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        lock?.release?.().catch(() => {});
      };
    }

    // ── Fallback: silent AudioContext loop (HTTP on local network) ───────────
    // Wake Lock API requires a secure context (HTTPS). Over plain HTTP the API
    // is undefined, so the primary branch is skipped. A looping silent audio
    // buffer keeps the AudioContext active, which hints to the OS that the page
    // is doing real work and prevents automatic screen dimming.
    // AudioContext requires a user gesture to start — we defer to first touch.
    const startAudio = () => {
      if (fallbackRef.current) return;
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const gain = ctx.createGain();
        gain.gain.value = 0; // completely silent
        src.connect(gain);
        gain.connect(ctx.destination);
        src.start(0);
        fallbackRef.current = { ctx, src };
      } catch {
        // ignore — better to silently fail than crash
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && fallbackRef.current) {
        fallbackRef.current.ctx.resume().catch(() => {});
      }
    };

    document.addEventListener("touchstart", startAudio, { once: true, passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("touchstart", startAudio);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (fallbackRef.current) {
        try { fallbackRef.current.src.stop(); } catch {}
        try { fallbackRef.current.ctx.close(); } catch {}
        fallbackRef.current = null;
      }
    };
  }, [active]);
}
