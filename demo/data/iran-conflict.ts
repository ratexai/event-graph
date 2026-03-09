/**
 * Iran–US–Israel War: 74 JSON + 18 fact + 14 anchors + 16 scenarios + 23 Day-6
 * + 17 Day-7 + 11 Day-7-extra + 11 Day-8 + 6 Day-9 + 10 Day-10 = 200 nodes
 *
 * Fact nodes: Event database test/iran-2026-conflict-graph-expanded.json
 * Enriched nodes: 14 Polymarket anchors (verified) + 16 scenario branches
 * Day 7-10: Deduplicated merge of Iran-framed + balanced multi-perspective datasets
 * Normalized to NarrativeFlowData via normalize.ts
 */
import type { RawIranConflictJson } from "./normalize";
import type { NarrativeCuiBono } from "../../src";
import { normalizeIranConflict } from "./normalize";
import { iranEnrichedNodes } from "./iran-enriched-nodes";
import { iranDay6Nodes } from "./iran-day6-nodes";
import { iranDay7Nodes } from "./iran-day7-nodes";
import { iranDay7ExtraNodes } from "./iran-day7-extra-nodes";
import { iranDay8Nodes } from "./iran-day8-nodes";
import { iranDay9Nodes } from "./iran-day9-nodes";
import { iranDay10Nodes } from "./iran-day10-nodes";
import rawJson from "../../Event database test/iran-2026-conflict-graph-expanded.json";

const baseData = normalizeIranConflict(rawJson as unknown as RawIranConflictJson);

// ─── Cui Bono: aggregated scoreboard ────────────────────────────
const cuiBono: NarrativeCuiBono = {
  // Day 10 cumulative country impact scores
  // Positive = net benefit, Negative = net loss
  countryScores: {
    "United States": -18, // $9-12B spent, 7 KIA, munitions depleting, objectives unmet
    Israel: -10, // Military success but Hezbollah 192 waves, 2 IDF KIA, political exploitation
    Iran: -45, // Supreme Leader killed, 1,332+ civilians, 80% air def — BUT Hormuz leverage intact
    "Saudi Arabia": -20, // 2 civilians killed, refineries targeted, caught between sides
    UAE: -22, // Data centers + airport struck, 700+ projectiles intercepted
    Qatar: -8, // Ras Laffan shutdown (first 30yr), IRGC spy cells found, revenue halted
    Russia: 15, // Oil revenue surge ($100+), US distracted from Ukraine, NATO resources diverted
    China: 10, // Preferential Hormuz passage, discounted oil, US munitions diverted from Pacific
    India: -12, // 60% oil from ME, dual oil+LNG shock, 3 nationals killed, Nomura: -0.5% CA
    Japan: -15, // 95% crude from ME, stagflation risk, 2 nationals detained
    "South Korea": -14, // 68% crude via Hormuz, KOSPI -11% circuit breaker
    Germany: -9, // EU energy import disruption, LNG spot scramble
    France: -2, // Macron mediator positioning, limited military cost
    "United Kingdom": -5, // RAF Akrotiri under fire, bases supporting US
    Turkey: 3, // Defensive posture, strategic positioning, avoided direct involvement
    Iraq: -15, // Shiite militia activation, Halliburton HQ struck, instability
    Kuwait: -18, // 97 ballistic + 283 drones intercepted, US base casualties, embassy closed
    Bahrain: -16, // 78 missiles + 143 drones, Financial Harbour hit, Israeli embassy targeted
    Lebanon: -30, // ~400 killed (83 children), 500K displaced, heaviest since 2024
    Azerbaijan: -6, // Iranian drone strikes
    Oman: 5, // Back-channel diplomacy host, relatively untouched
    Pakistan: -8, // Market -6.2% (-9,700 pts), regional contagion
    Ukraine: -4, // US attention/munitions diverted, Russia emboldened
    Norway: 8, // Europe's last pipeline gas supplier, Equinor revenue surge
    Australia: 6, // Asia scrambles for non-Gulf LNG (NWS, Ichthys, Gorgon)
    Singapore: -5, // Shipping hub disrupted
    Switzerland: 3, // Safe-haven flows, gold surge
    Thailand: -6, // 10% oil rise = -0.5% GDP, Hormuz-dependent
    Bangladesh: -7, // 72% LNG from Gulf, power generation at risk
  },
  companyWinners: [
    { name: "Lockheed Martin", delta: 22, reason: "F-35, THAAD ($15M/shot), Patriot — replenishment contracts = tens of billions" },
    { name: "Raytheon (RTX)", delta: 20, reason: "Interceptor stocks depleted, THAAD/SM-3/Patriot reorders" },
    { name: "Northrop Grumman", delta: 15, reason: "B-2 ops at $130K/hr, Global Hawk ISR demand" },
    { name: "General Dynamics", delta: 10, reason: "Submarine torpedoed IRIS Dena, naval ops surge" },
    { name: "ExxonMobil", delta: 18, reason: "Brent >$100 — non-Gulf production windfall" },
    { name: "Chevron", delta: 15, reason: "Oil >$100 on unaffected Permian Basin output" },
    { name: "Shell", delta: 12, reason: "LNG rerouting profits + oil windfall" },
    { name: "Equinor (Norway)", delta: 14, reason: "Europe's last pipeline supplier — demand surge" },
    { name: "Palantir", delta: 8, reason: "CENTCOM intelligence analytics, JADC2 integration" },
    { name: "L3Harris", delta: 7, reason: "EW + comms demand, electronic warfare surge" },
  ],
  companyLosers: [
    { name: "QatarEnergy", delta: -30, reason: "Ras Laffan shutdown (first 30yr), 20% global LNG offline, force majeure" },
    { name: "Emirates Airlines", delta: -25, reason: "25K+ flights canceled, Gulf hub collapsed" },
    { name: "Etihad Airways", delta: -20, reason: "Abu Dhabi airport disrupted, fleet grounded" },
    { name: "ADNOC", delta: -22, reason: "UAE energy infrastructure targeted by drones" },
    { name: "Amazon (AWS)", delta: -16, reason: "Bahrain + UAE data centers struck, cloud disruption" },
    { name: "Saudi Aramco", delta: -12, reason: "Higher price but Ras Tanura disrupted, lower volume" },
    { name: "Maersk", delta: -18, reason: "Hormuz suspended, fleet idle, insurance +400%" },
    { name: "Halliburton", delta: -10, reason: "Basra HQ struck by Iraqi militia drones" },
    { name: "NVIDIA", delta: -8, reason: "Data center energy costs spike, NVDA -8%, AI CapEx at risk" },
    { name: "Boeing / Airbus", delta: -7, reason: "Gulf aviation hub disrupted, jet fuel surge" },
  ],
  indexChanges: [
    // Day 10 cumulative changes (pre-war baseline → Mar 9)
    { name: "Brent Crude", delta: 47, reason: "$68 → >$100 (peak ~$120). Hormuz closed, oil depots hit." },
    { name: "WTI Crude", delta: 45, reason: "$65 → $95-100. Biggest surge since 2020." },
    { name: "Natural Gas", delta: 57, reason: "$3.50 → $5.50+. Qatar Ras Laffan offline." },
    { name: "Gold", delta: 5.2, reason: "$2,800 → $2,945+. Safe haven flows." },
    { name: "VIX", delta: 120, reason: "18 → 40+. Fear index highest since COVID." },
    { name: "S&P 500", delta: -5.5, reason: "Broad risk-off, defense up but energy/tech down" },
    { name: "Dow Jones", delta: -5.8, reason: "Industrial + transport hit, -1,200 peak intraday" },
    { name: "NASDAQ", delta: -6.2, reason: "Tech sell-off: AWS damage, NVDA -8%, cloud risk" },
    { name: "KOSPI", delta: -11, reason: "Circuit breaker triggered. Korea 68% Hormuz-dependent." },
    { name: "Pakistan KSE100", delta: -6.2, reason: "-9,700 pts. 99% LNG from Gulf." },
    { name: "Nikkei 225", delta: -4.3, reason: "Japan 95% crude from ME, stagflation risk" },
    { name: "Tadawul (Saudi)", delta: -9.5, reason: "Gulf infrastructure strikes, refinery damage" },
    { name: "ADX (Abu Dhabi)", delta: -14, reason: "Airport + data center + ADNOC targeted" },
    { name: "Tel Aviv 35", delta: -7.5, reason: "Multi-front war, Hezbollah 192 waves" },
    { name: "DAX", delta: -4.2, reason: "EU energy import disruption, LNG scramble" },
    { name: "VLCC Rate", delta: 250, reason: "$120K → $420K/day. Shipping insurance +400%." },
    { name: "USD (DXY)", delta: 3.5, reason: "Dollar strengthens as safe haven amid chaos" },
    { name: "EUR/USD", delta: -2.1, reason: "Euro weakens on energy shock + LNG scramble" },
    { name: "BTC", delta: -8, reason: "Risk-off: crypto sold for liquidity, then slight recovery" },
  ],
};

// Merge fact nodes from JSON + enriched anchor/scenario + Day 6-10 nodes
// Also extend timeSlots to cover columns 9-16
export const iranConflictData = {
  ...baseData,
  nodes: [
    ...baseData.nodes,
    ...iranEnrichedNodes,
    ...iranDay6Nodes,
    ...iranDay7Nodes,
    ...iranDay7ExtraNodes,
    ...iranDay8Nodes,
    ...iranDay9Nodes,
    ...iranDay10Nodes,
  ],
  narrative: {
    ...baseData.narrative!,
    cuiBono,
  },
  timeSlots: [
    ...baseData.timeSlots.filter(ts => ts.index <= 8),
    { index: 9, label: "Mar 5", startDate: "2026-03-05", endDate: "2026-03-05" },
    { index: 10, label: "Mar 6", startDate: "2026-03-06", endDate: "2026-03-06", type: "current" as const },
    { index: 11, label: "Mar 7-8 (prog)", startDate: "2026-03-07", endDate: "2026-03-08", type: "near_future" as const },
    { index: 12, label: "Mar 9-12 (prog)", startDate: "2026-03-09", endDate: "2026-03-12", type: "near_future" as const },
    { index: 13, label: "Mar 13-20 (prog)", startDate: "2026-03-13", endDate: "2026-03-20", type: "anchor_date" as const },
    { index: 14, label: "Mar 21-31 (prog)", startDate: "2026-03-21", endDate: "2026-03-31", type: "anchor_date" as const },
    { index: 15, label: "Apr-Jun (prog)", startDate: "2026-04-01", endDate: "2026-06-30", type: "anchor_date" as const },
    { index: 16, label: "Scenarios", startDate: "2026-06-01", endDate: "2026-12-31", type: "anchor_date" as const },
  ],
};
