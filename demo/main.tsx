import React from "react";
import { createRoot } from "react-dom/client";
import { EventGraph } from "../src";
import type { EventFlowData, KolFlowData, NarrativeFlowData } from "../src";

// ─── Mock Event Data ────────────────────────────────────────

const eventData: EventFlowData = {
  timeSlots: [
    { index: 0, label: "Feb 14", startDate: "2025-02-14", endDate: "2025-02-14" },
    { index: 1, label: "Feb 15", startDate: "2025-02-15", endDate: "2025-02-15" },
    { index: 2, label: "Feb 16", startDate: "2025-02-16", endDate: "2025-02-16" },
    { index: 3, label: "Feb 17", startDate: "2025-02-17", endDate: "2025-02-17" },
    { index: 4, label: "Feb 18", startDate: "2025-02-18", endDate: "2025-02-18" },
  ],
  nodes: [
    { id: "e1", col: 0, label: "Token Launch", type: "launch", sentiment: "pos", weight: 0.9, desc: "HYPE token launched on mainnet", impact: 95, mentions: 1200, extra: "1.2K mentions" },
    { id: "e2", col: 0, label: "Smart Contract Audit", type: "security", sentiment: "pos", weight: 0.7, desc: "CertiK audit completed with no critical issues", impact: 80, mentions: 340 },
    { id: "e3", col: 1, label: "CoinDesk Coverage", type: "media", sentiment: "pos", weight: 0.8, desc: "Featured article on CoinDesk front page", impact: 85, mentions: 890, from: ["e1"] },
    { id: "e4", col: 1, label: "KOL Reviews", type: "blogger", sentiment: "pos", weight: 0.6, desc: "Multiple crypto YouTubers covered the launch", impact: 70, mentions: 2100, from: ["e1"], extra: "2.1K mentions" },
    { id: "e5", col: 2, label: "DEX Listing", type: "listing", sentiment: "pos", weight: 0.85, desc: "Listed on Uniswap and SushiSwap", impact: 90, mentions: 560, from: ["e1", "e2"] },
    { id: "e6", col: 2, label: "Price Pump +40%", type: "metric", sentiment: "pos", weight: 0.75, desc: "Token price increased 40% in 24h", impact: 75, mentions: 3200, from: ["e3", "e4", "e5"], extra: "+40%" },
    { id: "e7", col: 3, label: "FUD Article", type: "fud", sentiment: "neg", weight: 0.5, desc: "Anonymous blog post questioning tokenomics", impact: 45, mentions: 780, from: ["e6"] },
    { id: "e8", col: 3, label: "CEX Listing", type: "listing", sentiment: "pos", weight: 0.95, desc: "Listed on Binance with USDT pair", impact: 98, mentions: 4500, from: ["e5", "e6"], extra: "Binance" },
    { id: "e9", col: 3, label: "Partnership Announced", type: "partnership", sentiment: "pos", weight: 0.7, desc: "Strategic partnership with Chainlink oracles", impact: 72, mentions: 650, from: ["e1"] },
    { id: "e10", col: 4, label: "Community AMA", type: "community", sentiment: "pos", weight: 0.4, desc: "Founders hosted Twitter Space AMA", impact: 35, mentions: 420, from: ["e7"] },
    { id: "e11", col: 4, label: "ATH Reached", type: "milestone", sentiment: "pos", weight: 0.88, desc: "Token reached all-time high of $2.40", impact: 92, mentions: 5600, from: ["e8", "e9"], extra: "ATH $2.40" },
    { id: "e12", col: 4, label: "On-chain Activity Spike", type: "onchain", sentiment: "pos", weight: 0.6, desc: "Daily active addresses up 300%", impact: 65, mentions: 310, from: ["e8"] },
  ],
};

// ─── Mock KOL Data ──────────────────────────────────────────

const kolData: KolFlowData = {
  timeSlots: [
    { index: 0, label: "Wave 1", startDate: "2025-02-14", endDate: "2025-02-15" },
    { index: 1, label: "Wave 2", startDate: "2025-02-15", endDate: "2025-02-16" },
    { index: 2, label: "Wave 3", startDate: "2025-02-16", endDate: "2025-02-18" },
  ],
  nodes: [
    {
      id: "k1", col: 0, name: "Coin Bureau", handle: "@coinbureau", avatar: "CB",
      tier: "mega", followers: 2_400_000, platform: "youtube", sentiment: "pos",
      mentions: 3, engRate: 5.2, reach: 1_800_000, views: 980_000,
      engHistory: [4.8, 5.1, 5.0, 5.3, 5.2],
      influence: ["k3", "k4"],
      posts: [
        { day: 0, type: "video", title: "HYPE Token Deep Dive", views: 580_000, likes: 32_000, sentiment: "pos" },
        { day: 1, type: "short", title: "Is HYPE the next 100x?", views: 400_000, likes: 18_000, sentiment: "pos" },
      ],
    },
    {
      id: "k2", col: 0, name: "Crypto Banter", handle: "@cryptobanter", avatar: "CR",
      tier: "mega", followers: 1_800_000, platform: "youtube", sentiment: "pos",
      mentions: 2, engRate: 4.1, reach: 1_200_000, views: 720_000,
      engHistory: [3.9, 4.0, 4.2, 4.1, 4.3],
      influence: ["k4", "k5"],
      posts: [
        { day: 0, type: "stream", title: "HYPE Launch Live Coverage", views: 720_000, likes: 25_000, sentiment: "pos" },
      ],
    },
    {
      id: "k3", col: 1, name: "Altcoin Daily", handle: "@altcoindaily", avatar: "AD",
      tier: "macro", followers: 800_000, platform: "youtube", sentiment: "pos",
      mentions: 4, engRate: 6.3, reach: 650_000, views: 420_000,
      from: ["k1"],
      influence: ["k5"],
      posts: [
        { day: 1, type: "video", title: "Top 5 New Tokens", views: 320_000, likes: 15_000, sentiment: "pos" },
        { day: 2, type: "short", title: "HYPE price update", views: 100_000, likes: 5_000, sentiment: "pos" },
      ],
    },
    {
      id: "k4", col: 1, name: "Hsaka", handle: "@HsakaTrades", avatar: "HS",
      tier: "mid", followers: 320_000, platform: "twitter", sentiment: "pos",
      mentions: 8, engRate: 8.7, reach: 450_000, views: 280_000,
      from: ["k1", "k2"],
      influence: ["k6"],
      posts: [
        { day: 1, type: "thread", title: "HYPE tokenomics breakdown", views: 180_000, likes: 8_500, sentiment: "pos" },
        { day: 2, type: "tweet", title: "Bullish on HYPE chart", views: 100_000, likes: 4_200, sentiment: "pos" },
      ],
    },
    {
      id: "k5", col: 2, name: "CryptoWizardd", handle: "@CryptoWizardd", avatar: "CW",
      tier: "micro", followers: 45_000, platform: "twitter", sentiment: "neu",
      mentions: 12, engRate: 11.2, reach: 38_000, views: 62_000,
      from: ["k2", "k3"],
      posts: [
        { day: 2, type: "thread", title: "My HYPE bags update", views: 42_000, likes: 2_100, sentiment: "neu" },
        { day: 3, type: "tweet", title: "Taking some profits", views: 20_000, likes: 900, sentiment: "neu" },
      ],
    },
    {
      id: "k6", col: 2, name: "DeFi Degen", handle: "@defidegen", avatar: "DD",
      tier: "nano", followers: 8_500, platform: "telegram", sentiment: "neg",
      mentions: 5, engRate: 15.3, reach: 6_200, views: 12_000,
      from: ["k4"],
      posts: [
        { day: 3, type: "post", title: "HYPE looking toppy", views: 8_000, likes: 450, sentiment: "neg" },
      ],
    },
  ],
};

// ─── Mock Narrative Data ────────────────────────────────────

const narrativeData: NarrativeFlowData = {
  timeSlots: [
    { index: 0, label: "Jan W1", startDate: "2025-01-06", endDate: "2025-01-12" },
    { index: 1, label: "Jan W2", startDate: "2025-01-13", endDate: "2025-01-19" },
    { index: 2, label: "Jan W3", startDate: "2025-01-20", endDate: "2025-01-26" },
    { index: 3, label: "Feb W1", startDate: "2025-02-03", endDate: "2025-02-09" },
  ],
  narrative: {
    id: "nar-1", title: "AI Regulation Bill", category: "regulation",
    status: "active", sentimentTrend: "neg", currentProb: 62, startProb: 45,
    probHistory: [45, 52, 58, 62],
    markets: [{ platform: "Polymarket", question: "Will US pass AI regulation by 2025?", url: "https://polymarket.com", prob: 62 }],
  },
  nodes: [
    { id: "n1", col: 0, label: "Senate Draft Leaked", category: "regulation", signal: "catalyst", sentiment: "neg", desc: "Draft of comprehensive AI regulation bill leaked to media", weight: 0.7, oddsDelta: 8, marketProb: 53, sourceAuthority: 85, momentum: 3, volume: 4200 },
    { id: "n2", col: 0, label: "Tech Lobby Response", category: "regulation", signal: "noise", sentiment: "neg", desc: "Major tech companies issue joint statement opposing bill", weight: 0.4, oddsDelta: -2, marketProb: 51, sourceAuthority: 70, momentum: 1, volume: 2800 },
    { id: "n3", col: 1, label: "Committee Hearing", category: "regulation", signal: "escalation", sentiment: "neg", desc: "Senate committee holds public hearing on AI risks", weight: 0.85, oddsDelta: 7, marketProb: 58, sourceAuthority: 95, momentum: 4, volume: 8500, from: ["n1", "n2"] },
    { id: "n4", col: 2, label: "EU Coordination", category: "regulation", signal: "catalyst", sentiment: "neg", desc: "US and EU announce joint AI regulation framework talks", weight: 0.6, oddsDelta: 4, marketProb: 62, sourceAuthority: 90, momentum: 2, volume: 3100, from: ["n3"] },
    { id: "n5", col: 2, label: "Industry Compromise", category: "regulation", signal: "resolution", sentiment: "pos", desc: "Tech industry proposes self-regulation framework", weight: 0.5, oddsDelta: -3, marketProb: 59, sourceAuthority: 65, momentum: -1, volume: 2200, from: ["n3"] },
    { id: "n6", col: 3, label: "Bipartisan Support", category: "regulation", signal: "escalation", sentiment: "neg", desc: "Both parties signal support for modified bill", weight: 0.9, oddsDelta: 6, marketProb: 65, sourceAuthority: 92, momentum: 5, volume: 12000, from: ["n4", "n5"], extra: "+6pp" },
  ],
};

// ─── App ────────────────────────────────────────────────────

function App() {
  return (
    <EventGraph
      eventData={eventData}
      kolData={kolData}
      narrativeData={narrativeData}
      defaultMode="events"
      branding={{ name: "RateXAI", accentColor: "#00e5a0" }}
      onNodeSelect={(id, mode) => console.log(`Selected [${mode}]:`, id)}
      onModeChange={(mode) => console.log("Mode:", mode)}
    />
  );
}

createRoot(document.getElementById("root")!).render(<App />);
