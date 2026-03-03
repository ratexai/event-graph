/* ═══════════════════════════════════════════════════════════════
   @ratexai/event-graph — Utilities
   Layout, graph traversal, filtering, formatting
   ═══════════════════════════════════════════════════════════════ */

import type {
  EventNode, EventEdge, KolNode, NarrativeNode,
  KolAggregateStats, NarrativeAggregateStats,
  Point2D, LayoutConfig, FilterState,
  KolTier, Platform, Sentiment, SortField,
  NarrativeCategory, NarrativeSignal,
} from "../types";

// ─── Default Layout ─────────────────────────────────────────────

export const DEFAULT_LAYOUT: LayoutConfig = {
  padding: { top: 55, right: 70, bottom: 45, left: 70 },
  minNodeSpacing: 60,
  maxNodeSpacing: 130,
  nodeBaseRadius: 16,
  nodeWeightScale: 16,
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
  const gw = graphWidth - padding.left - padding.right;
  const gh = graphHeight - padding.top - padding.bottom;
  const maxCol = Math.max(...nodes.map((n) => n.col), 1);

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

// ─── Edge Derivation ────────────────────────────────────────────

/** Derive edges from EventNode.from[] fields */
export function deriveEventEdges(nodes: EventNode[]): EventEdge[] {
  const idSet = new Set(nodes.map((n) => n.id));
  return nodes.flatMap((node) =>
    (node.from || [])
      .filter((fid) => idSet.has(fid))
      .map((fid) => ({ from: fid, to: node.id, type: "causal" as const })),
  );
}

/** Derive KOL edges from .from[] + .influence[] */
export function deriveKolEdges(nodes: KolNode[]): EventEdge[] {
  const idSet = new Set(nodes.map((n) => n.id));
  const edges: EventEdge[] = [];

  for (const node of nodes) {
    for (const fid of node.from || []) {
      if (idSet.has(fid)) edges.push({ from: fid, to: node.id, type: "influence" });
    }
    for (const iid of node.influence || []) {
      if (idSet.has(iid)) edges.push({ from: node.id, to: iid, type: "influence" });
    }
  }

  return edges;
}

// ─── Graph Traversal ────────────────────────────────────────────

/** Collect full upstream + downstream chain from a node */
export function getEventChain(nodeId: string, nodes: EventNode[]): Set<string> {
  const visited = new Set<string>([nodeId]);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  // Build reverse index for downstream lookups
  const childMap = new Map<string, string[]>();
  for (const n of nodes) {
    for (const fid of n.from || []) {
      const arr = childMap.get(fid);
      if (arr) arr.push(n.id);
      else childMap.set(fid, [n.id]);
    }
  }

  // Trace upstream
  const upStack = [nodeId];
  while (upStack.length) {
    const id = upStack.pop()!;
    for (const fid of nodeMap.get(id)?.from || []) {
      if (!visited.has(fid)) { visited.add(fid); upStack.push(fid); }
    }
  }
  // Trace downstream
  const downStack = [nodeId];
  while (downStack.length) {
    const id = downStack.pop()!;
    for (const cid of childMap.get(id) || []) {
      if (!visited.has(cid)) { visited.add(cid); downStack.push(cid); }
    }
  }

  return visited;
}

/** Collect full KOL influence chain (upstream + downstream + influenced) */
export function getKolChain(kolId: string, nodes: KolNode[]): Set<string> {
  const visited = new Set<string>([kolId]);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Build reverse indexes
  const childMap = new Map<string, string[]>();
  const influencedByMap = new Map<string, string[]>();
  for (const n of nodes) {
    for (const fid of n.from || []) {
      const arr = childMap.get(fid);
      if (arr) arr.push(n.id); else childMap.set(fid, [n.id]);
    }
    for (const iid of n.influence || []) {
      const arr = influencedByMap.get(iid);
      if (arr) arr.push(n.id); else influencedByMap.set(iid, [n.id]);
    }
  }

  const queue = [kolId];
  while (queue.length) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (!node) continue;
    for (const fid of node.from || []) {
      if (!visited.has(fid)) { visited.add(fid); queue.push(fid); }
    }
    for (const iid of node.influence || []) {
      if (!visited.has(iid)) { visited.add(iid); queue.push(iid); }
    }
    for (const cid of childMap.get(id) || []) {
      if (!visited.has(cid)) { visited.add(cid); queue.push(cid); }
    }
  }

  return visited;
}

/** Get ordered ancestor chain ending at the given event (for detail panel) */
export function getEventChainList(eventId: string, nodes: EventNode[]): EventNode[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const list: EventNode[] = [];
  const visited = new Set<string>();

  const trace = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    const ev = nodeMap.get(id);
    if (!ev) return;
    for (const fid of ev.from || []) trace(fid);
    list.push(ev);
  };

  trace(eventId);
  return list;
}

// ─── KOL Stats ──────────────────────────────────────────────────

export function computeKolStats(nodes: KolNode[]): KolAggregateStats {
  const total = nodes.length;
  const empty: KolAggregateStats = {
    totalKols: 0, totalReach: 0, totalMentions: 0, avgEngRate: 0,
    positiveRatio: 0, tierBreakdown: {} as Record<KolTier, number>,
    platformBreakdown: {} as Record<Platform, number>,
  };
  if (total === 0) return empty;

  let totalReach = 0, totalMentions = 0, totalEng = 0, posCount = 0;
  const tierBreakdown = {} as Record<KolTier, number>;
  const platformBreakdown = {} as Record<Platform, number>;
  let topReach: KolNode = nodes[0];
  let topEng: KolNode = nodes[0];

  for (const k of nodes) {
    totalReach += k.reach;
    totalMentions += k.mentions;
    totalEng += k.engRate;
    if (k.sentiment === "pos") posCount++;
    tierBreakdown[k.tier] = (tierBreakdown[k.tier] || 0) + 1;
    platformBreakdown[k.platform] = (platformBreakdown[k.platform] || 0) + 1;
    if (k.reach > topReach.reach) topReach = k;
    if (k.engRate > topEng.engRate) topEng = k;
  }

  return {
    totalKols: total,
    totalReach,
    totalMentions,
    avgEngRate: totalEng / total,
    positiveRatio: Math.round((posCount / total) * 100),
    tierBreakdown,
    platformBreakdown,
    topKolByReach: topReach.id,
    topKolByEngagement: topEng.id,
  };
}

// ─── Filtering ──────────────────────────────────────────────────

export function filterEvents(nodes: EventNode[], filters: Partial<FilterState>): EventNode[] {
  let result = nodes;

  if (filters.activeEventTypes?.size) {
    result = result.filter((n) => filters.activeEventTypes!.has(n.type));
  }
  if (filters.minWeight != null) {
    result = result.filter((n) => n.weight >= filters.minWeight!);
  }
  if (filters.minImpact != null) {
    result = result.filter((n) => n.impact >= filters.minImpact!);
  }
  if (filters.searchQuery) {
    const q = filters.searchQuery.toLowerCase();
    result = result.filter((n) => n.label.toLowerCase().includes(q) || n.desc.toLowerCase().includes(q));
  }

  return result;
}

const KOL_SORT_ACCESSORS: Record<SortField, (k: KolNode) => number> = {
  followers: (k) => k.followers,
  engRate:   (k) => k.engRate,
  reach:     (k) => k.reach,
  mentions:  (k) => k.mentions,
  impact:    (k) => k.reach, // fallback: use reach as proxy for impact
  date:      (k) => k.col,
};

export function filterKols(nodes: KolNode[], filters: Partial<FilterState>): KolNode[] {
  let result = [...nodes];

  if (filters.activeTiers?.size) {
    result = result.filter((k) => filters.activeTiers!.has(k.tier));
  }
  if (filters.activePlatforms?.size) {
    result = result.filter((k) => filters.activePlatforms!.has(k.platform));
  }
  if (filters.searchQuery) {
    const q = filters.searchQuery.toLowerCase();
    result = result.filter((k) => k.name.toLowerCase().includes(q) || k.handle.toLowerCase().includes(q));
  }
  if (filters.sortField) {
    const accessor = KOL_SORT_ACCESSORS[filters.sortField] ?? KOL_SORT_ACCESSORS.followers;
    const dir = filters.sortOrder === "asc" ? 1 : -1;
    result.sort((a, b) => (accessor(a) - accessor(b)) * dir);
  }

  return result;
}

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

// ─── Formatting ─────────────────────────────────────────────────

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 10_000) return Math.round(n / 1000) + "K";
  if (n >= 1_000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

export function truncateLabel(label: string, maxLen = 15): string {
  return label.length > maxLen ? label.slice(0, maxLen - 1) + "\u2026" : label;
}

export function sentimentLabel(s: Sentiment): string {
  return s === "pos" ? "Positive" : s === "neg" ? "Negative" : "Neutral";
}

export function sentimentArrow(s: Sentiment): string {
  return s === "pos" ? "\u25B2" : s === "neg" ? "\u25BC" : "\u25CF";
}

export function nodeRadius(weight: number, layout: LayoutConfig = DEFAULT_LAYOUT): number {
  return layout.nodeBaseRadius + weight * layout.nodeWeightScale;
}

export function kolRadius(followers: number): number {
  return Math.max(22, Math.log10(Math.max(followers, 100)) * 12);
}

export function streamWidth(weight: number, layout: LayoutConfig = DEFAULT_LAYOUT): number {
  return Math.max(layout.streamMinWidth, weight * layout.streamWidthScale);
}

export function kolStreamWidth(followers: number): number {
  return Math.max(3, Math.log10(Math.max(followers, 1000)) * 4);
}

// ─── Narrative Utilities ─────────────────────────────────────────

/** Compute positions for narrative nodes */
export function computeNarrativePositions(
  nodes: NarrativeNode[], width: number, height: number, layout: LayoutConfig = DEFAULT_LAYOUT,
): ComputedPositions {
  return computeColumnPositions(nodes, width, height, layout);
}

/** Derive edges from NarrativeNode.from[] fields + anchor influenceLinks */
export function deriveNarrativeEdges(nodes: NarrativeNode[]): EventEdge[] {
  const idSet = new Set(nodes.map((n) => n.id));
  const edges: EventEdge[] = [];

  for (const node of nodes) {
    // Standard causal edges from .from[]
    for (const fid of node.from || []) {
      if (!idSet.has(fid)) continue;
      // Check if this edge has detailed influence data from anchor's influenceLinks
      const link = node.influenceLinks?.find((l) => l.id === fid);
      if (link) {
        edges.push({ from: fid, to: node.id, type: "influence", influence: link.influence, mechanism: link.mechanism });
      } else {
        edges.push({ from: fid, to: node.id, type: "causal" });
      }
    }
    // Also derive edges from influenceLinks that may not be in .from[] (e.g., anchor nodes)
    if (node.influenceLinks) {
      for (const link of node.influenceLinks) {
        if (!idSet.has(link.id)) continue;
        // Only add if not already derived from .from[]
        if (!(node.from || []).includes(link.id)) {
          edges.push({ from: link.id, to: node.id, type: "influence", influence: link.influence, mechanism: link.mechanism });
        }
      }
    }
  }

  return edges;
}

/** Collect full upstream + downstream chain from a narrative node */
export function getNarrativeChain(nodeId: string, nodes: NarrativeNode[]): Set<string> {
  const visited = new Set<string>([nodeId]);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const childMap = new Map<string, string[]>();
  for (const n of nodes) {
    for (const fid of n.from || []) {
      const arr = childMap.get(fid);
      if (arr) arr.push(n.id);
      else childMap.set(fid, [n.id]);
    }
  }

  const upStack = [nodeId];
  while (upStack.length) {
    const id = upStack.pop()!;
    for (const fid of nodeMap.get(id)?.from || []) {
      if (!visited.has(fid)) { visited.add(fid); upStack.push(fid); }
    }
  }
  const downStack = [nodeId];
  while (downStack.length) {
    const id = downStack.pop()!;
    for (const cid of childMap.get(id) || []) {
      if (!visited.has(cid)) { visited.add(cid); downStack.push(cid); }
    }
  }

  return visited;
}

/** Filter narrative nodes by category, signal, search, weight */
export function filterNarratives(nodes: NarrativeNode[], filters: Partial<FilterState>): NarrativeNode[] {
  let result = nodes;

  if (filters.activeCategories?.size) {
    result = result.filter((n) => filters.activeCategories!.has(n.category));
  }
  if (filters.activeSignals?.size) {
    result = result.filter((n) => filters.activeSignals!.has(n.signal));
  }
  if (filters.minWeight != null) {
    result = result.filter((n) => n.weight >= filters.minWeight!);
  }
  if (filters.hasMarket) {
    result = result.filter((n) => n.marketProb != null);
  }
  if (filters.searchQuery) {
    const q = filters.searchQuery.toLowerCase();
    result = result.filter((n) => n.label.toLowerCase().includes(q) || n.desc.toLowerCase().includes(q));
  }

  return result;
}

/** Compute aggregate stats for narrative nodes */
export function computeNarrativeStats(nodes: NarrativeNode[]): NarrativeAggregateStats {
  const total = nodes.length;
  const empty: NarrativeAggregateStats = {
    totalEvents: 0, totalVolume: 0, avgMomentum: 0,
    currentProb: 0, netOddsDelta: 0,
    signalBreakdown: {} as Record<NarrativeSignal, number>,
    categoryBreakdown: {} as Record<NarrativeCategory, number>,
    sentimentBreakdown: {} as Record<Sentiment, number>,
  };
  if (total === 0) return empty;

  let totalVolume = 0, totalMomentum = 0, netOddsDelta = 0;
  const signalBreakdown = {} as Record<NarrativeSignal, number>;
  const categoryBreakdown = {} as Record<NarrativeCategory, number>;
  const sentimentBreakdown = {} as Record<Sentiment, number>;
  let topByImpact: NarrativeNode = nodes[0];
  let topByOddsDelta: NarrativeNode = nodes[0];
  let lastProb = 50;

  for (const n of nodes) {
    totalVolume += n.volume;
    totalMomentum += n.momentum;
    netOddsDelta += n.oddsDelta;
    signalBreakdown[n.signal] = (signalBreakdown[n.signal] || 0) + 1;
    categoryBreakdown[n.category] = (categoryBreakdown[n.category] || 0) + 1;
    sentimentBreakdown[n.sentiment] = (sentimentBreakdown[n.sentiment] || 0) + 1;
    if (n.weight > topByImpact.weight) topByImpact = n;
    if (Math.abs(n.oddsDelta) > Math.abs(topByOddsDelta.oddsDelta)) topByOddsDelta = n;
    if (n.marketProb != null) lastProb = n.marketProb;
  }

  return {
    totalEvents: total,
    totalVolume,
    avgMomentum: totalMomentum / total,
    currentProb: lastProb,
    netOddsDelta,
    signalBreakdown,
    categoryBreakdown,
    sentimentBreakdown,
    topEventByImpact: topByImpact.id,
    topEventByOddsDelta: topByOddsDelta.id,
  };
}

/** Narrative node radius — 5 discrete size tiers based on weight, plus oddsDelta boost */
export function narrativeNodeRadius(weight: number, oddsDelta: number, _layout?: LayoutConfig): number {
  // 5 tiers per spec v2: XS(13) S(16) M(19) L(22) XL(26)
  const base = weight >= 0.92 ? 26
    : weight >= 0.80 ? 22
    : weight >= 0.65 ? 19
    : weight >= 0.50 ? 16
    : 13;
  const boost = Math.min(Math.abs(oddsDelta) * 0.2, 4);
  return base + boost;
}

/** Size tier label for display */
export function narrativeSizeTier(weight: number): "XS" | "S" | "M" | "L" | "XL" {
  if (weight >= 0.92) return "XL";
  if (weight >= 0.80) return "L";
  if (weight >= 0.65) return "M";
  if (weight >= 0.50) return "S";
  return "XS";
}

/** Narrative stream width based on weight + oddsDelta magnitude */
export function narrativeStreamWidth(weight: number, oddsDelta: number, layout: LayoutConfig = DEFAULT_LAYOUT): number {
  const base = Math.max(layout.streamMinWidth, weight * layout.streamWidthScale);
  const boost = Math.min(Math.abs(oddsDelta) * 0.2, 4);
  return base + boost;
}

/** Stream width for influence links to anchor nodes — proportional to |influence| */
export function influenceStreamWidth(influence: number): number {
  const absInf = Math.abs(influence);
  // Range: 3px for tiny influence, up to 18px for massive (-25pp)
  return Math.max(3, Math.min(18, absInf * 0.7 + 2));
}

/** Fixed anchor node radius — always XL per spec v2.1 */
export const ANCHOR_NODE_RADIUS = 30;

/** Check if a narrative node is an anchor (Polymarket future endpoint) */
export function isAnchorNode(node: NarrativeNode): boolean {
  return node.nodeType === "anchor" || (!!node.resolvesAt && !!node.marketPlatform && node.temporal === "future");
}

/** Check if a narrative node is a scenario (YES/NO branch) */
export function isScenarioNode(node: NarrativeNode): boolean {
  return node.nodeType === "scenario" || !!node.parentAnchor;
}

// ─── Tag-based emoji helpers ───────────────────────────────────

const TAG_FLAGS: Record<string, string> = {
  trump: "\u{1F1FA}\u{1F1F8}", "us-politics": "\u{1F1FA}\u{1F1F8}", "us-gov": "\u{1F1FA}\u{1F1F8}", "us-casualties": "\u{1F1FA}\u{1F1F8}",
  israel: "\u{1F1EE}\u{1F1F1}", iran: "\u{1F1EE}\u{1F1F7}",
  uae: "\u{1F1E6}\u{1F1EA}", dubai: "\u{1F1E6}\u{1F1EA}",
  qatar: "\u{1F1F6}\u{1F1E6}", bahrain: "\u{1F1E7}\u{1F1ED}",
  lebanon: "\u{1F1F1}\u{1F1E7}", beirut: "\u{1F1F1}\u{1F1E7}", hezbollah: "\u{1F1F1}\u{1F1E7}",
  iraq: "\u{1F1EE}\u{1F1F6}", saudi: "\u{1F1F8}\u{1F1E6}",
  pakistan: "\u{1F1F5}\u{1F1F0}", cyprus: "\u{1F1E8}\u{1F1FE}", uk: "\u{1F1EC}\u{1F1E7}",
  kuwait: "\u{1F1F0}\u{1F1FC}", russia: "\u{1F1F7}\u{1F1FA}",
  china: "\u{1F1E8}\u{1F1F3}", gcc: "\u{1F30D}",
  france: "\u{1F1EB}\u{1F1F7}", jordan: "\u{1F1EF}\u{1F1F4}",
  germany: "\u{1F1E9}\u{1F1EA}", japan: "\u{1F1EF}\u{1F1F5}", india: "\u{1F1EE}\u{1F1F3}",
};

const TAG_CONTEXT_ICONS: Record<string, string> = {
  strikes: "\u2694\uFE0F", military: "\u{1F3AF}", navy: "\u2693",
  oil: "\u{1F6E2}\uFE0F", hormuz: "\u{1F6A2}", shipping: "\u{1F6A2}",
  markets: "\u{1F4C9}", dow: "\u{1F4C9}", gold: "\u{1FA99}",
  nuclear: "\u2622\uFE0F", iaea: "\u2622\uFE0F", natanz: "\u2622\uFE0F",
  diplomacy: "\u{1F54A}\uFE0F", "prediction": "\u{1F4CA}", polymarket: "\u{1F4CA}",
  casualties: "\u{1F480}", leadership: "\u{1F451}", succession: "\u{1F451}",
  protests: "\u270A", branded: "\u{1F3E2}", tech: "\u{1F4BB}",
  amazon: "\u2601\uFE0F", opec: "\u{1F6E2}\uFE0F", musk: "\u{1D54F}",
  gas: "\u26FD", retaliation: "\u{1F680}", "ground-invasion": "\u{1FA96}",
  aerial: "\u2708\uFE0F", sanctions: "\u{1F6AB}",
};

/** Extract up to 2 emojis for a node: [flag, contextIcon] */
export function getNodeEmojis(tags?: string[]): [string, string] {
  if (!tags?.length) return ["", ""];
  let flag = "";
  let ctx = "";
  for (const t of tags) {
    if (!flag && TAG_FLAGS[t]) flag = TAG_FLAGS[t];
    if (!ctx && TAG_CONTEXT_ICONS[t]) ctx = TAG_CONTEXT_ICONS[t];
    if (flag && ctx) break;
  }
  return [flag, ctx];
}

/** Wrap a label into up to 2 lines of maxCharsPerLine each */
export function wrapLabel(label: string, maxCharsPerLine = 16): string[] {
  if (label.length <= maxCharsPerLine) return [label];
  const words = label.split(" ");
  const line1: string[] = [];
  const line2: string[] = [];
  let len = 0;
  let onLine2 = false;
  for (const w of words) {
    if (!onLine2 && len + w.length + (line1.length ? 1 : 0) > maxCharsPerLine && line1.length > 0) {
      onLine2 = true;
      len = 0;
    }
    if (onLine2) {
      line2.push(w);
    } else {
      line1.push(w);
    }
    len += w.length + 1;
  }
  const l1 = line1.join(" ");
  const l2 = line2.join(" ");
  if (!l2) return [l1.length > maxCharsPerLine ? l1.slice(0, maxCharsPerLine - 1) + "\u2026" : l1];
  return [l1, l2.length > maxCharsPerLine ? l2.slice(0, maxCharsPerLine - 1) + "\u2026" : l2];
}

/** Known source abbreviations for mini-badges */
const SOURCE_ABBR: Record<string, string> = {
  reuters: "R", "al jazeera": "AJ", cnbc: "CNBC", cnn: "CNN", bbc: "BBC",
  bloomberg: "BB", "washington post": "WP", washpost: "WP", npr: "NPR",
  "new york times": "NYT", "wall street journal": "WSJ", wsj: "WSJ",
  iaea: "IAEA", "times of israel": "ToI", haaretz: "HA", isw: "ISW",
  wikipedia: "W", polymarket: "PM", "fox business": "FOX",
  "white house": "WH", centcom: "CC", idf: "IDF",
  "iran state media": "IR", presstv: "IR", "press tv": "IR",
  cfr: "CFR", csis: "CSIS",
};

/** Get short source abbreviation from sourceName */
export function getSourceAbbr(sourceName?: string): string {
  if (!sourceName) return "";
  const lower = sourceName.toLowerCase();
  // Try each key as a substring match
  for (const [key, abbr] of Object.entries(SOURCE_ABBR)) {
    if (lower.includes(key)) return abbr;
  }
  // Fallback: first 2-3 chars uppercase
  return sourceName.slice(0, 3).toUpperCase();
}
