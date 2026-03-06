/* ═══════════════════════════════════════════════════════════════
   Layout computation utilities
   ═══════════════════════════════════════════════════════════════ */

import type {
  EventNode, KolNode, NarrativeNode,
  Point2D, LayoutConfig,
} from "../types";

// ─── Default Layout ─────────────────────────────────────────────

export const DEFAULT_LAYOUT: LayoutConfig = {
  padding: { top: 55, right: 98, bottom: 45, left: 98 },
  minNodeSpacing: 99,
  maxNodeSpacing: 213,
  nodeBaseRadius: 12,
  nodeWeightScale: 38,
  streamWidthScale: 22,
  streamMinWidth: 4,
};

export function mergeLayout(overrides?: Partial<LayoutConfig>): LayoutConfig {
  if (!overrides) return DEFAULT_LAYOUT;
  return {
    ...DEFAULT_LAYOUT,
    ...overrides,
    padding: { ...DEFAULT_LAYOUT.padding, ...overrides.padding },
  };
}

// ─── Layout Computation ─────────────────────────────────────────

export interface ComputedPositions {
  [nodeId: string]: Point2D;
}

interface HasColId { id: string; col: number; }

/** Generic column-based layout: distributes nodes vertically within time columns */
function computeColumnPositions<T extends HasColId>(
  nodes: T[],
  graphWidth: number,
  graphHeight: number,
  layout: LayoutConfig,
): ComputedPositions {
  const { padding, minNodeSpacing, maxNodeSpacing } = layout;
  const maxCol = Math.max(...nodes.map((n) => n.col), 1);
  const rawGw = graphWidth - padding.left - padding.right;
  const rawGh = graphHeight - padding.top - padding.bottom;
  // Enforce minimum column spacing so columns never compress on small viewports.
  // The map supports pan/zoom, so content can extend beyond the visible area.
  const MIN_COL_PX = 115;
  const gw = Math.max(rawGw, maxCol * MIN_COL_PX);
  const gh = Math.max(rawGh, 300);

  const cols = new Map<number, T[]>();
  for (const n of nodes) {
    const arr = cols.get(n.col);
    if (arr) arr.push(n);
    else cols.set(n.col, [n]);
  }

  const positions: ComputedPositions = {};
  for (const [col, colNodes] of cols) {
    const x = padding.left + (gw / maxCol) * col;
    const count = colNodes.length;
    const spacing = Math.min(Math.max(gh / (count + 1), minNodeSpacing), maxNodeSpacing);
    const totalH = spacing * (count - 1);
    const startY = padding.top + gh / 2 - totalH / 2;
    colNodes.forEach((node, i) => {
      positions[node.id] = { x, y: startY + i * spacing };
    });
  }

  return positions;
}

/** Compute positions for event nodes */
export function computeEventPositions(
  nodes: EventNode[], width: number, height: number, layout: LayoutConfig = DEFAULT_LAYOUT,
): ComputedPositions {
  return computeColumnPositions(nodes, width, height, layout);
}

/** Compute positions for KOL nodes */
export function computeKolPositions(
  nodes: KolNode[], width: number, height: number, layout: LayoutConfig = DEFAULT_LAYOUT,
): ComputedPositions {
  return computeColumnPositions(nodes, width, height, layout);
}

/** Compute positions for narrative nodes */
export function computeNarrativePositions(
  nodes: NarrativeNode[], width: number, height: number, layout: LayoutConfig = DEFAULT_LAYOUT,
): ComputedPositions {
  return computeColumnPositions(nodes, width, height, layout);
}
