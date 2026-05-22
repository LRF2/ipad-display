import { useEffect, useState } from "react";


const getViewportSize = () => ({
  w: window.visualViewport?.width ?? window.innerWidth,
  h: window.visualViewport?.height ?? window.innerHeight,
});


export function useViewportSize() {
  const [viewportSize, setViewportSize] = useState(getViewportSize);

  useEffect(() => {
    const update = () => setViewportSize(getViewportSize());

    window.visualViewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return viewportSize;
}
