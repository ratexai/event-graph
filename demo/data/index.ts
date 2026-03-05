/**
 * Narrative data registry
 *
 * Each narrative is a self-contained NarrativeFlowData object.
 * Add new narratives by creating a file in demo/data/ and registering here.
 */
export { iranConflictData } from "./iran-conflict";
export { aiRevolutionData } from "./ai-revolution";

import type { Narrative } from "../../src";
import { iranConflictData } from "./iran-conflict";
import { aiRevolutionData } from "./ai-revolution";
import type { NarrativeFlowData } from "../../src";

// ─── Narrative catalogue (for switcher UI) ───────────────────

/** All available narratives indexed by id */
export const narrativeCatalogue: Record<string, NarrativeFlowData> = {
  "iran-2026-conflict-expanded": iranConflictData,
  "ai-revolution": aiRevolutionData,
  // "ukraine-2026-spring-offensive": ukraineData,   // TODO
  // "us-china-tariffs-2026": tariffData,             // TODO
  // "crypto-sec-2026": cryptoData,                   // TODO
};

/** Slim narrative summaries for the switcher dropdown */
export const narrativeList: Narrative[] = [
  iranConflictData.narrative!,
  aiRevolutionData.narrative!,
  // ── Stubs for upcoming narratives ──
  {
    id: "ukraine-2026-spring",
    title: "Ukraine: 2026 Spring Offensive & Ceasefire Talks",
    category: "war",
    status: "active",
    sentimentTrend: "neu",
    currentProb: 28,
    startProb: 35,
    probHistory: [35, 32, 30, 28],
    branches: [
      "front \u2014 Zaporizhzhia / Donetsk / Kursk lines",
      "diplomacy \u2014 Trump envoy / Zelensky / Putin",
      "aid \u2014 US/EU funding + weapon shipments",
      "econ \u2014 grain corridor / EU energy",
    ],
  },
  {
    id: "us-china-tariffs-2026",
    title: "US-China Trade War: Tariff Escalation 2026",
    category: "macro",
    status: "active",
    sentimentTrend: "neg",
    currentProb: 40,
    startProb: 55,
    probHistory: [55, 50, 45, 40],
    branches: [
      "tariffs \u2014 rounds of tariff hikes + retaliation",
      "tech \u2014 chip export controls / Huawei / TikTok",
      "markets \u2014 S&P / Hang Seng / CNY impact",
      "diplomacy \u2014 G20 / bilateral summits",
    ],
  },
  {
    id: "crypto-sec-2026",
    title: "Crypto: SEC Enforcement & Stablecoin Bills",
    category: "regulation",
    status: "active",
    sentimentTrend: "pos",
    currentProb: 65,
    startProb: 40,
    probHistory: [40, 45, 50, 55, 60, 65],
    branches: [
      "enforcement \u2014 SEC lawsuits / settlements",
      "legislation \u2014 stablecoin bill / FIT21",
      "markets \u2014 BTC ETF flows / altcoin impact",
      "defi \u2014 DeFi regulation / DAO governance",
    ],
  },
];

/** Default narrative to show on load */
export const defaultNarrativeId = "iran-2026-conflict-expanded";
