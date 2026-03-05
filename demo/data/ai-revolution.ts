/**
 * AI Revolution Prediction Map — 81 nodes
 *
 * Source: Event database test/ai-revolution-prediction-map.json
 * Normalized to NarrativeFlowData via normalize.ts
 */
import type { RawAiRevolutionJson } from "./normalize";
import { normalizeAiRevolution } from "./normalize";
import rawJson from "../../Event database test/ai-revolution-prediction-map.json";

export const aiRevolutionData = normalizeAiRevolution(rawJson as unknown as RawAiRevolutionJson);
