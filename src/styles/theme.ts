/* ═══════════════════════════════════════════════════════════════
   @ratexai/event-graph — Theme System
   ═══════════════════════════════════════════════════════════════ */

import type { GraphTheme, EventType, KolTier, NarrativeCategory, NarrativeSignal, Sentiment } from "../types";

export const DEFAULT_THEME: GraphTheme = {
  bg: "#050608",
  bgAlt: "#0a0c12",
  surface: "rgba(12,14,22,0.95)",
  card: "rgba(16,18,28,0.85)",
  border: "#151828",
  borderLight: "#1e2240",
  text: "#e8e6e0",
  textSecondary: "#9ca0b8",
  muted: "#454966",
  accent: "#00e5a0",
  accentDim: "rgba(0,229,160,0.12)",
  positive: "#34d399",
  positiveDim: "rgba(52,211,153,0.15)",
  negative: "#f87171",
  negativeDim: "rgba(248,113,113,0.15)",
  neutral: "#94a3b8",
  neutralDim: "rgba(148,163,184,0.1)",
  eventTypeColors: {
    blogger:     { color: "#818cf8", bg: "rgba(129,140,248,0.12)" },
    media:       { color: "#38bdf8", bg: "rgba(56,189,248,0.12)" },
    metric:      { color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
    partnership: { color: "#2dd4bf", bg: "rgba(45,212,191,0.12)" },
    listing:     { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
    launch:      { color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
    fud:         { color: "#f87171", bg: "rgba(248,113,113,0.12)" },
    security:    { color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
    event:       { color: "#e879f9", bg: "rgba(232,121,249,0.12)" },
    onchain:     { color: "#22d3ee", bg: "rgba(34,211,238,0.12)" },
    resolution:  { color: "#86efac", bg: "rgba(134,239,172,0.12)" },
    milestone:   { color: "#fde047", bg: "rgba(253,224,71,0.12)" },
    community:   { color: "#f0abfc", bg: "rgba(240,171,252,0.12)" },
    governance:  { color: "#67e8f9", bg: "rgba(103,232,249,0.12)" },
    airdrop:     { color: "#fca5a5", bg: "rgba(252,165,165,0.12)" },
  },
  kolTierColors: {
    mega:  { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
    macro: { color: "#818cf8", bg: "rgba(129,140,248,0.12)" },
    mid:   { color: "#38bdf8", bg: "rgba(56,189,248,0.12)" },
    micro: { color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
    nano:  { color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
  },
  narrativeCategoryColors: {
    ai:         { color: "#818cf8", bg: "rgba(129,140,248,0.12)" },
    war:        { color: "#f87171", bg: "rgba(248,113,113,0.12)" },
    elections:  { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
    regulation: { color: "#67e8f9", bg: "rgba(103,232,249,0.12)" },
    defi:       { color: "#2dd4bf", bg: "rgba(45,212,191,0.12)" },
    memecoin:   { color: "#e879f9", bg: "rgba(232,121,249,0.12)" },
    macro:      { color: "#38bdf8", bg: "rgba(56,189,248,0.12)" },
    tech:       { color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
    scandal:    { color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
    climate:    { color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
    sports:     { color: "#22d3ee", bg: "rgba(34,211,238,0.12)" },
    other:      { color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
  },
  narrativeSignalColors: {
    catalyst:   { color: "#fbbf24", bg: "rgba(251,191,36,0.15)" },
    escalation: { color: "#f87171", bg: "rgba(248,113,113,0.15)" },
    resolution: { color: "#34d399", bg: "rgba(52,211,153,0.15)" },
    reversal:   { color: "#e879f9", bg: "rgba(232,121,249,0.15)" },
    noise:      { color: "#6b7280", bg: "rgba(107,114,128,0.08)" },
  },
};

/** Deep-merge partial theme overrides with defaults */
export function mergeTheme(overrides?: Partial<GraphTheme>): GraphTheme {
  if (!overrides) return DEFAULT_THEME;
  return {
    ...DEFAULT_THEME,
    ...overrides,
    eventTypeColors: { ...DEFAULT_THEME.eventTypeColors, ...overrides.eventTypeColors },
    kolTierColors: { ...DEFAULT_THEME.kolTierColors, ...overrides.kolTierColors },
    narrativeCategoryColors: { ...DEFAULT_THEME.narrativeCategoryColors, ...overrides.narrativeCategoryColors },
    narrativeSignalColors: { ...DEFAULT_THEME.narrativeSignalColors, ...overrides.narrativeSignalColors },
  };
}

// ─── Accessors ──────────────────────────────────────────────────

export function getEventTypeStyle(theme: GraphTheme, type: EventType) {
  return theme.eventTypeColors[type] ?? { color: theme.muted, bg: theme.neutralDim };
}

export function getKolTierStyle(theme: GraphTheme, tier: KolTier) {
  return theme.kolTierColors[tier] ?? { color: theme.muted, bg: theme.neutralDim };
}

export function getNarrativeCategoryStyle(theme: GraphTheme, category: NarrativeCategory) {
  return theme.narrativeCategoryColors[category] ?? { color: theme.muted, bg: theme.neutralDim };
}

export function getNarrativeSignalStyle(theme: GraphTheme, signal: NarrativeSignal) {
  return theme.narrativeSignalColors[signal] ?? { color: theme.muted, bg: theme.neutralDim };
}

export function getSentimentColor(theme: GraphTheme, sentiment: Sentiment) {
  return sentiment === "pos" ? theme.positive : sentiment === "neg" ? theme.negative : theme.neutral;
}

export function getSentimentDimColor(theme: GraphTheme, sentiment: Sentiment) {
  return sentiment === "pos" ? theme.positiveDim : sentiment === "neg" ? theme.negativeDim : theme.neutralDim;
}

// ─── Metadata Maps ──────────────────────────────────────────────

export const EVENT_TYPE_META: Record<EventType, { icon: string; label: string }> = {
  blogger:     { icon: "👤", label: "Blogger" },
  media:       { icon: "📰", label: "Media" },
  metric:      { icon: "📊", label: "Metric" },
  partnership: { icon: "🤝", label: "Partnership" },
  listing:     { icon: "💎", label: "Listing" },
  launch:      { icon: "🚀", label: "Launch" },
  fud:         { icon: "⚠️", label: "FUD" },
  security:    { icon: "🛡️", label: "Security" },
  event:       { icon: "🎙️", label: "Event" },
  onchain:     { icon: "🐋", label: "On-chain" },
  resolution:  { icon: "✅", label: "Resolution" },
  milestone:   { icon: "🏆", label: "Milestone" },
  community:   { icon: "💬", label: "Community" },
  governance:  { icon: "🗳️", label: "Governance" },
  airdrop:     { icon: "🪂", label: "Airdrop" },
};

export const KOL_TIER_META: Record<KolTier, { label: string; minFollowers: string }> = {
  mega:  { label: "MEGA",  minFollowers: "1M+" },
  macro: { label: "MACRO", minFollowers: "500K+" },
  mid:   { label: "MID",   minFollowers: "100K+" },
  micro: { label: "MICRO", minFollowers: "10K+" },
  nano:  { label: "NANO",  minFollowers: "<10K" },
};

export const NARRATIVE_CATEGORY_META: Record<NarrativeCategory, { icon: string; label: string }> = {
  ai:         { icon: "🤖", label: "AI" },
  war:        { icon: "⚔️", label: "Wars & Conflicts" },
  elections:  { icon: "🗳️", label: "Elections" },
  regulation: { icon: "⚖️", label: "Regulation" },
  defi:       { icon: "🏦", label: "DeFi" },
  memecoin:   { icon: "🐸", label: "Memecoin" },
  macro:      { icon: "🌍", label: "Macro" },
  tech:       { icon: "💻", label: "Tech" },
  scandal:    { icon: "🔥", label: "Scandal" },
  climate:    { icon: "🌱", label: "Climate" },
  sports:     { icon: "⚽", label: "Sports" },
  other:      { icon: "●", label: "Other" },
};

export const NARRATIVE_SIGNAL_META: Record<NarrativeSignal, { icon: string; label: string; desc: string }> = {
  catalyst:   { icon: "⚡", label: "Catalyst",   desc: "Triggers significant narrative shift" },
  escalation: { icon: "📈", label: "Escalation", desc: "Amplifies existing narrative trend" },
  resolution: { icon: "✅", label: "Resolution", desc: "Resolves uncertainty, settles narrative" },
  reversal:   { icon: "🔄", label: "Reversal",   desc: "Flips the narrative direction" },
  noise:      { icon: "○", label: "Noise",      desc: "Low-impact, does not shift narrative" },
};

export const PLATFORM_META: Record<string, { icon: string; label: string }> = {
  youtube:   { icon: "▶", label: "YouTube" },
  twitter:   { icon: "𝕏", label: "X / Twitter" },
  telegram:  { icon: "✈", label: "Telegram" },
  tiktok:    { icon: "♪", label: "TikTok" },
  instagram: { icon: "📷", label: "Instagram" },
  medium:    { icon: "M", label: "Medium" },
  other:     { icon: "●", label: "Other" },
};
