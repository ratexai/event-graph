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
  countryScores: {
    "United States": -12,
    Israel: -8,
    Iran: -35,
    "Saudi Arabia": -15,
    UAE: -18,
    Qatar: 5,
    Russia: 12,
    China: 8,
    India: -6,
    Japan: -10,
    "South Korea": -8,
    Germany: -7,
    France: -4,
    "United Kingdom": -3,
    Turkey: 3,
    Iraq: -10,
    Kuwait: -14,
    Bahrain: -12,
    Lebanon: -20,
    Azerbaijan: -5,
    Oman: 4,
    Pakistan: -3,
    Ukraine: -2,
    Singapore: -4,
    Switzerland: 2,
  },
  companyWinners: [
    { name: "Lockheed Martin", delta: 18, reason: "F-35, THAAD, Patriot demand surge" },
    { name: "Raytheon (RTX)", delta: 15, reason: "Interceptor stocks depleted, massive reorders" },
    { name: "Northrop Grumman", delta: 12, reason: "B-2 ops, Global Hawk surveillance" },
    { name: "General Dynamics", delta: 8, reason: "Submarine torpedoed IRIS Dena, naval ops" },
    { name: "ExxonMobil", delta: 10, reason: "Oil spike: Brent >$88" },
    { name: "Chevron", delta: 9, reason: "Oil price windfall" },
    { name: "Halliburton", delta: 7, reason: "Post-conflict infrastructure expected" },
    { name: "Palantir", delta: 6, reason: "CENTCOM intelligence analytics" },
    { name: "L3Harris", delta: 5, reason: "EW + comms demand" },
    { name: "Shell", delta: 6, reason: "LNG rerouting profits" },
  ],
  companyLosers: [
    { name: "Amazon (AWS)", delta: -14, reason: "Bahrain + UAE data centers struck by drones" },
    { name: "Emirates Airlines", delta: -20, reason: "25K flights canceled, hubs closed" },
    { name: "Qatar Airways", delta: -12, reason: "Gulf airspace closures" },
    { name: "Etihad Airways", delta: -15, reason: "Abu Dhabi airport closed" },
    { name: "ADNOC", delta: -18, reason: "UAE energy infrastructure targeted" },
    { name: "Saudi Aramco", delta: -10, reason: "Ras Tanura & Abqaiq hit" },
    { name: "Maersk", delta: -12, reason: "Hormuz transit halted" },
    { name: "COSCO Shipping", delta: -8, reason: "Hormuz transit halted" },
    { name: "Apple", delta: -5, reason: "Supply chain disruption via shipping" },
    { name: "Tesla", delta: -4, reason: "Shipping + energy cost spike" },
  ],
  indexChanges: [
    { name: "S&P 500", delta: -4.2, reason: "Broad risk-off, defense up but energy volatility" },
    { name: "Dow Jones", delta: -5.1, reason: "Industrial + transport hit hard" },
    { name: "NASDAQ", delta: -3.8, reason: "Tech sell-off: AWS damage, cloud risk" },
    { name: "Brent Crude", delta: 17, reason: "$72 → $84.30, Hormuz closure + Gulf strikes" },
    { name: "WTI Crude", delta: 15, reason: "$68 → $80, +5.9-8% day" },
    { name: "Gold", delta: 5, reason: "Safe haven: $5,100 → $5,400/oz" },
    { name: "VIX", delta: 85, reason: "Fear index 18 → 34" },
    { name: "Tadawul (Saudi)", delta: -8.5, reason: "Gulf infrastructure strikes" },
    { name: "ADX (Abu Dhabi)", delta: -12, reason: "Airport + data center attacks" },
    { name: "Tel Aviv 35", delta: -6.2, reason: "Multi-front war costs" },
    { name: "Nikkei 225", delta: -4.8, reason: "Japan 85% Hormuz-dependent" },
    { name: "DAX", delta: -3.5, reason: "EU energy import disruption" },
    { name: "KOSPI", delta: -5.2, reason: "Korea Hormuz-dependent" },
    { name: "USD (DXY)", delta: 2.8, reason: "Dollar strengthens as safe haven" },
    { name: "EUR/USD", delta: -1.5, reason: "Euro weakens on energy shock" },
    { name: "BTC", delta: -6, reason: "Risk-off: crypto sold for liquidity" },
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
