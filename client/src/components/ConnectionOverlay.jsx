export function ConnectionOverlay({ streamStatus, wsStatus }) {
  if (streamStatus === "live" && wsStatus === "live") return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        background: streamStatus === "live" ? "transparent" : "rgba(0,0,0,0.86)",
        pointerEvents: "none",
      }}
    >
      {streamStatus !== "live" && (
        <div
          style={{
            color: "#fff",
            fontFamily: "-apple-system, sans-serif",
            display: "grid",
            justifyItems: "center",
            gap: 10,
          }}
        >
          <strong>{streamStatus === "error" ? "Reconnecting stream..." : "Connecting to display..."}</strong>
          <span style={{ color: "#9aa5b5", fontSize: 13 }}>Keep the server running on your Windows PC.</span>
        </div>
      )}
    </div>
  );
}
