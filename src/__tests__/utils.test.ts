import { describe, it, expect } from "vitest";
import type { EventNode, KolNode, FilterState } from "../types";
import {
  formatNumber,
  truncateLabel,
  sentimentLabel,
  sentimentArrow,
  nodeRadius,
  kolRadius,
  streamWidth,
  kolStreamWidth,
  computeEventPositions,
  computeKolPositions,
  deriveEventEdges,
  deriveKolEdges,
  getEventChain,
  getKolChain,
  getEventChainList,
  filterEvents,
  filterKols,
  computeKolStats,
  streamPath,
  mergeLayout,
  DEFAULT_LAYOUT,
} from "../utils";

// ─── Test Fixtures ──────────────────────────────────────────────

function makeEvent(overrides: Partial<EventNode> & { id: string; col: number }): EventNode {
  return {
    label: "Test Event",
    type: "media",
    sentiment: "pos",
    weight: 0.5,
    desc: "description",
    impact: 50,
    mentions: 100,
    ...overrides,
  };
}

function makeKol(overrides: Partial<KolNode> & { id: string; col: number }): KolNode {
  return {
    name: "Test KOL",
    handle: "@test",
    avatar: "TK",
    tier: "mid",
    followers: 100000,
    platform: "twitter",
    sentiment: "pos",
    mentions: 50,
    engRate: 3.5,
    reach: 200000,
    views: 500000,
    posts: [],
    ...overrides,
  };
}

// ─── formatNumber ───────────────────────────────────────────────

describe("formatNumber", () => {
  it("formats millions", () => {
    expect(formatNumber(1_500_000)).toBe("1.5M");
    expect(formatNumber(10_000_000)).toBe("10.0M");
  });

  it("formats tens of thousands (rounds to K)", () => {
    expect(formatNumber(50_000)).toBe("50K");
    expect(formatNumber(10_000)).toBe("10K");
  });

  it("formats thousands with decimal", () => {
    expect(formatNumber(1_500)).toBe("1.5K");
    expect(formatNumber(9_999)).toBe("10.0K");
  });

  it("returns small numbers as-is", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(999)).toBe("999");
  });
});

// ─── truncateLabel ──────────────────────────────────────────────

describe("truncateLabel", () => {
  it("returns short labels unchanged", () => {
    expect(truncateLabel("Hello")).toBe("Hello");
  });

  it("truncates long labels with ellipsis", () => {
    expect(truncateLabel("A very long label text", 10)).toBe("A very lo\u2026");
  });

  it("uses default maxLen of 15", () => {
    expect(truncateLabel("Short")).toBe("Short");
    expect(truncateLabel("This is a very long label")).toBe("This is a very\u2026");
  });
});

// ─── sentimentLabel / sentimentArrow ────────────────────────────

describe("sentimentLabel", () => {
  it("returns correct labels", () => {
    expect(sentimentLabel("pos")).toBe("Positive");
    expect(sentimentLabel("neg")).toBe("Negative");
    expect(sentimentLabel("neu")).toBe("Neutral");
  });
});

describe("sentimentArrow", () => {
  it("returns correct arrows", () => {
    expect(sentimentArrow("pos")).toBe("\u25B2");
    expect(sentimentArrow("neg")).toBe("\u25BC");
    expect(sentimentArrow("neu")).toBe("\u25CF");
  });
});

// ─── nodeRadius / kolRadius / streamWidth / kolStreamWidth ──────

describe("nodeRadius", () => {
  it("computes radius from weight and layout", () => {
    expect(nodeRadius(0)).toBe(DEFAULT_LAYOUT.nodeBaseRadius);
    expect(nodeRadius(1)).toBe(DEFAULT_LAYOUT.nodeBaseRadius + DEFAULT_LAYOUT.nodeWeightScale);
    expect(nodeRadius(0.5)).toBe(DEFAULT_LAYOUT.nodeBaseRadius + 0.5 * DEFAULT_LAYOUT.nodeWeightScale);
  });
});

describe("kolRadius", () => {
  it("returns minimum 22", () => {
    expect(kolRadius(0)).toBeGreaterThanOrEqual(22);
    expect(kolRadius(100)).toBeGreaterThanOrEqual(22);
  });

  it("increases with followers", () => {
    expect(kolRadius(1_000_000)).toBeGreaterThan(kolRadius(10_000));
  });
});

describe("streamWidth", () => {
  it("respects minimum width", () => {
    expect(streamWidth(0)).toBe(DEFAULT_LAYOUT.streamMinWidth);
  });

  it("scales with weight", () => {
    expect(streamWidth(1)).toBe(Math.max(DEFAULT_LAYOUT.streamMinWidth, DEFAULT_LAYOUT.streamWidthScale));
  });
});

describe("kolStreamWidth", () => {
  it("clamps to at least 3 and uses log scale (min input clamps to 1000)", () => {
    // kolStreamWidth(0) = Math.max(3, Math.log10(Math.max(0, 1000)) * 4) = Math.max(3, 12) = 12
    expect(kolStreamWidth(0)).toBe(12);
    expect(kolStreamWidth(0)).toBeGreaterThanOrEqual(3);
  });

  it("increases with followers", () => {
    expect(kolStreamWidth(1_000_000)).toBeGreaterThan(kolStreamWidth(1_000));
  });
});

// ─── mergeLayout ────────────────────────────────────────────────

describe("mergeLayout", () => {
  it("returns default layout when no overrides", () => {
    expect(mergeLayout()).toEqual(DEFAULT_LAYOUT);
    expect(mergeLayout(undefined)).toEqual(DEFAULT_LAYOUT);
  });

  it("merges partial overrides", () => {
    const result = mergeLayout({ minNodeSpacing: 100 });
    expect(result.minNodeSpacing).toBe(100);
    expect(result.maxNodeSpacing).toBe(DEFAULT_LAYOUT.maxNodeSpacing);
  });

  it("deep-merges padding", () => {
    const result = mergeLayout({ padding: { top: 99 } as any });
    expect(result.padding.top).toBe(99);
    expect(result.padding.left).toBe(DEFAULT_LAYOUT.padding.left);
  });
});

// ─── streamPath ─────────────────────────────────────────────────

describe("streamPath", () => {
  it("generates valid SVG path strings", () => {
    const result = streamPath({ x: 0, y: 50 }, { x: 100, y: 50 }, 10);
    expect(result.shape).toContain("M");
    expect(result.shape).toContain("Z");
    expect(result.center).toContain("M0,50");
    expect(result.top).toContain("M");
    expect(result.bottom).toContain("M");
  });
});

// ─── computeEventPositions / computeKolPositions ────────────────

describe("computeEventPositions", () => {
  it("returns positions for all nodes", () => {
    const nodes = [
      makeEvent({ id: "a", col: 0 }),
      makeEvent({ id: "b", col: 1 }),
      makeEvent({ id: "c", col: 2 }),
    ];
    const positions = computeEventPositions(nodes, 800, 600);
    expect(positions["a"]).toBeDefined();
    expect(positions["b"]).toBeDefined();
    expect(positions["c"]).toBeDefined();
  });

  it("positions nodes left-to-right by column", () => {
    const nodes = [
      makeEvent({ id: "a", col: 0 }),
      makeEvent({ id: "b", col: 2 }),
    ];
    const positions = computeEventPositions(nodes, 800, 600);
    expect(positions["a"].x).toBeLessThan(positions["b"].x);
  });

  it("handles empty array", () => {
    const positions = computeEventPositions([], 800, 600);
    expect(Object.keys(positions)).toHaveLength(0);
  });
});

describe("computeKolPositions", () => {
  it("returns positions for KOL nodes", () => {
    const nodes = [
      makeKol({ id: "k1", col: 0 }),
      makeKol({ id: "k2", col: 1 }),
    ];
    const positions = computeKolPositions(nodes, 800, 600);
    expect(positions["k1"]).toBeDefined();
    expect(positions["k2"]).toBeDefined();
  });
});

// ─── deriveEventEdges / deriveKolEdges ──────────────────────────

describe("deriveEventEdges", () => {
  it("creates edges from node.from[] fields", () => {
    const nodes = [
      makeEvent({ id: "a", col: 0 }),
      makeEvent({ id: "b", col: 1, from: ["a"] }),
      makeEvent({ id: "c", col: 2, from: ["a", "b"] }),
    ];
    const edges = deriveEventEdges(nodes);
    expect(edges).toHaveLength(3);
    expect(edges).toContainEqual({ from: "a", to: "b", type: "causal" });
    expect(edges).toContainEqual({ from: "a", to: "c", type: "causal" });
    expect(edges).toContainEqual({ from: "b", to: "c", type: "causal" });
  });

  it("ignores references to missing nodes", () => {
    const nodes = [
      makeEvent({ id: "a", col: 0, from: ["nonexistent"] }),
    ];
    const edges = deriveEventEdges(nodes);
    expect(edges).toHaveLength(0);
  });

  it("returns empty for no nodes", () => {
    expect(deriveEventEdges([])).toHaveLength(0);
  });
});

describe("deriveKolEdges", () => {
  it("creates edges from both .from[] and .influence[]", () => {
    const nodes = [
      makeKol({ id: "k1", col: 0, influence: ["k2"] }),
      makeKol({ id: "k2", col: 1, from: ["k1"] }),
    ];
    const edges = deriveKolEdges(nodes);
    expect(edges.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── getEventChain / getKolChain ────────────────────────────────

describe("getEventChain", () => {
  it("returns the node itself", () => {
    const nodes = [makeEvent({ id: "a", col: 0 })];
    const chain = getEventChain("a", nodes);
    expect(chain.has("a")).toBe(true);
  });

  it("traverses upstream (parents)", () => {
    const nodes = [
      makeEvent({ id: "a", col: 0 }),
      makeEvent({ id: "b", col: 1, from: ["a"] }),
      makeEvent({ id: "c", col: 2, from: ["b"] }),
    ];
    const chain = getEventChain("c", nodes);
    expect(chain.has("a")).toBe(true);
    expect(chain.has("b")).toBe(true);
    expect(chain.has("c")).toBe(true);
  });

  it("traverses downstream (children)", () => {
    const nodes = [
      makeEvent({ id: "a", col: 0 }),
      makeEvent({ id: "b", col: 1, from: ["a"] }),
      makeEvent({ id: "c", col: 2, from: ["b"] }),
    ];
    const chain = getEventChain("a", nodes);
    expect(chain.has("a")).toBe(true);
    expect(chain.has("b")).toBe(true);
    expect(chain.has("c")).toBe(true);
  });

  it("handles cycles gracefully", () => {
    const nodes = [
      makeEvent({ id: "a", col: 0, from: ["b"] }),
      makeEvent({ id: "b", col: 1, from: ["a"] }),
    ];
    const chain = getEventChain("a", nodes);
    expect(chain.has("a")).toBe(true);
    expect(chain.has("b")).toBe(true);
  });
});

describe("getKolChain", () => {
  it("follows influence + from chains", () => {
    const nodes = [
      makeKol({ id: "k1", col: 0, influence: ["k2"] }),
      makeKol({ id: "k2", col: 1, from: ["k1"], influence: ["k3"] }),
      makeKol({ id: "k3", col: 2 }),
    ];
    const chain = getKolChain("k1", nodes);
    expect(chain.has("k1")).toBe(true);
    expect(chain.has("k2")).toBe(true);
    expect(chain.has("k3")).toBe(true);
  });
});

// ─── getEventChainList ──────────────────────────────────────────

describe("getEventChainList", () => {
  it("returns ordered ancestor chain", () => {
    const nodes = [
      makeEvent({ id: "a", col: 0 }),
      makeEvent({ id: "b", col: 1, from: ["a"] }),
      makeEvent({ id: "c", col: 2, from: ["b"] }),
    ];
    const list = getEventChainList("c", nodes);
    expect(list.map((n) => n.id)).toEqual(["a", "b", "c"]);
  });
});

// ─── filterEvents ───────────────────────────────────────────────

describe("filterEvents", () => {
  const nodes = [
    makeEvent({ id: "a", col: 0, type: "media", weight: 0.8, impact: 90, label: "Bitcoin Rally", desc: "BTC" }),
    makeEvent({ id: "b", col: 1, type: "fud", weight: 0.2, impact: 20, label: "FUD article", desc: "fear" }),
    makeEvent({ id: "c", col: 2, type: "listing", weight: 0.5, impact: 60, label: "Exchange Listing", desc: "CEX" }),
  ];

  it("filters by event types", () => {
    const result = filterEvents(nodes, { activeEventTypes: new Set(["media", "listing"]) as any });
    expect(result).toHaveLength(2);
    expect(result.map((n) => n.id)).toEqual(["a", "c"]);
  });

  it("filters by minWeight", () => {
    const result = filterEvents(nodes, { minWeight: 0.5 });
    expect(result).toHaveLength(2);
  });

  it("filters by minImpact", () => {
    const result = filterEvents(nodes, { minImpact: 50 });
    expect(result).toHaveLength(2);
  });

  it("filters by search query (label)", () => {
    const result = filterEvents(nodes, { searchQuery: "bitcoin" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a");
  });

  it("filters by search query (desc)", () => {
    const result = filterEvents(nodes, { searchQuery: "fear" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("b");
  });

  it("returns all with empty filters", () => {
    const result = filterEvents(nodes, {});
    expect(result).toHaveLength(3);
  });
});

// ─── filterKols ─────────────────────────────────────────────────

describe("filterKols", () => {
  const nodes = [
    makeKol({ id: "k1", col: 0, tier: "mega", platform: "youtube", name: "CryptoKing", handle: "@ck", followers: 2_000_000 }),
    makeKol({ id: "k2", col: 1, tier: "micro", platform: "twitter", name: "SmallTrader", handle: "@st", followers: 15_000 }),
    makeKol({ id: "k3", col: 2, tier: "mid", platform: "telegram", name: "MidInfluencer", handle: "@mi", followers: 200_000 }),
  ];

  it("filters by tiers", () => {
    const result = filterKols(nodes, { activeTiers: new Set(["mega", "mid"]) as any });
    expect(result).toHaveLength(2);
  });

  it("filters by platforms", () => {
    const result = filterKols(nodes, { activePlatforms: new Set(["twitter"]) as any });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("k2");
  });

  it("filters by search query", () => {
    const result = filterKols(nodes, { searchQuery: "crypto" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("k1");
  });

  it("sorts by followers desc", () => {
    const result = filterKols(nodes, { sortField: "followers", sortOrder: "desc" });
    expect(result[0].id).toBe("k1");
    expect(result[2].id).toBe("k2");
  });

  it("sorts by followers asc", () => {
    const result = filterKols(nodes, { sortField: "followers", sortOrder: "asc" });
    expect(result[0].id).toBe("k2");
    expect(result[2].id).toBe("k1");
  });
});

// ─── computeKolStats ────────────────────────────────────────────

describe("computeKolStats", () => {
  it("returns empty stats for no nodes", () => {
    const stats = computeKolStats([]);
    expect(stats.totalKols).toBe(0);
    expect(stats.totalReach).toBe(0);
    expect(stats.avgEngRate).toBe(0);
  });

  it("computes correct aggregate stats", () => {
    const nodes = [
      makeKol({ id: "k1", col: 0, reach: 100_000, mentions: 50, engRate: 4, sentiment: "pos", tier: "mega", platform: "youtube" }),
      makeKol({ id: "k2", col: 1, reach: 200_000, mentions: 80, engRate: 6, sentiment: "neg", tier: "mid", platform: "twitter" }),
    ];
    const stats = computeKolStats(nodes);
    expect(stats.totalKols).toBe(2);
    expect(stats.totalReach).toBe(300_000);
    expect(stats.totalMentions).toBe(130);
    expect(stats.avgEngRate).toBe(5);
    expect(stats.positiveRatio).toBe(50);
    expect(stats.tierBreakdown["mega"]).toBe(1);
    expect(stats.tierBreakdown["mid"]).toBe(1);
    expect(stats.platformBreakdown["youtube"]).toBe(1);
    expect(stats.platformBreakdown["twitter"]).toBe(1);
  });

  it("identifies top KOLs", () => {
    const nodes = [
      makeKol({ id: "k1", col: 0, reach: 500_000, engRate: 2 }),
      makeKol({ id: "k2", col: 1, reach: 100_000, engRate: 8 }),
    ];
    const stats = computeKolStats(nodes);
    expect(stats.topKolByReach).toBe("k1");
    expect(stats.topKolByEngagement).toBe("k2");
  });
});
