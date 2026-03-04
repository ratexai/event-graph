/* ═══════════════════════════════════════════════════════════════
   Filtering + stats utilities
   ═══════════════════════════════════════════════════════════════ */

import type {
  EventNode, KolNode, NarrativeNode,
  KolAggregateStats, NarrativeAggregateStats,
  FilterState,
  KolTier, Platform, Sentiment, SortField,
  NarrativeCategory, NarrativeSignal,
} from "../types";

// ─── KOL Stats ──────────────────────────────────────────────────

export function computeKolStats(nodes: KolNode[]): KolAggregateStats {
  const total = nodes.length;
  const empty: KolAggregateStats = {
    totalKols: 0, totalReach: 0, totalMentions: 0, avgEngRate: 0,
    positiveRatio: 0, tierBreakdown: {} as Record<KolTier, number>,
    platformBreakdown: {} as Record<Platform, number>,
  };
  if (total === 0) return empty;

  let totalReach = 0, totalMentions = 0, totalEng = 0, posCount = 0;
  const tierBreakdown = {} as Record<KolTier, number>;
  const platformBreakdown = {} as Record<Platform, number>;
  let topReach: KolNode = nodes[0];
  let topEng: KolNode = nodes[0];

  for (const k of nodes) {
    totalReach += k.reach;
    totalMentions += k.mentions;
    totalEng += k.engRate;
    if (k.sentiment === "pos") posCount++;
    tierBreakdown[k.tier] = (tierBreakdown[k.tier] || 0) + 1;
    platformBreakdown[k.platform] = (platformBreakdown[k.platform] || 0) + 1;
    if (k.reach > topReach.reach) topReach = k;
    if (k.engRate > topEng.engRate) topEng = k;
  }

  return {
    totalKols: total,
    totalReach,
    totalMentions,
    avgEngRate: totalEng / total,
    positiveRatio: Math.round((posCount / total) * 100),
    tierBreakdown,
    platformBreakdown,
    topKolByReach: topReach.id,
    topKolByEngagement: topEng.id,
  };
}

// ─── Filtering ──────────────────────────────────────────────────

export function filterEvents(nodes: EventNode[], filters: Partial<FilterState>): EventNode[] {
  let result = nodes;

  if (filters.activeEventTypes?.size) {
    result = result.filter((n) => filters.activeEventTypes!.has(n.type));
  }
  if (filters.minWeight != null) {
    result = result.filter((n) => n.weight >= filters.minWeight!);
  }
  if (filters.minImpact != null) {
    result = result.filter((n) => n.impact >= filters.minImpact!);
  }
  if (filters.searchQuery) {
    const q = filters.searchQuery.toLowerCase();
    result = result.filter((n) => n.label.toLowerCase().includes(q) || n.desc.toLowerCase().includes(q));
  }

  return result;
}

export const KOL_SORT_ACCESSORS: Record<SortField, (k: KolNode) => number> = {
  followers: (k) => k.followers,
  engRate:   (k) => k.engRate,
  reach:     (k) => k.reach,
  mentions:  (k) => k.mentions,
  impact:    (k) => k.reach, // fallback: use reach as proxy for impact
  date:      (k) => k.col,
};

export function filterKols(nodes: KolNode[], filters: Partial<FilterState>): KolNode[] {
  let result = [...nodes];

  if (filters.activeTiers?.size) {
    result = result.filter((k) => filters.activeTiers!.has(k.tier));
  }
  if (filters.activePlatforms?.size) {
    result = result.filter((k) => filters.activePlatforms!.has(k.platform));
  }
  if (filters.searchQuery) {
    const q = filters.searchQuery.toLowerCase();
    result = result.filter((k) => k.name.toLowerCase().includes(q) || k.handle.toLowerCase().includes(q));
  }
  if (filters.sortField) {
    const accessor = KOL_SORT_ACCESSORS[filters.sortField] ?? KOL_SORT_ACCESSORS.followers;
    const dir = filters.sortOrder === "asc" ? 1 : -1;
    result.sort((a, b) => (accessor(a) - accessor(b)) * dir);
  }

  return result;
}

/** Filter narrative nodes by category, signal, search, weight */
export function filterNarratives(nodes: NarrativeNode[], filters: Partial<FilterState>): NarrativeNode[] {
  let result = nodes;

  if (filters.activeCategories?.size) {
    result = result.filter((n) => filters.activeCategories!.has(n.category));
  }
  if (filters.activeSignals?.size) {
    result = result.filter((n) => filters.activeSignals!.has(n.signal));
  }
  if (filters.minWeight != null) {
    result = result.filter((n) => n.weight >= filters.minWeight!);
  }
  if (filters.hasMarket) {
    result = result.filter((n) => n.marketProb != null);
  }
  if (filters.searchQuery) {
    const q = filters.searchQuery.toLowerCase();
    result = result.filter((n) => n.label.toLowerCase().includes(q) || n.desc.toLowerCase().includes(q));
  }

  return result;
}

/** Compute aggregate stats for narrative nodes */
export function computeNarrativeStats(nodes: NarrativeNode[]): NarrativeAggregateStats {
  const total = nodes.length;
  const empty: NarrativeAggregateStats = {
    totalEvents: 0, totalVolume: 0, avgMomentum: 0,
    currentProb: 0, netOddsDelta: 0,
    signalBreakdown: {} as Record<NarrativeSignal, number>,
    categoryBreakdown: {} as Record<NarrativeCategory, number>,
    sentimentBreakdown: {} as Record<Sentiment, number>,
  };
  if (total === 0) return empty;

  let totalVolume = 0, totalMomentum = 0, netOddsDelta = 0;
  const signalBreakdown = {} as Record<NarrativeSignal, number>;
  const categoryBreakdown = {} as Record<NarrativeCategory, number>;
  const sentimentBreakdown = {} as Record<Sentiment, number>;
  let topByImpact: NarrativeNode = nodes[0];
  let topByOddsDelta: NarrativeNode = nodes[0];
  let lastProb = 50;

  for (const n of nodes) {
    totalVolume += n.volume;
    totalMomentum += n.momentum;
    netOddsDelta += n.oddsDelta;
    signalBreakdown[n.signal] = (signalBreakdown[n.signal] || 0) + 1;
    categoryBreakdown[n.category] = (categoryBreakdown[n.category] || 0) + 1;
    sentimentBreakdown[n.sentiment] = (sentimentBreakdown[n.sentiment] || 0) + 1;
    if (n.weight > topByImpact.weight) topByImpact = n;
    if (Math.abs(n.oddsDelta) > Math.abs(topByOddsDelta.oddsDelta)) topByOddsDelta = n;
    if (n.marketProb != null) lastProb = n.marketProb;
  }

  return {
    totalEvents: total,
    totalVolume,
    avgMomentum: totalMomentum / total,
    currentProb: lastProb,
    netOddsDelta,
    signalBreakdown,
    categoryBreakdown,
    sentimentBreakdown,
    topEventByImpact: topByImpact.id,
    topEventByOddsDelta: topByOddsDelta.id,
  };
}
