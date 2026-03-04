/* ═══════════════════════════════════════════════════════════════
   useAnimationTime hook
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";

export const isBrowser = typeof window !== "undefined";

/** Check if user prefers reduced motion */
export function prefersReducedMotion(): boolean {
  return isBrowser && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Continuously incrementing time value in seconds (for SVG animations).
 *  Throttled to ~12fps to avoid re-rendering the entire tree at 60fps.
 *  Returns 0 when user prefers-reduced-motion. */
export function useAnimationTime(): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!isBrowser || prefersReducedMotion()) return;
    let af: number;
    const start = performance.now();
    let lastUpdate = 0;
    const THROTTLE_MS = 83; // ~12fps — sufficient for glow animations
    const tick = (now: number) => {
      if (now - lastUpdate >= THROTTLE_MS) {
        setT((now - start) / 1000);
        lastUpdate = now;
      }
      af = requestAnimationFrame(tick);
    };
    af = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(af);
  }, []);
  return t;
}
