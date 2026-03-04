/* ═══════════════════════════════════════════════════════════════
   SVG path helper utilities
   ═══════════════════════════════════════════════════════════════ */

import type { Point2D } from "../types";

// ─── SVG Path Helpers ───────────────────────────────────────────

/** Generate cubic bezier stream paths between two points */
export function streamPath(from: Point2D, to: Point2D, width: number) {
  const dx = to.x - from.x;
  const cp1x = from.x + dx * 0.42;
  const cp2x = to.x - dx * 0.42;
  const w = width / 2;

  return {
    /** Filled sankey shape */
    shape: `M${from.x},${from.y - w} C${cp1x},${from.y - w} ${cp2x},${to.y - w} ${to.x},${to.y - w} L${to.x},${to.y + w} C${cp2x},${to.y + w} ${cp1x},${from.y + w} ${from.x},${from.y + w} Z`,
    /** Center line for particle animation */
    center: `M${from.x},${from.y} C${cp1x},${from.y} ${cp2x},${to.y} ${to.x},${to.y}`,
    /** Top edge */
    top: `M${from.x},${from.y - w} C${cp1x},${from.y - w} ${cp2x},${to.y - w} ${to.x},${to.y - w}`,
    /** Bottom edge */
    bottom: `M${from.x},${from.y + w} C${cp1x},${from.y + w} ${cp2x},${to.y + w} ${to.x},${to.y + w}`,
  };
}
