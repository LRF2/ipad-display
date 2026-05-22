import { useEffect, useRef, useState } from "react";

import { loadStatsRequest } from "../api";


export function useLiveStats(token, applySettings) {
  const [stats, setStats] = useState(null);
  const autoQualityCooldownRef = useRef(0);
  const stableSamplesRef = useRef(0);

  useEffect(() => {
    if (!token) {
      setStats(null);
      return undefined;
    }

    let cancelled = false;

    const refresh = () => {
      loadStatsRequest(token)
        .then((data) => {
          if (cancelled) return;
          setStats(data);

          const frame = data.stream_stats || {};
          const now = Date.now();
          const overloaded = (frame.encode_ms ?? 0) > 28 || (frame.size_bytes ?? 0) > 900 * 1024;
          if (data.auto_quality && overloaded && now > autoQualityCooldownRef.current) {
            autoQualityCooldownRef.current = now + 8000;
            stableSamplesRef.current = 0;
            applySettings({
              fps: Math.min(data.fps, 60),
              quality: Math.min(data.quality, 75),
              scale: Math.min(data.scale, 0.75),
            }).catch(() => {});
          } else if (data.auto_quality && !overloaded) {
            const stable = (frame.encode_ms ?? 999) < 14 && (frame.size_bytes ?? Infinity) < 350 * 1024;
            stableSamplesRef.current = stable ? stableSamplesRef.current + 1 : 0;
            if (stableSamplesRef.current >= 20 && now > autoQualityCooldownRef.current) {
              stableSamplesRef.current = 0;
              autoQualityCooldownRef.current = now + 12000;
              applySettings({
                fps: Math.min(60, data.fps + 5),
                quality: Math.min(85, data.quality + 5),
                scale: Math.min(1, Math.round((data.scale + 0.05) * 100) / 100),
              }).catch(() => {});
            }
          }
        })
        .catch(() => {
          if (!cancelled) setStats(null);
        });
    };

    refresh();
    const interval = setInterval(refresh, 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [applySettings, token]);

  return stats;
}
