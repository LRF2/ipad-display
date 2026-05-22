import { useCallback, useEffect, useMemo, useState } from "react";

import { buildViewportParams, loadSettingsRequest, patchSettingsRequest } from "../api";


export function useDisplaySettings(token, viewportSize, clearSavedToken) {
  const [displayInfo, setDisplayInfo] = useState(null);
  const [settings, setSettings] = useState(null);
  const [settingsError, setSettingsError] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const viewportKey = useMemo(() => {
    const viewport = buildViewportParams(viewportSize);
    return `${viewport.viewport_width}x${viewport.viewport_height}`;
  }, [viewportSize]);

  const loadSettings = useCallback(() => {
    if (!token) return Promise.reject(new Error("missing token"));

    return loadSettingsRequest(token, viewportSize)
      .then((data) => {
        setSettings(data);
        setDisplayInfo(data);
        setSettingsError("");
        return data;
      })
      .catch((error) => {
        if (error.status === 401) {
          clearSavedToken();
        }
        throw error;
      });
  }, [clearSavedToken, token, viewportSize]);

  useEffect(() => {
    if (!token) {
      setSettings(null);
      setDisplayInfo(null);
      setSettingsError("");
      return;
    }

    loadSettings().catch(() => setSettingsError("Could not load settings"));
  }, [loadSettings, token, viewportKey]);

  const applySettings = useCallback(
    (patch) => {
      if (!token) return Promise.resolve();
      setSavingSettings(true);
      setSettingsError("");

      return patchSettingsRequest(token, viewportSize, patch)
        .then((data) => {
          setSettings(data);
          setDisplayInfo(data);
          return data;
        })
        .catch((error) => {
          if (error.status === 401) {
            clearSavedToken();
          }
          setSettingsError("Could not apply settings");
        })
        .finally(() => setSavingSettings(false));
    },
    [clearSavedToken, token, viewportSize]
  );

  return {
    displayInfo,
    settings,
    settingsError,
    savingSettings,
    loadSettings,
    applySettings,
  };
}
