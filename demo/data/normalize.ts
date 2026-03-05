/**
 * Normalizers for raw JSON prediction map data → NarrativeFlowData
 *
 * Handles schema differences between the "Event database test" JSON format
 * and the product's TypeScript type definitions.
 */
import type {
  NarrativeFlowData,
  NarrativeNode,
  Narrative,
  TimeSlot,
  Sentiment,
} from "../../src";

// ─── Raw JSON types (loose) ────────────────────────────────────

interface RawTimeSlot {
  index?: number;
  col?: number;
  label: string;
  startDate?: string;
  endDate?: string;
  type?: string;
}

interface RawNode {
  id: string;
  col: number;
  label: string;
  category: string;
  signal: string;
  sentiment: number | string;
  desc: string;
  weight: number;
  oddsDelta: number;
  marketProb?: number | null;
  sourceAuthority: number;
  momentum: number | string;
  volume: number | string;
  from?: string[];
  extra?: string | Record<string, unknown>;
  sourceName?: string;
  sourceUrl?: string;
  timestamp?: string;
  tags?: string[];
  [key: string]: unknown;
}

interface RawNarrative {
  id: string;
  title: string;
  category: string;
  status: string;
  sentimentTrend: string;
  currentProb: number;
  startProb: number;
  probHistory?: number[];
  branches?: string[];
}

interface RawBranch {
  id: string;
  label: string;
  color?: string;
}

/** Raw JSON shape for AI revolution map */
export interface RawAiRevolutionJson {
  id: string;
  title: string;
  currentProb: number;
  probLabel?: string;
  probHistory?: number[];
  timeSlots: RawTimeSlot[];
  branches: RawBranch[];
  nodes: RawNode[];
  cuiBono?: unknown;
  rightPanel?: { polymarketAnchors?: unknown[] };
}

/** Raw JSON shape for Iran conflict map */
export interface RawIranConflictJson {
  timeSlots: RawTimeSlot[];
  narrative: RawNarrative;
  nodes: RawNode[];
  rightPanel?: { polymarketAnchors?: unknown[] };
}

// ─── Field normalizers ─────────────────────────────────────────

function normalizeSentiment(val: number | string): Sentiment {
  if (typeof val === "string") {
    if (val === "pos" || val === "neg" || val === "neu") return val;
    return "neu";
  }
  if (val > 0.15) return "pos";
  if (val < -0.15) return "neg";
  return "neu";
}

function normalizeMomentum(val: number | string): number {
  if (typeof val === "number") return val;
  if (val === "↑" || val === "↑↑") return 3;
  if (val === "↓" || val === "↓↓") return -3;
  if (val === "→" || val === "—") return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function normalizeVolume(val: number | string): number {
  if (typeof val === "number") return val;
  switch (val) {
    case "high":
      return 5000;
    case "medium":
      return 2500;
    case "low":
      return 1000;
    default:
      return 1000;
  }
}

function normalizeExtra(val: string | Record<string, unknown> | undefined): string | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    const entries = Object.entries(val);
    if (entries.length === 0) return undefined;
    return entries.map(([k, v]) => `${k}: ${v}`).join(", ");
  }
  return undefined;
}

function normalizeTimeSlot(raw: RawTimeSlot, index: number): TimeSlot {
  return {
    index: raw.index ?? raw.col ?? index,
    label: raw.label,
    startDate: raw.startDate ?? "",
    endDate: raw.endDate ?? "",
    type: raw.type as TimeSlot["type"],
  };
}

function normalizeNode(raw: RawNode): NarrativeNode {
  return {
    id: raw.id,
    col: raw.col,
    label: raw.label,
    category: raw.category as NarrativeNode["category"],
    signal: raw.signal as NarrativeNode["signal"],
    sentiment: normalizeSentiment(raw.sentiment),
    desc: raw.desc,
    weight: raw.weight,
    oddsDelta: raw.oddsDelta,
    marketProb: raw.marketProb ?? null,
    sourceAuthority: raw.sourceAuthority,
    momentum: normalizeMomentum(raw.momentum),
    volume: normalizeVolume(raw.volume),
    from: raw.from,
    extra: normalizeExtra(raw.extra),
    sourceName: raw.sourceName,
    sourceUrl: raw.sourceUrl,
    timestamp: raw.timestamp,
    tags: raw.tags,
  };
}

// ─── Top-level normalizers ─────────────────────────────────────

/** Normalize the AI revolution raw JSON → NarrativeFlowData */
export function normalizeAiRevolution(raw: RawAiRevolutionJson): NarrativeFlowData {
  const nodes = raw.nodes.map(normalizeNode);
  const timeSlots = raw.timeSlots.map((ts, i) => normalizeTimeSlot(ts, i));

  const narrative: Narrative = {
    id: raw.id,
    title: raw.title,
    category: "ai",
    status: "active",
    sentimentTrend: "neu",
    currentProb: raw.currentProb,
    startProb: raw.probHistory?.[0] ?? raw.currentProb,
    probHistory: raw.probHistory,
    branches: raw.branches.map((b) => `${b.id} — ${b.label}`),
  };

  return { nodes, timeSlots, narrative };
}

/** Normalize the Iran conflict raw JSON → NarrativeFlowData */
export function normalizeIranConflict(raw: RawIranConflictJson): NarrativeFlowData {
  const nodes = raw.nodes.map(normalizeNode);
  const timeSlots = raw.timeSlots.map((ts, i) => normalizeTimeSlot(ts, i));

  const narrative: Narrative = {
    id: raw.narrative.id,
    title: raw.narrative.title,
    category: raw.narrative.category as Narrative["category"],
    status: raw.narrative.status as Narrative["status"],
    sentimentTrend: raw.narrative.sentimentTrend as Sentiment,
    currentProb: raw.narrative.currentProb,
    startProb: raw.narrative.startProb,
    probHistory: raw.narrative.probHistory,
    branches: raw.narrative.branches,
  };

  return { nodes, timeSlots, narrative };
}
