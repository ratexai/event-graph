/**
 * AI Revolution Prediction Map — 81 JSON + 22 enriched = 103 nodes
 *
 * Source: Event database test/ai-revolution-prediction-map.json
 * Enriched: 12 Polymarket anchors (verified) + 10 YES/NO scenarios
 * Normalized to NarrativeFlowData via normalize.ts
 */
import type { RawAiRevolutionJson } from "./normalize";
import type { NarrativeCuiBono } from "../../src";
import { normalizeAiRevolution } from "./normalize";
import { aiEnrichedNodes } from "./ai-enriched-nodes";
import rawJson from "../../Event database test/ai-revolution-prediction-map.json";

const baseData = normalizeAiRevolution(rawJson as unknown as RawAiRevolutionJson);

// ─── Cui Bono: aggregated scoreboard ────────────────────────────
const cuiBono: NarrativeCuiBono = {
  countryScores: {
    "United States": 15,
    China: -8,
    "United Kingdom": 8,
    Canada: 6,
    France: 4,
    Germany: 2,
    Israel: 5,
    India: 3,
    Japan: 1,
    "South Korea": 2,
    "Saudi Arabia": 3,
    UAE: 4,
    Singapore: 3,
    Australia: 1,
    Russia: -5,
    Taiwan: 10,
    Ireland: 3,
    Sweden: 2,
    Switzerland: 1,
    Netherlands: 2,
  },
  companyWinners: [
    { name: "NVIDIA", delta: 22, reason: "GPU monopoly: H100/B200/GB300 demand infinite" },
    { name: "Anthropic", delta: 18, reason: "Claude Opus 4.6 Arena #1, enterprise adoption surging" },
    { name: "Google DeepMind", delta: 14, reason: "Gemini 3.x closing gap, TPU v6e cost advantage" },
    { name: "Microsoft", delta: 12, reason: "Azure AI + OpenAI partnership, Copilot revenue" },
    { name: "OpenAI", delta: 16, reason: "$15B ARR, GPT-5 series, 300M+ users" },
    { name: "TSMC", delta: 15, reason: "Sole manufacturer of AI chips, 3nm/2nm ramp" },
    { name: "Amazon (AWS)", delta: 10, reason: "Bedrock platform, custom Trainium chips" },
    { name: "Meta", delta: 8, reason: "Llama open source ecosystem, 1M GPU cluster" },
    { name: "Apple", delta: 6, reason: "Apple Intelligence on 2B+ devices" },
    { name: "Palantir", delta: 9, reason: "AIP platform, government AI contracts" },
  ],
  companyLosers: [
    { name: "Traditional SaaS", delta: -8, reason: "AI-native competitors eroding moats" },
    { name: "Chegg", delta: -15, reason: "Student AI usage killing tutoring business" },
    { name: "Stack Overflow", delta: -10, reason: "Developer traffic down 40% to AI tools" },
    { name: "Freelancer platforms", delta: -12, reason: "AI replacing entry-level coding/writing" },
    { name: "Intel", delta: -8, reason: "GPU/AI chip market share near zero" },
    { name: "Legacy consulting", delta: -6, reason: "AI automating analyst work" },
    { name: "Call center operators", delta: -10, reason: "AI voice agents replacing human agents" },
    { name: "Translation services", delta: -12, reason: "Real-time AI translation quality" },
    { name: "Stock photography", delta: -14, reason: "AI image generation displacing" },
    { name: "AMD (relative)", delta: -3, reason: "MI300X gaining but CUDA lock-in persists" },
  ],
  indexChanges: [
    { name: "NASDAQ", delta: 12, reason: "AI mega-caps driving index to ATH" },
    { name: "S&P 500", delta: 6, reason: "AI spending lifting tech sector" },
    { name: "SOX (Semis)", delta: 18, reason: "NVIDIA + TSMC + Broadcom AI surge" },
    { name: "NVIDIA (NVDA)", delta: 35, reason: "$3.5T → $4.7T market cap in 2025-26" },
    { name: "Magnificent 7", delta: 15, reason: "All 7 investing heavily in AI" },
    { name: "Russell 2000", delta: -2, reason: "Small caps losing to AI-powered competitors" },
    { name: "EU AI stocks", delta: 8, reason: "Mistral, SAP AI adoption" },
    { name: "China Tech (KWEB)", delta: -5, reason: "US chip export controls constraining" },
    { name: "BTC", delta: 4, reason: "AI-crypto narrative: decentralized compute" },
    { name: "Energy (XLE)", delta: 6, reason: "Data center power demand surge" },
    { name: "Uranium (URA)", delta: 10, reason: "Nuclear for AI data center power" },
    { name: "VIX", delta: -3, reason: "Low volatility from AI-driven efficiency" },
  ],
};

// Merge JSON nodes + enriched Polymarket anchors/scenarios
// Add extra timeSlots for anchor columns
export const aiRevolutionData = {
  ...baseData,
  nodes: [...baseData.nodes, ...aiEnrichedNodes],
  narrative: {
    ...baseData.narrative!,
    cuiBono,
  },
  timeSlots: [
    ...baseData.timeSlots,
    { index: 17, label: "2027+ (prog)", startDate: "2027-01-01", endDate: "2027-12-31", type: "anchor_date" as const },
  ],
};
