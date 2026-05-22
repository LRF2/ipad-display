function DisplayIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="1" y="4" width="26" height="17" rx="3" stroke="rgba(10,132,255,0.9)" strokeWidth="1.5" fill="none" />
      <path d="M9 21v3M19 21v3M7 24h14" stroke="rgba(10,132,255,0.9)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="14" cy="12.5" r="3.5" stroke="rgba(10,132,255,0.9)" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export function PairingScreen({ pin, setPin, pairingBusy, pairingError, pairDevice }) {
  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      display: "grid",
      placeItems: "center",
      background: "#000",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
      padding: 24,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(10,132,255,0.13) 0%, transparent 65%)",
      }} />

      <form
        onSubmit={pairDevice}
        style={{
          position: "relative",
          width: "min(380px, 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
          background: "rgba(28,28,30,0.78)",
          backdropFilter: "blur(40px) saturate(200%)",
          WebkitBackdropFilter: "blur(40px) saturate(200%)",
          border: "0.5px solid rgba(255,255,255,0.1)",
          borderRadius: 24,
          padding: "36px 28px 28px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.65), inset 0 0.5px 0 rgba(255,255,255,0.07)",
          animation: "panel-slide-in 0.35s cubic-bezier(0.25,0.46,0.45,0.94) both",
        }}
      >
        {/* App icon */}
        <div style={{
          width: 64, height: 64,
          background: "rgba(10,132,255,0.1)",
          border: "0.5px solid rgba(10,132,255,0.28)",
          borderRadius: 18,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 20,
          boxShadow: "0 0 32px rgba(10,132,255,0.15)",
        }}>
          <DisplayIcon />
        </div>

        <div style={{
          fontSize: 24, fontWeight: 600,
          letterSpacing: "-0.025em",
          color: "#f5f5f7",
          marginBottom: 8,
          textAlign: "center",
        }}>
          iPad Display
        </div>

        <div style={{
          fontSize: 14,
          color: "rgba(235,235,245,0.5)",
          textAlign: "center",
          lineHeight: 1.5,
          marginBottom: 32,
        }}>
          Enter the 6-digit PIN shown<br />in the server window
        </div>

        {/* PIN input */}
        <input
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoFocus
          placeholder="000000"
          style={{
            width: "100%",
            fontSize: 34,
            letterSpacing: "0.2em",
            textAlign: "center",
            color: "#f5f5f7",
            background: "rgba(118,118,128,0.16)",
            border: "0.5px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
            padding: "14px 12px",
            outline: "none",
            fontVariantNumeric: "tabular-nums",
            fontFamily: "'SF Mono', 'Menlo', monospace",
            marginBottom: 14,
            caretColor: "#0a84ff",
          }}
        />

        {/* Error */}
        {pairingError && (
          <div style={{
            width: "100%",
            padding: "10px 14px",
            background: "rgba(255,69,58,0.1)",
            border: "0.5px solid rgba(255,69,58,0.3)",
            borderRadius: 8,
            color: "#ff453a",
            fontSize: 13,
            lineHeight: 1.4,
            marginBottom: 14,
            textAlign: "center",
          }}>
            {pairingError}
          </div>
        )}

        {/* Pair button */}
        <button
          disabled={pin.length !== 6 || pairingBusy}
          style={{
            width: "100%",
            padding: "15px 0",
            background: pin.length === 6 && !pairingBusy ? "#0a84ff" : "rgba(10,132,255,0.25)",
            border: "none",
            borderRadius: 12,
            color: pin.length === 6 && !pairingBusy ? "#fff" : "rgba(235,235,245,0.35)",
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: "-0.015em",
            cursor: pin.length === 6 && !pairingBusy ? "pointer" : "default",
            fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
            transition: "background 0.2s, color 0.2s",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {pairingBusy ? "Pairing…" : "Pair"}
        </button>
      </form>
    </div>
  );
}
