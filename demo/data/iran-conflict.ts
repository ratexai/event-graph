/**
 * 2026 Iran Conflict: Expanded Timeline — 74 fact nodes + 21 enriched (anchors + scenarios)
 *
 * Fact nodes: Event database test/iran-2026-conflict-graph-expanded.json
 * Enriched nodes: 7 Polymarket anchors + 14 YES/NO scenarios (hand-curated)
 * Normalized to NarrativeFlowData via normalize.ts
 */
import type { RawIranConflictJson } from "./normalize";
import { normalizeIranConflict } from "./normalize";
import { iranEnrichedNodes } from "./iran-enriched-nodes";
import rawJson from "../../Event database test/iran-2026-conflict-graph-expanded.json";

const baseData = normalizeIranConflict(rawJson as unknown as RawIranConflictJson);

// Merge fact nodes from JSON + enriched anchor/scenario nodes
// Also extend timeSlots to cover anchor columns (col 11-15)
export const iranConflictData = {
  ...baseData,
  nodes: [...baseData.nodes, ...iranEnrichedNodes],
  timeSlots: [
    ...baseData.timeSlots,
    { index: 11, label: "Mar 8-10 (prog)", startDate: "2026-03-08", endDate: "2026-03-10", type: "near_future" as const },
    { index: 12, label: "Mar 11-15 (prog)", startDate: "2026-03-11", endDate: "2026-03-15", type: "anchor_date" as const },
    { index: 13, label: "Mar 16-31 (prog)", startDate: "2026-03-16", endDate: "2026-03-31", type: "anchor_date" as const },
    { index: 14, label: "Apr-Jun (prog)", startDate: "2026-04-01", endDate: "2026-06-30", type: "anchor_date" as const },
    { index: 15, label: "Scenarios", startDate: "2026-06-01", endDate: "2026-12-31", type: "anchor_date" as const },
  ],
};
