/* ═══════════════════════════════════════════════════════════════
   useContainerSize hook
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";
import { isBrowser } from "./useAnimation";

export function useContainerSize(ref: React.RefObject<HTMLElement | null>) {
  const [dims, setDims] = useState({ w: 1200, h: 700 });
  useEffect(() => {
    if (!isBrowser) return;
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setDims({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return dims;
}
