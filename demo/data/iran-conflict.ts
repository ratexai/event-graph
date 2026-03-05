/**
 * 2026 Iran Conflict: Expanded Timeline — 74 nodes
 *
 * Source: Event database test/iran-2026-conflict-graph-expanded.json
 * Normalized to NarrativeFlowData via normalize.ts
 */
import type { RawIranConflictJson } from "./normalize";
import { normalizeIranConflict } from "./normalize";
import rawJson from "../../Event database test/iran-2026-conflict-graph-expanded.json";

export const iranConflictData = normalizeIranConflict(rawJson as unknown as RawIranConflictJson);
