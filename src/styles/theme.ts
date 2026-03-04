/* ═══════════════════════════════════════════════════════════════
   @ratexai/event-graph — Theme System (RateXAI Dashboard v3)

   Color mapping from RateXAI dashboard SCSS:
     _colors.scss, _text-size.scss, _vars.scss, buttons.scss,
     bubbleMapTooltip.module.scss, bubbleMapMetric.module.scss
   ═══════════════════════════════════════════════════════════════ */

import type { GraphTheme, EventType, KolTier, NarrativeCategory, NarrativeSignal, Sentiment } from "../types";

// ─── RateXAI SCSS Variable Equivalents ───────────────────────
// $base-strong:       #11161b   (page bg)
// $base-weak-back:    #161d26   (alt bg, metric items)
// $base-strong-down:  #1d2732   (surface, panels)
// $base-strong-back:  #1b2b3e   (card fill)
// $base-weak:         #ffffff   (primary text)
// $faint-strong:      #353742   (standard border)
// $faint-strong-down: #626578   (lighter divider)
// $faint-weak-down:   #a7abc3   (secondary text)
// $faint-strong-up:   #848798   (muted/hint text)
// $accent-strong:     #1c64f2   (brand blue)
// $accent-strong-down:#1e429f   (accent hover)
// $success-strong:    #30fd82   (positive/winners)
// $success-strong-down:#19bd5b  (positive border)
// $success-weak-back: #15392b   (positive dim bg)
// $critic-strong:     #ff495f   (negative/losers)
// $critic-strong-down:#c11a2e   (negative border)
// $critic-weak-back:  #2c141b   (negative dim bg)
// $warning-strong:    #ff9f44   (catalyst/warning)
// $warning-weak-back: #2c2117   (warning dim bg)
// $complement:        #901dea   (Polymarket purple)
// $complement-strong-up:#b659ff

export const DEFAULT_THEME: GraphTheme = {
  // ─── Backgrounds ─────────────────────────────────────────
  bg: "#11161b",                        // $base-strong
  bgAlt: "#161d26",                     // $base-weak-back
  surface: "rgba(29,39,50,0.97)",       // $base-strong-down with alpha
  card: "rgba(27,43,62,0.94)",          // $base-strong-back with alpha

  // ─── Borders ─────────────────────────────────────────────
  border: "#353742",                    // $faint-strong
  borderLight: "#626578",              // $faint-strong-down

  // ─── Text ────────────────────────────────────────────────
  text: "#ffffff",                      // $base-weak
  textSecondary: "#a7abc3",            // $faint-weak-down
  muted: "#848798",                    // $faint-strong-up
  disabled: "#353742",                 // $faint-strong (disabled level)

  // ─── Accent (Blue — not green!) ──────────────────────────
  accent: "#1c64f2",                   // $accent-strong
  accentDim: "rgba(28,100,242,0.12)",  // accent bg
  accentHover: "#1e429f",              // $accent-strong-down

  // ─── Success / Positive ──────────────────────────────────
  positive: "#30fd82",                 // $success-strong
  positiveDim: "#15392b",              // $success-weak-back
  positiveDown: "#19bd5b",             // $success-strong-down

  // ─── Critic / Negative ───────────────────────────────────
  negative: "#ff495f",                 // $critic-strong
  negativeDim: "#2c141b",              // $critic-weak-back
  negativeDown: "#c11a2e",             // $critic-strong-down

  // ─── Neutral ─────────────────────────────────────────────
  neutral: "#848798",                  // $faint-strong-up
  neutralDim: "rgba(132,135,152,0.1)",

  // ─── Warning / Catalyst ──────────────────────────────────
  warning: "#ff9f44",                  // $warning-strong
  warningDim: "#2c2117",               // $warning-weak-back

  // ─── Complement / Polymarket ─────────────────────────────
  complement: "#901dea",               // $complement
  complementUp: "#b659ff",             // $complement-strong-up
  complementDim: "rgba(144,29,234,0.15)",

  // ─── Font Families ───────────────────────────────────────
  fontFamily: "'Work Sans', sans-serif",
  monoFontFamily: "'JetBrains Mono', 'SF Mono', monospace",

  // ─── Event Type Colors ───────────────────────────────────
  eventTypeColors: {
    blogger:     { color: "#818cf8", bg: "rgba(129,140,248,0.12)" },
    media:       { color: "#38bdf8", bg: "rgba(56,189,248,0.12)" },
    metric:      { color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
    partnership: { color: "#2dd4bf", bg: "rgba(45,212,191,0.12)" },
    listing:     { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
    launch:      { color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
    fud:         { color: "#ff495f", bg: "rgba(255,73,95,0.12)" },
    security:    { color: "#30fd82", bg: "rgba(48,253,130,0.12)" },
    event:       { color: "#e879f9", bg: "rgba(232,121,249,0.12)" },
    onchain:     { color: "#22d3ee", bg: "rgba(34,211,238,0.12)" },
    resolution:  { color: "#30fd82", bg: "rgba(48,253,130,0.12)" },
    milestone:   { color: "#fde047", bg: "rgba(253,224,71,0.12)" },
    community:   { color: "#f0abfc", bg: "rgba(240,171,252,0.12)" },
    governance:  { color: "#67e8f9", bg: "rgba(103,232,249,0.12)" },
    airdrop:     { color: "#fca5a5", bg: "rgba(252,165,165,0.12)" },
  },

  // ─── KOL Tier Colors ─────────────────────────────────────
  kolTierColors: {
    mega:  { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
    macro: { color: "#818cf8", bg: "rgba(129,140,248,0.12)" },
    mid:   { color: "#38bdf8", bg: "rgba(56,189,248,0.12)" },
    micro: { color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
    nano:  { color: "#848798", bg: "rgba(132,135,152,0.1)" },
  },

  // ─── Narrative Category Colors ───────────────────────────
  narrativeCategoryColors: {
    ai:         { color: "#818cf8", bg: "rgba(129,140,248,0.12)" },
    war:        { color: "#ff495f", bg: "rgba(255,73,95,0.12)" },
    elections:  { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
    regulation: { color: "#67e8f9", bg: "rgba(103,232,249,0.12)" },
    defi:       { color: "#2dd4bf", bg: "rgba(45,212,191,0.12)" },
    memecoin:   { color: "#e879f9", bg: "rgba(232,121,249,0.12)" },
    macro:      { color: "#38bdf8", bg: "rgba(56,189,248,0.12)" },
    tech:       { color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
    scandal:    { color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
    climate:    { color: "#30fd82", bg: "rgba(48,253,130,0.12)" },
    sports:     { color: "#22d3ee", bg: "rgba(34,211,238,0.12)" },
    other:      { color: "#848798", bg: "rgba(132,135,152,0.1)" },
  },

  // ─── Narrative Signal Colors (Semantic Mapping) ──────────
  // escalation → $critic-strong
  // catalyst   → $warning-strong
  // resolution → $success-strong
  // reversal   → $complement-strong-up
  // noise      → $faint-strong-up
  narrativeSignalColors: {
    catalyst:   { color: "#ff9f44", bg: "rgba(255,159,68,0.15)" },
    escalation: { color: "#ff495f", bg: "rgba(255,73,95,0.15)" },
    resolution: { color: "#30fd82", bg: "rgba(48,253,130,0.15)" },
    reversal:   { color: "#b659ff", bg: "rgba(182,89,255,0.15)" },
    noise:      { color: "#848798", bg: "rgba(132,135,152,0.08)" },
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
