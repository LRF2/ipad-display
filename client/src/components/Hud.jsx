import { latencyColor } from "../utils/colors";

// ── icons ─────────────────────────────────────────────────────────────────────

function IconExpand() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2H3a1 1 0 00-1 1v3" />
      <path d="M10 2h3a1 1 0 011 1v3" />
      <path d="M6 14H3a1 1 0 01-1-1v-3" />
      <path d="M10 14h3a1 1 0 001-1v-3" />
    </svg>
  );
}

function IconReconnect() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function IconSettings({ filled }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="2.4" fill={filled ? "currentColor" : "none"} />
      <path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.4 3.4l1.3 1.3M11.3 11.3l1.3 1.3M3.4 12.6l1.3-1.3M11.3 4.7l1.3-1.3" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" />
      <line x1="8.5" y1="1.5" x2="1.5" y2="8.5" />
    </svg>
  );
}

// ── shared button ─────────────────────────────────────────────────────────────

function HudBtn({ onClick, label, active, accent, children }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        color: accent ?? (active ? "#f5f5f7" : "rgba(235,235,245,0.48)"),
        cursor: "pointer",
        padding: "0 9px",
        height: 38,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        fontWeight: active ? 500 : 400,
        letterSpacing: "-0.01em",
        minWidth: 30,
        flexShrink: 0,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {children}
    </button>
  );
}

const Sep = () => (
  <div style={{ width: 0.5, height: 18, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />
);

// ── component ─────────────────────────────────────────────────────────────────

export function Hud({
  streamStatus,
  wsStatus,
  displayInfo,
  liveStats,
  actualFps,
  latency,
  inputEnabled,
  settingsOpen,
  applySettings,
  reconnectAll,
  setSettingsOpen,
  setShowHUD,
}) {
  const isLive = streamStatus === "live" && wsStatus === "live";
  const frameStats = liveStats?.stream_stats || displayInfo?.stream_stats || {};
  const deliveryStats = liveStats?.delivery_stats || {};
  const frameKb = frameStats.size_bytes ? Math.round(frameStats.size_bytes / 1024) : null;
  const displayFps = actualFps ?? displayInfo?.fps;
  const dropRate = deliveryStats.drop_rate ?? 0;

  const latColor = latency !== null ? latencyColor(latency) : null;

  return (
    <div
      onClick={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
      onTouchEnd={e => e.stopPropagation()}
      style={{
        position: "absolute",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        height: 38,
        background: "rgba(28,28,30,0.78)",
        backdropFilter: "blur(40px) saturate(200%)",
        WebkitBackdropFilter: "blur(40px) saturate(200%)",
        borderRadius: 20,
        border: "0.5px solid rgba(255,255,255,0.1)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.48), inset 0 0.5px 0 rgba(255,255,255,0.07)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        userSelect: "none",
        WebkitUserSelect: "none",
        whiteSpace: "nowrap",
        animation: "hud-fade-in 0.3s cubic-bezier(0.25,0.46,0.45,0.94) both",
      }}
    >
      {/* Live indicator */}
      <div style={{ position: "relative", padding: "0 13px 0 14px", display: "flex", alignItems: "center", flexShrink: 0 }}>
        {isLive && (
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <div style={{
              width: 8, height: 8,
              borderRadius: "50%",
              background: "#30d158",
              animation: "live-ring 2s ease-out infinite",
            }} />
          </div>
        )}
        <div style={{
          width: 8, height: 8,
          borderRadius: "50%",
          background: isLive ? "#30d158" : "#ffd60a",
          position: "relative",
          zIndex: 1,
        }} />
      </div>

      <Sep />

      {/* Resolution + FPS */}
      <div style={{ padding: "0 12px", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <span style={{ color: "#f5f5f7", fontSize: 13, fontWeight: 500, letterSpacing: "-0.015em" }}>
          {displayInfo ? `${displayInfo.width}×${displayInfo.height}` : "Display"}
        </span>
        {displayFps != null && (
          <>
            <div style={{ width: 0.5, height: 11, background: "rgba(255,255,255,0.18)" }} />
            <span style={{
              color: "#f5f5f7",
              fontSize: 13,
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
              fontFamily: "'SF Mono', 'Menlo', monospace",
            }}>
              {displayFps}fps
            </span>
          </>
        )}
      </div>

      {/* Latency */}
      {latency !== null && (
        <>
          <Sep />
          <span style={{
            padding: "0 12px",
            color: latColor,
            fontSize: 12,
            fontFamily: "'SF Mono', 'Menlo', monospace",
            fontVariantNumeric: "tabular-nums",
            flexShrink: 0,
          }}>
            {latency}ms
          </span>
        </>
      )}

      {/* Frame stats */}
      {frameStats.frame_id && (
        <>
          <Sep />
          <span style={{
            padding: "0 12px",
            color: "rgba(235,235,245,0.35)",
            fontSize: 11,
            fontFamily: "'SF Mono', 'Menlo', monospace",
            letterSpacing: "0.005em",
            flexShrink: 0,
          }}>
            {frameStats.capture_ms ?? "–"}·{frameStats.encode_ms ?? "–"}ms · {frameKb}KB
          </span>
        </>
      )}

      {/* Drop rate — only when elevated */}
      {dropRate >= 2 && (
        <>
          <Sep />
          <span style={{ padding: "0 12px", color: "#ff9f0a", fontSize: 12, fontFamily: "'SF Mono', 'Menlo', monospace", flexShrink: 0 }}>
            ↓{dropRate}/s
          </span>
        </>
      )}

      {/* Status badges */}
      {liveStats?.active_streams === 0 && (
        <>
          <Sep />
          <span style={{ padding: "0 12px", color: "#ffd60a", fontSize: 12, flexShrink: 0 }}>Paused</span>
        </>
      )}
      {liveStats?.auto_quality && (
        <>
          <Sep />
          <span style={{ padding: "0 12px", color: "#30d158", fontSize: 12, fontWeight: 500, flexShrink: 0 }}>Auto</span>
        </>
      )}

      <Sep />

      {/* Action buttons */}
      <HudBtn onClick={() => document.documentElement.requestFullscreen?.()} label="Fullscreen">
        <IconExpand />
      </HudBtn>

      <HudBtn
        onClick={() => applySettings({ input_enabled: !inputEnabled })}
        label="Toggle touch input"
        accent={!inputEnabled ? "#ffd60a" : undefined}
      >
        {inputEnabled ? "Touch" : "Locked"}
      </HudBtn>

      <HudBtn onClick={reconnectAll} label="Reconnect">
        <IconReconnect />
      </HudBtn>

      <HudBtn
        onClick={() => setSettingsOpen(o => !o)}
        label="Settings"
        active={settingsOpen}
      >
        <IconSettings filled={settingsOpen} />
      </HudBtn>

      <HudBtn onClick={() => setShowHUD(false)} label="Hide HUD">
        <IconClose />
      </HudBtn>
    </div>
  );
}
