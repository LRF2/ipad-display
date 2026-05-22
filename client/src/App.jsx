import { useCallback, useMemo, useState } from "react";

import { ConnectionOverlay } from "./components/ConnectionOverlay";
import { DisplaySurface } from "./components/DisplaySurface";
import { Hud } from "./components/Hud";
import { PairingScreen } from "./components/PairingScreen";
import { SettingsPanel } from "./components/SettingsPanel";
import { SidecarControls } from "./components/SidecarControls";
import { useDisplaySettings } from "./hooks/useDisplaySettings";
import { useLiveStats } from "./hooks/useLiveStats";
import { usePairing } from "./hooks/usePairing";
import { useStreamStatus } from "./hooks/useStreamStatus";
import { useViewportSize } from "./hooks/useViewportSize";
import { useWakeLock } from "./hooks/useWakeLock";
import { useWebSocketInput } from "./hooks/useWebSocketInput";
import { getDisplayBox } from "./utils/display";


export default function App() {
  const viewportSize = useViewportSize();
  const {
    token,
    pin,
    setPin,
    pairingError,
    pairingBusy,
    pairDevice,
    clearSavedToken,
  } = usePairing();
  const {
    displayInfo,
    settings,
    settingsError,
    savingSettings,
    loadSettings,
    applySettings,
  } = useDisplaySettings(token, viewportSize, clearSavedToken);
  const {
    wsStatus,
    latency,
    send,
    sendMouseDown,
    releaseMouse,
    reconnectWebSocket,
  } = useWebSocketInput(token);
  const {
    streamStatus,
    mediaStream,
    streamSrc,
    streamMode,
    handleStreamError,
    handleStreamLoad,
    reconnectStream,
  } = useStreamStatus(token);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showHUD, setShowHUD] = useState(true);
  const liveStats = useLiveStats(token, applySettings);
  const actualFps = liveStats?.delivery_stats?.stream_fps ?? null;
  useWakeLock(Boolean(token) && streamStatus === "live");

  const viewMode = settings?.view_mode ?? "fit";
  const inputEnabled = settings?.input_enabled ?? true;
  const touchCursorEnabled = settings?.touch_cursor ?? true;
  const sidebarPosition = settings?.sidebar_position ?? "left";
  const touchbarPosition = settings?.touchbar_position ?? "bottom";
  const displayBrightness = settings?.display_brightness ?? 1;
  const displayContrast = settings?.display_contrast ?? 1;
  const displaySaturation = settings?.display_saturation ?? 1;
  const pinchZoomEnabled = settings?.pinch_zoom_enabled ?? true;
  const threeFingerGestures = settings?.three_finger_gestures ?? true;

  const displayBox = useMemo(
    () => getDisplayBox(displayInfo, viewportSize, viewMode),
    [displayInfo, viewportSize, viewMode]
  );

  const reconnectAll = useCallback(() => {
    reconnectStream();
    reconnectWebSocket();
    loadSettings().catch(() => {});
  }, [loadSettings, reconnectStream, reconnectWebSocket]);

  const changeMonitor = useCallback(
    (monitorIndex) => {
      applySettings({ monitor_index: monitorIndex, view_mode: "fit" });
    },
    [applySettings]
  );

  if (!token) {
    return (
      <PairingScreen
        pin={pin}
        setPin={setPin}
        pairingBusy={pairingBusy}
        pairingError={pairingError}
        pairDevice={pairDevice}
      />
    );
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <DisplaySurface
        mediaStream={mediaStream}
        streamSrc={streamSrc}
        streamMode={streamMode}
        streamStatus={streamStatus}
        displayBox={displayBox}
        viewMode={viewMode}
        inputEnabled={inputEnabled}
        touchCursorEnabled={touchCursorEnabled}
        displayBrightness={displayBrightness}
        displayContrast={displayContrast}
        displaySaturation={displaySaturation}
        pinchZoomEnabled={pinchZoomEnabled}
        threeFingerGestures={threeFingerGestures}
        keepHudVisible={settingsOpen}
        send={send}
        sendMouseDown={sendMouseDown}
        releaseMouse={releaseMouse}
        onStreamLoad={handleStreamLoad}
        onStreamError={handleStreamError}
        setShowHUD={setShowHUD}
      />

      <ConnectionOverlay streamStatus={streamStatus} wsStatus={wsStatus} />

      {settings && (
        <SidecarControls
          sidebarPosition={sidebarPosition}
          touchbarPosition={touchbarPosition}
          send={send}
          disconnect={clearSavedToken}
        />
      )}

      {showHUD && (
        <Hud
          streamStatus={streamStatus}
          wsStatus={wsStatus}
          displayInfo={displayInfo}
          liveStats={liveStats}
          actualFps={actualFps}
          latency={latency}
          inputEnabled={inputEnabled}
          settingsOpen={settingsOpen}
          applySettings={applySettings}
          reconnectAll={reconnectAll}
          setSettingsOpen={setSettingsOpen}
          setShowHUD={setShowHUD}
        />
      )}

      {showHUD && settingsOpen && settings && (
        <SettingsPanel
          settings={settings}
          actualFps={actualFps}
          viewMode={viewMode}
          inputEnabled={inputEnabled}
          touchCursorEnabled={touchCursorEnabled}
          sidebarPosition={sidebarPosition}
          touchbarPosition={touchbarPosition}
          settingsError={settingsError}
          savingSettings={savingSettings}
          applySettings={applySettings}
          loadSettings={loadSettings}
          changeMonitor={changeMonitor}
          setSettingsOpen={setSettingsOpen}
        />
      )}

      {showHUD && (
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            color: "rgba(255,255,255,0.35)",
            fontFamily: "-apple-system, sans-serif",
            fontSize: 12,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          Double-tap to toggle HUD
        </div>
      )}
    </div>
  );
}
