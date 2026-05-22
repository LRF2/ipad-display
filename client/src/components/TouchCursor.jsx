export function TouchCursor({ cursor }) {
  if (!cursor) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: cursor.x,
        top: cursor.y,
        width: 30,
        height: 30,
        borderRadius: "50%",
        border: "2px solid rgba(255,255,255,0.95)",
        background: cursor.active ? "rgba(10,132,255,0.28)" : "rgba(255,255,255,0.12)",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.45), 0 8px 20px rgba(0,0,0,0.35)",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        opacity: cursor.active ? 1 : 0.45,
        transition: "opacity 160ms ease, background 160ms ease",
        zIndex: 5,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: "#fff",
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  );
}
