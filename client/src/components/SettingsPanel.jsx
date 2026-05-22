// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  label:      "#f5f5f7",
  secondary:  "rgba(235,235,245,0.55)",
  tertiary:   "rgba(235,235,245,0.3)",
  separator:  "rgba(84,84,88,0.5)",
  groupBg:    "rgba(44,44,46,0.9)",
  sectionHdr: "rgba(235,235,245,0.42)",
  blue:       "#0a84ff",
  green:      "#30d158",
  yellow:     "#ffd60a",
  mono:       "'SF Mono', 'Menlo', monospace",
  sans:       "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
};

// ── Primitives ─────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }) {
  return (
    <label style={{ position: "relative", display: "inline-flex", width: 51, height: 31, cursor: "pointer", flexShrink: 0 }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
      />
      <span style={{
        position: "absolute", inset: 0,
        borderRadius: 15.5,
        background: checked ? T.green : "rgba(120,120,128,0.3)",
        transition: "background 0.22s cubic-bezier(0.25,0.46,0.45,0.94)",
        boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.1)",
      }}>
        <span style={{
          position: "absolute",
          width: 27, height: 27, top: 2,
          left: checked ? 22 : 2,
          background: "#fff",
          borderRadius: "50%",
          boxShadow: "0 2px 6px rgba(0,0,0,0.28), 0 0.5px 1px rgba(0,0,0,0.16)",
          transition: "left 0.22s cubic-bezier(0.25,0.46,0.45,0.94)",
        }} />
      </span>
    </label>
  );
}

function SegmentedControl({ options, value, onChange }) {
  return (
    <div style={{
      display: "flex",
      background: "rgba(118,118,128,0.2)",
      borderRadius: 9, padding: 2, gap: 1, width: "100%",
    }}>
      {options.map(opt => (
        <button key={opt.value} onClick={() => onChange(opt.value)} style={{
          flex: 1, padding: "6px 4px",
          background: value === opt.value ? "rgba(255,255,255,0.12)" : "transparent",
          border: `0.5px solid ${value === opt.value ? "rgba(255,255,255,0.1)" : "transparent"}`,
          borderRadius: 7,
          color: value === opt.value ? "#fff" : T.secondary,
          fontSize: 13,
          fontWeight: value === opt.value ? 500 : 400,
          cursor: "pointer",
          transition: "all 0.14s",
          fontFamily: T.sans,
          letterSpacing: "-0.01em",
          whiteSpace: "nowrap",
          WebkitTapHighlightColor: "transparent",
        }}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Section({ title, children, last = false }) {
  return (
    <div style={{ marginBottom: last ? 8 : 22 }}>
      {title && (
        <div style={{
          fontSize: 11, fontWeight: 600,
          color: T.sectionHdr,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          marginBottom: 6, paddingLeft: 4,
          fontFamily: T.sans,
        }}>
          {title}
        </div>
      )}
      <div style={{
        background: T.groupBg,
        borderRadius: 12, overflow: "hidden",
        border: "0.5px solid rgba(255,255,255,0.07)",
      }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, sub, children, last = false }) {
  return (
    <div style={{
      display: "flex", alignItems: "center",
      justifyContent: "space-between",
      padding: "0 14px", minHeight: 46,
      borderBottom: last ? "none" : `0.5px solid ${T.separator}`,
      gap: 10,
    }}>
      <div>
        <div style={{ fontSize: 15, color: T.label, letterSpacing: "-0.015em", fontFamily: T.sans }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: T.tertiary, marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
        {children}
      </div>
    </div>
  );
}

function SliderRow({ label, sub, min, max, step = 1, value, onChange, format, last = false }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{
      padding: "11px 14px",
      borderBottom: last ? "none" : `0.5px solid ${T.separator}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 9 }}>
        <span style={{ fontSize: 15, color: T.label, letterSpacing: "-0.015em", fontFamily: T.sans }}>{label}</span>
        <span style={{ fontSize: 13, color: T.secondary, fontVariantNumeric: "tabular-nums", fontFamily: T.mono }}>
          {format ? format(value) : value}
        </span>
      </div>
      {sub && <div style={{ fontSize: 12, color: T.tertiary, marginBottom: 7 }}>{sub}</div>}
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={onChange}
        style={{ "--pct": `${pct}%`, width: "100%", display: "block" }}
      />
    </div>
  );
}

function ChipRow({ chips, last = false }) {
  return (
    <div style={{
      padding: "10px 14px", display: "flex", gap: 7, flexWrap: "wrap",
      borderBottom: last ? "none" : `0.5px solid ${T.separator}`,
    }}>
      {chips.map(c => (
        <button key={c.label} onClick={c.onClick} style={{
          padding: "7px 14px",
          background: "rgba(10,132,255,0.1)",
          border: "0.5px solid rgba(10,132,255,0.3)",
          borderRadius: 20,
          color: T.blue,
          fontSize: 13, fontWeight: 500,
          cursor: "pointer",
          fontFamily: T.sans,
          letterSpacing: "-0.01em",
          transition: "background 0.14s",
          WebkitTapHighlightColor: "transparent",
        }}>
          {c.label}
        </button>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function SettingsPanel({
  settings,
  actualFps,
  viewMode,
  inputEnabled,
  touchCursorEnabled,
  sidebarPosition,
  touchbarPosition,
  settingsError,
  savingSettings,
  applySettings,
  loadSettings,
  changeMonitor,
  setSettingsOpen,
}) {
  const stop = e => { e.stopPropagation(); };

  return (
    <div
      onClick={stop} onTouchStart={stop} onTouchMove={stop} onTouchEnd={stop}
      style={{
        position: "absolute",
        top: 62, right: 16,
        width: "min(380px, calc(100vw - 32px))",
        maxHeight: "calc(100vh - 90px)",
        overflowY: "auto",
        overscrollBehavior: "contain",
        background: "rgba(22,22,24,0.94)",
        backdropFilter: "blur(48px) saturate(200%)",
        WebkitBackdropFilter: "blur(48px) saturate(200%)",
        border: "0.5px solid rgba(255,255,255,0.1)",
        borderRadius: 20,
        color: T.label,
        fontFamily: T.sans,
        padding: "16px 14px 20px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.55), inset 0 0.5px 0 rgba(255,255,255,0.07)",
        zIndex: 10,
        animation: "panel-slide-in 0.25s cubic-bezier(0.25,0.46,0.45,0.94) both",
        scrollbarWidth: "none",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 18,
      }}>
        <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.022em", color: T.label }}>
          Settings
        </span>
        <button
          onClick={() => setSettingsOpen(false)}
          aria-label="Close settings"
          style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(118,118,128,0.24)",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: T.secondary, flexShrink: 0,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" />
            <line x1="8.5" y1="1.5" x2="1.5" y2="8.5" />
          </svg>
        </button>
      </div>

      {/* DISPLAY */}
      <Section title="Display">
        <div style={{ padding: "10px 14px", borderBottom: `0.5px solid ${T.separator}` }}>
          <div style={{ fontSize: 11, color: T.tertiary, marginBottom: 6, letterSpacing: "0.02em", textTransform: "uppercase" }}>Screen</div>
          <select
            value={settings.monitor_index}
            onChange={e => changeMonitor(Number(e.target.value))}
            style={{
              width: "100%",
              background: "rgba(118,118,128,0.16)",
              color: T.label,
              border: "0.5px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: "9px 10px",
              fontSize: 14,
              fontFamily: T.sans,
              outline: "none",
              cursor: "pointer",
              letterSpacing: "-0.01em",
            }}
          >
            {settings.monitors?.map(m => (
              <option key={m.index} value={m.index}>
                {m.name} — {m.width}×{m.height}
              </option>
            ))}
          </select>
        </div>
        <div style={{ padding: "10px 14px" }}>
          <div style={{ fontSize: 11, color: T.tertiary, marginBottom: 8, letterSpacing: "0.02em", textTransform: "uppercase" }}>View</div>
          <SegmentedControl
            options={[
              { label: "Fit",     value: "fit" },
              { label: "Fill",    value: "fill" },
              { label: "Stretch", value: "stretch" },
              { label: "Native",  value: "native" },
            ]}
            value={viewMode}
            onChange={v => applySettings({ view_mode: v })}
          />
        </div>
      </Section>

      {/* PERFORMANCE */}
      <Section title="Performance">
        {settings.advisory && (
          <div style={{
            margin: "10px 14px",
            padding: "10px 12px",
            borderRadius: 8,
            background: settings.advisory.status === "warning"
              ? "rgba(255,214,10,0.1)"
              : "rgba(48,209,88,0.1)",
            border: `0.5px solid ${settings.advisory.status === "warning" ? "rgba(255,214,10,0.25)" : "rgba(48,209,88,0.25)"}`,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: settings.advisory.status === "warning" ? T.yellow : T.green, marginBottom: 3 }}>
              Resolution Advisor
            </div>
            <div style={{ fontSize: 12, color: T.secondary, lineHeight: 1.4 }}>{settings.advisory.message}</div>
            <div style={{ fontSize: 12, color: T.tertiary, marginTop: 4 }}>Try: {settings.advisory.recommended_resolutions?.join(", ")}</div>
          </div>
        )}

        <ChipRow chips={[{ label: "Low latency preset", onClick: () => applySettings({ fps: 30, quality: 65, scale: 0.75 }) }]} />

        <SliderRow
          label="Frame rate"
          sub={actualFps !== null && actualFps !== settings.fps ? `${actualFps}fps delivered` : undefined}
          min={1} max={120}
          value={settings.fps}
          onChange={e => applySettings({ fps: Number(e.target.value) })}
          format={v => `${v}fps`}
        />
        <SliderRow
          label="Quality"
          min={40} max={95}
          value={settings.quality}
          onChange={e => applySettings({ quality: Number(e.target.value) })}
        />
        <SliderRow
          label="Scale"
          min={0.25} max={1} step={0.05}
          value={settings.scale}
          onChange={e => applySettings({ scale: Number(e.target.value) })}
          format={v => `${Math.round(v * 100)}%`}
        />

        <Row label="Auto quality" last={!settings.stream_stats?.frame_id}>
          <Toggle
            checked={settings.auto_quality}
            onChange={e => applySettings({ auto_quality: e.target.checked })}
          />
        </Row>

        {settings.stream_stats?.frame_id && (
          <div style={{ padding: "9px 14px" }}>
            <span style={{ fontSize: 12, color: T.tertiary, fontFamily: T.mono }}>
              cap {settings.stream_stats.capture_ms}ms · enc {settings.stream_stats.encode_ms}ms · {Math.round(settings.stream_stats.size_bytes / 1024)}KB
            </span>
          </div>
        )}
      </Section>

      {/* COLOR */}
      <Section title="Color">
        <ChipRow chips={[
          { label: "Accurate", onClick: () => applySettings({ display_brightness: 1,    display_contrast: 1,    display_saturation: 1 }) },
          { label: "Vivid",    onClick: () => applySettings({ display_brightness: 0.98, display_contrast: 1.18, display_saturation: 1.18 }) },
          { label: "Text",     onClick: () => applySettings({ display_brightness: 0.94, display_contrast: 1.24, display_saturation: 1.02 }) },
          { label: "Punchy",   onClick: () => applySettings({ display_brightness: 0.96, display_contrast: 1.12, display_saturation: 1.08 }) },
        ]} />
        <SliderRow
          label="Brightness"
          min={0.75} max={1.25} step={0.01}
          value={settings.display_brightness}
          onChange={e => applySettings({ display_brightness: Number(e.target.value) })}
          format={v => `${Math.round(v * 100)}%`}
        />
        <SliderRow
          label="Contrast"
          min={0.75} max={1.5} step={0.01}
          value={settings.display_contrast}
          onChange={e => applySettings({ display_contrast: Number(e.target.value) })}
          format={v => `${Math.round(v * 100)}%`}
        />
        <SliderRow
          label="Saturation"
          min={0.75} max={1.5} step={0.01}
          value={settings.display_saturation}
          onChange={e => applySettings({ display_saturation: Number(e.target.value) })}
          format={v => `${Math.round(v * 100)}%`}
          last
        />
      </Section>

      {/* INPUT */}
      <Section title="Input">
        <Row label="Touch input">
          <Toggle checked={inputEnabled} onChange={e => applySettings({ input_enabled: e.target.checked })} />
        </Row>
        <Row label="Touch cursor">
          <Toggle checked={touchCursorEnabled} onChange={e => applySettings({ touch_cursor: e.target.checked })} />
        </Row>
        <SliderRow
          label="Scroll speed"
          min={0.25} max={3} step={0.05}
          value={settings.scroll_sensitivity}
          onChange={e => applySettings({ scroll_sensitivity: Number(e.target.value) })}
          format={v => `${Math.round(v * 100)}%`}
        />
        <Row label="Pinch zoom">
          <Toggle checked={settings.pinch_zoom_enabled} onChange={e => applySettings({ pinch_zoom_enabled: e.target.checked })} />
        </Row>
        <Row label="Three-finger gestures" sub="Swipe undo/redo · Pinch copy/paste" last>
          <Toggle checked={settings.three_finger_gestures} onChange={e => applySettings({ three_finger_gestures: e.target.checked })} />
        </Row>
      </Section>

      {/* LAYOUT */}
      <Section title="Layout">
        <div style={{ padding: "10px 14px", borderBottom: `0.5px solid ${T.separator}` }}>
          <div style={{ fontSize: 11, color: T.tertiary, marginBottom: 8, letterSpacing: "0.02em", textTransform: "uppercase" }}>Sidebar</div>
          <SegmentedControl
            options={[{ label: "Left", value: "left" }, { label: "Right", value: "right" }, { label: "Off", value: "off" }]}
            value={sidebarPosition}
            onChange={v => applySettings({ sidebar_position: v })}
          />
        </div>
        <div style={{ padding: "10px 14px" }}>
          <div style={{ fontSize: 11, color: T.tertiary, marginBottom: 8, letterSpacing: "0.02em", textTransform: "uppercase" }}>Touch Bar</div>
          <SegmentedControl
            options={[{ label: "Bottom", value: "bottom" }, { label: "Top", value: "top" }, { label: "Off", value: "off" }]}
            value={touchbarPosition}
            onChange={v => applySettings({ touchbar_position: v })}
          />
        </div>
      </Section>

      {/* Footer */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingTop: 4, paddingLeft: 2,
        color: settingsError ? "#ff453a" : T.tertiary,
        fontSize: 12,
      }}>
        <span>{settingsError || (savingSettings ? "Saving…" : "Changes apply instantly")}</span>
        <button
          onClick={() => loadSettings()}
          style={{
            background: "none", border: "none",
            color: T.blue, fontSize: 12,
            cursor: "pointer", fontFamily: T.sans,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
