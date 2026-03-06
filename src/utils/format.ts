/* ═══════════════════════════════════════════════════════════════
   Formatting + sizing utilities
   ═══════════════════════════════════════════════════════════════ */

import type {
  NarrativeNode, EventNode,
  LayoutConfig, Sentiment,
} from "../types";

import { DEFAULT_LAYOUT } from "./layout";

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

// ─── Sizing ─────────────────────────────────────────────────────

/** Base node radius from weight — original compact linear formula */
export function nodeRadius(weight: number, layout: LayoutConfig = DEFAULT_LAYOUT): number {
  return layout.nodeBaseRadius + weight * layout.nodeWeightScale;
}

/**
 * Effective radius — same compact size as nodeRadius.
 * Kept for API compatibility; connectionCount is used for visual rings, not size.
 */
export function effectiveNodeRadius(
  event: EventNode,
  _connectionCount: number,
  layout: LayoutConfig = DEFAULT_LAYOUT,
): number {
  return nodeRadius(event.weight, layout);
}

/**
 * Importance tier for visual emphasis (rings, pulse).
 * Returns 0 (noise) | 1 (normal) | 2 (important) | 3 (critical).
 * Based on weight + connectivity + volume.
 */
export function importanceTier(
  weight: number,
  connectionCount: number,
  volume?: number,
): 0 | 1 | 2 | 3 {
  let score = weight;
  // Connectivity adds up to 0.25
  score += Math.min(connectionCount * 0.05, 0.25);
  // Volume adds up to 0.15
  if (typeof volume === "number" && volume > 0) {
    score += Math.min(Math.log10(Math.max(volume, 1)) * 0.03, 0.15);
  }
  if (score >= 0.85) return 3; // critical — triple ring + pulse
  if (score >= 0.6) return 2;  // important — double ring
  if (score >= 0.3) return 1;  // normal — single ring
  return 0;                    // noise — no extra ring
}

export function kolRadius(followers: number): number {
  return Math.max(25, Math.log10(Math.max(followers, 100)) * 14);
}

export function streamWidth(weight: number, layout: LayoutConfig = DEFAULT_LAYOUT): number {
  return Math.max(layout.streamMinWidth, weight * layout.streamWidthScale);
}

export function kolStreamWidth(followers: number): number {
  return Math.max(3, Math.log10(Math.max(followers, 1000)) * 4);
}

/** Narrative node radius — 5 discrete size tiers based on weight, plus oddsDelta boost */
export function narrativeNodeRadius(weight: number, oddsDelta: number, _layout?: LayoutConfig): number {
  // Original compact tiers: XS(15) S(18) M(22) L(25) XL(30)
  const base = weight >= 0.92 ? 30
    : weight >= 0.80 ? 25
    : weight >= 0.65 ? 22
    : weight >= 0.50 ? 18
    : 15;
  const boost = Math.min(Math.abs(oddsDelta) * 0.2, 4);
  return base + boost;
}

/** Effective narrative radius — compact size, rings handle emphasis */
export function effectiveNarrativeRadius(
  node: NarrativeNode,
  _connectionCount: number,
  _layout?: LayoutConfig,
): number {
  return narrativeNodeRadius(node.weight, node.oddsDelta);
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
export const ANCHOR_NODE_RADIUS = 35;

/** Check if a narrative node is an anchor (Polymarket future endpoint) */
export function isAnchorNode(node: NarrativeNode): boolean {
  return node.nodeType === "anchor" || (!!node.resolvesAt && !!node.marketPlatform && node.temporal === "future");
}

/** Check if a narrative node is a scenario (YES/NO branch) */
export function isScenarioNode(node: NarrativeNode): boolean {
  return node.nodeType === "scenario" || !!node.parentAnchor;
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
export const SOURCE_ABBR: Record<string, string> = {
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
