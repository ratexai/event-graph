import React from "react";
import type { EventType, GraphTheme, KolTier, Platform, NarrativeCategory, NarrativeSignal, ViewMode } from "../../types";
import { EVENT_TYPE_META, getEventTypeStyle, getKolTierStyle, getNarrativeCategoryStyle, getNarrativeSignalStyle, KOL_TIER_META, PLATFORM_META, NARRATIVE_CATEGORY_META, NARRATIVE_SIGNAL_META } from "../../styles/theme";
import { formatNumber } from "../../utils";

// ─── Compact filter button ──────────────────────────────────────
const filterBtn = (theme: GraphTheme, on: boolean, activeColor?: string, activeBg?: string): React.CSSProperties => ({
  height: 24,
  padding: "0 8px",
  borderRadius: 6,
  border: "none",
  background: on ? (activeBg || theme.accent) : theme.border,
  color: on ? "#ffffff" : theme.text,
  fontSize: 10,
  fontWeight: 500,
  fontFamily: "inherit",
  cursor: "pointer",
  transition: "background 0.3s ease",
  whiteSpace: "nowrap",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
});

// ─── Mode switcher button ───────────────────────────────────────
const modeBtn = (theme: GraphTheme, active: boolean, isDemo: boolean): React.CSSProperties => ({
  padding: "3px 10px",
  border: "none",
  background: active ? theme.accent : "transparent",
  color: active ? "#ffffff" : theme.muted,
  fontSize: 10,
  fontWeight: active ? 600 : 400,
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "background 0.3s ease",
  opacity: isDemo ? 0.6 : 1,
});

// ─── Unified Top Bar (branding + mode + filters in one row) ─────

interface TopBarProps {
  mode: ViewMode;
  theme: GraphTheme;
  branding: { name: string; logo?: React.ReactNode | string; accentColor?: string };
  showModeSwitcher: boolean;
  panelOffset: number;
  topOffset?: number;
  onModeChange: (mode: ViewMode) => void;
  // Filters
  allEventTypes: EventType[];
  allTiers: KolTier[];
  allPlatforms: Platform[];
  allCategories?: NarrativeCategory[];
  allSignals?: NarrativeSignal[];
  activeEventTypes: Set<EventType>;
  activeTiers: Set<KolTier>;
  activePlatforms: Set<Platform>;
  activeCategories?: Set<NarrativeCategory>;
  activeSignals?: Set<NarrativeSignal>;
  onResetEventTypes: () => void;
  onResetCategories?: () => void;
  onToggleEventType: (type: EventType) => void;
  onToggleTier: (tier: KolTier) => void;
  onTogglePlatform: (platform: Platform) => void;
  onToggleCategory?: (category: NarrativeCategory) => void;
  onToggleSignal?: (signal: NarrativeSignal) => void;
  hasMarket?: boolean;
  onToggleHasMarket?: () => void;
}

export function TopBar(props: TopBarProps) {
  const {
    mode, theme, branding, showModeSwitcher, panelOffset, topOffset = 0, onModeChange,
    allEventTypes, allTiers, allPlatforms,
    allCategories = [],
    activeEventTypes, activeTiers, activePlatforms,
    activeCategories,
    onResetEventTypes, onResetCategories,
    onToggleEventType, onToggleTier, onTogglePlatform,
    onToggleCategory,
    hasMarket, onToggleHasMarket,
  } = props;

  return (
    <div style={{
      position: "absolute", top: topOffset, left: 0, right: panelOffset, height: 32,
      display: "flex", alignItems: "center", gap: 8, padding: "0 12px",
      borderBottom: `1px solid ${theme.border}`, background: `${theme.bg}f0`,
      backdropFilter: "blur(16px)", zIndex: 30, overflowX: "auto",
      scrollbarWidth: "none" as const,
    }}>
      {/* Branding */}
      {typeof branding.logo === "string"
        ? <img src={branding.logo} alt={branding.name} style={{ height: 14, flexShrink: 0 }} />
        : branding.logo
          ? branding.logo
          : <span style={{ color: branding.accentColor || theme.accent, fontWeight: 700, fontSize: 11, letterSpacing: 1.5, fontFamily: theme.monoFontFamily, textTransform: "uppercase" as const, flexShrink: 0 }}>{branding.name}</span>}

      {/* Mode switcher */}
      {showModeSwitcher && (<>
        <div style={{ width: 1, height: 16, background: theme.border, flexShrink: 0 }} />
        <div style={{ display: "flex", borderRadius: 6, border: `1px solid ${theme.border}`, overflow: "hidden", flexShrink: 0 }}>
          {([ ["narratives", "Narratives", false], ["events", "Events (Demo)", true], ["kols", "KOLs (Demo)", true] ] as [ViewMode, string, boolean][]).map(([key, label, isDemo]) => (
            <button key={key} onClick={() => onModeChange(key)} style={modeBtn(theme, mode === key, isDemo)}>{label}</button>
          ))}
        </div>
      </>)}

      {/* Divider before filters */}
      <div style={{ width: 1, height: 16, background: theme.border, flexShrink: 0 }} />

      {/* Filters */}
      {mode === "events" ? (<>
        <button onClick={onResetEventTypes} aria-pressed={activeEventTypes.size === allEventTypes.length}
          style={filterBtn(theme, activeEventTypes.size === allEventTypes.length)}>All</button>
        {allEventTypes.map((type) => {
          const style = getEventTypeStyle(theme, type);
          const meta = EVENT_TYPE_META[type];
          const on = activeEventTypes.has(type);
          return (
            <button key={type} onClick={() => onToggleEventType(type)} aria-pressed={on}
              style={filterBtn(theme, on, style.color, style.color)}>{meta?.label}</button>
          );
        })}
      </>) : mode === "narratives" ? (<>
        {onResetCategories && (
          <button onClick={onResetCategories} aria-pressed={activeCategories?.size === allCategories.length}
            style={filterBtn(theme, activeCategories != null && activeCategories.size === allCategories.length)}>All</button>
        )}
        {allCategories.map((cat) => {
          const style = getNarrativeCategoryStyle(theme, cat);
          const meta = NARRATIVE_CATEGORY_META[cat];
          const on = activeCategories?.has(cat) ?? true;
          return (
            <button key={cat} onClick={() => onToggleCategory?.(cat)} aria-pressed={on}
              style={filterBtn(theme, on, style.color, style.color)}>{meta?.label || cat.charAt(0).toUpperCase() + cat.slice(1)}</button>
          );
        })}
        {onToggleHasMarket && (<>
          <div style={{ width: 1, height: 14, background: theme.border, margin: "0 2px", flexShrink: 0 }} />
          <button onClick={onToggleHasMarket} aria-pressed={!!hasMarket}
            style={filterBtn(theme, !!hasMarket, theme.complementUp, theme.complement)}>Prediction</button>
        </>)}
      </>) : mode === "kols" ? (<>
        {allTiers.map((tier) => {
          const style = getKolTierStyle(theme, tier);
          const meta = KOL_TIER_META[tier];
          const on = activeTiers.has(tier);
          return (
            <button key={tier} onClick={() => onToggleTier(tier)} aria-pressed={on}
              style={filterBtn(theme, on, style.color, style.color)}>{meta.label}</button>
          );
        })}
        <div style={{ width: 1, height: 14, background: theme.border, margin: "0 2px", flexShrink: 0 }} />
        {allPlatforms.map((platform) => {
          const on = activePlatforms.has(platform);
          const meta = PLATFORM_META[platform] || PLATFORM_META.other;
          return (
            <button key={platform} onClick={() => onTogglePlatform(platform)} aria-pressed={on}
              style={filterBtn(theme, on)}>{meta.label}</button>
          );
        })}
      </>) : null}
    </div>
  );
}

// ─── Compact Stats Bars ─────────────────────────────────────────

interface KolStatsBarProps {
  top: number;
  height: number;
  panelOffset: number;
  theme: GraphTheme;
  stats: {
    totalKols: number;
    totalReach: number;
    totalMentions: number;
    avgEngRate: number;
    positiveRatio: number;
  };
}

export function KolStatsBar({ top, height, panelOffset, theme, stats }: KolStatsBarProps) {
  return (
    <div style={{
      position: "absolute", top, left: 0, right: panelOffset,
      height, display: "flex", alignItems: "center",
      borderBottom: `1px solid ${theme.border}`, background: `${theme.bg}d8`, zIndex: 24,
    }}>
      {[
        { l: "KOLs", v: String(stats.totalKols), c: theme.accent },
        { l: "Reach", v: formatNumber(stats.totalReach), c: getKolTierStyle(theme, "mega").color },
        { l: "Mentions", v: String(stats.totalMentions), c: getKolTierStyle(theme, "macro").color },
        { l: "Eng.", v: `${stats.avgEngRate.toFixed(1)}%`, c: getKolTierStyle(theme, "mid").color },
        { l: "Positive", v: `${stats.positiveRatio}%`, c: theme.positive },
      ].map((item, i) => (
        <div key={item.l} style={{ flex: 1, textAlign: "center", borderRight: i < 4 ? `1px solid ${theme.border}` : "none", padding: "2px 0" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: item.c }}>{item.v}</div>
          <div style={{ fontSize: 8, fontWeight: 500, color: theme.muted, letterSpacing: 1, textTransform: "uppercase", marginTop: 1 }}>{item.l}</div>
        </div>
      ))}
    </div>
  );
}

interface NarrativeStatsBarProps {
  top: number;
  height: number;
  panelOffset: number;
  theme: GraphTheme;
  stats: {
    totalEvents: number;
    totalVolume: number;
    avgMomentum: number;
    currentProb: number;
    netOddsDelta: number;
  };
}

export function NarrativeStatsBar({ top, height, panelOffset, theme, stats }: NarrativeStatsBarProps) {
  const deltaColor = stats.netOddsDelta > 0 ? theme.positive : stats.netOddsDelta < 0 ? theme.negative : theme.neutral;
  const momentumColor = stats.avgMomentum > 0 ? theme.positive : stats.avgMomentum < 0 ? theme.negative : theme.neutral;
  return (
    <div style={{
      position: "absolute", top, left: 0, right: panelOffset,
      height, display: "flex", alignItems: "center",
      borderBottom: `1px solid ${theme.border}`, background: `${theme.bg}d8`, zIndex: 24,
    }}>
      {[
        { l: "Events", v: String(stats.totalEvents), c: theme.accent },
        { l: "Prob", v: `${stats.currentProb.toFixed(1)}%`, c: theme.accent },
        { l: "Odds", v: `${stats.netOddsDelta > 0 ? "+" : ""}${stats.netOddsDelta.toFixed(1)}pp`, c: deltaColor },
        { l: "Mtm", v: stats.avgMomentum > 0 ? `+${stats.avgMomentum.toFixed(1)}` : stats.avgMomentum.toFixed(1), c: momentumColor },
        { l: "Vol", v: formatNumber(stats.totalVolume), c: getNarrativeCategoryStyle(theme, "ai").color },
      ].map((item, i) => (
        <div key={item.l} style={{ flex: 1, textAlign: "center", borderRight: i < 4 ? `1px solid ${theme.border}` : "none", padding: "2px 0" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: item.c }}>{item.v}</div>
          <div style={{ fontSize: 8, fontWeight: 500, color: theme.muted, letterSpacing: 1, textTransform: "uppercase", marginTop: 1 }}>{item.l}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Narrative Filter Panel (bottom-left overlay) ────────────

const SIGNAL_SHAPES: Record<NarrativeSignal, { label: string; svg: string }> = {
  escalation: { label: "Escalation", svg: "M5,0 L10,8.66 L0,8.66Z" },
  catalyst:   { label: "Catalyst",   svg: "M5,0 L10,5 L5,10 L0,5Z" },
  resolution: { label: "Resolution", svg: "M1,0 L9,0 Q10,0 10,1 L10,7 Q10,8 9,8 L1,8 Q0,8 0,7 L0,1 Q0,0 1,0Z" },
  reversal:   { label: "Reversal",   svg: "M5,0.5 L9.5,5 L5,9.5 L0.5,5Z" },
  noise:      { label: "Noise",      svg: "" },
};

const SIZE_TIERS = [
  { key: "all", label: "All", min: 0, svgSize: 0 },
  { key: "xs", label: "XS", min: 0, svgSize: 8 },
  { key: "s", label: "S", min: 0.15, svgSize: 11 },
  { key: "m", label: "M", min: 0.3, svgSize: 14 },
  { key: "l", label: "L", min: 0.5, svgSize: 17 },
  { key: "xl", label: "XL", min: 0.7, svgSize: 20 },
] as const;

interface NarrativeLegendBarProps {
  theme: GraphTheme;
  panelOffset: number;
  allSignals: NarrativeSignal[];
  activeSignals: Set<NarrativeSignal>;
  onToggleSignal: (signal: NarrativeSignal) => void;
  minWeight?: number;
  onSetMinWeight?: (w: number) => void;
}

export function NarrativeLegendBar(props: NarrativeLegendBarProps) {
  const {
    theme, panelOffset, allSignals, activeSignals, onToggleSignal,
    minWeight = 0, onSetMinWeight,
  } = props;

  const legendItem = (on: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 4,
    cursor: "pointer", opacity: on ? 1 : 0.35,
    transition: "opacity 0.2s ease",
  });

  return (
    <div style={{
      position: "absolute", bottom: 8, left: 12, right: panelOffset + 12,
      display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      padding: "5px 12px", borderRadius: 8,
      background: `${theme.bg}ee`, backdropFilter: "blur(12px)",
      border: `1px solid ${theme.border}`, zIndex: 25,
      fontFamily: theme.fontFamily, fontSize: 12, color: theme.textSecondary,
    }}>
      {/* Legend — Shapes (signal filters) | Size | Sentiment */}
        {/* Shapes = signal filters */}
        <span style={{ fontWeight: 700, fontSize: 8, letterSpacing: 1, textTransform: "uppercase", color: theme.muted }}>Shapes</span>
        {allSignals.map((sig) => {
          const meta = NARRATIVE_SIGNAL_META[sig];
          const shape = SIGNAL_SHAPES[sig];
          const sigColor = theme.narrativeSignalColors[sig]?.color ?? theme.muted;
          const on = activeSignals.has(sig);
          return (
            <span key={sig} style={legendItem(on)} onClick={() => onToggleSignal(sig)}>
              <svg width={12} height={12} viewBox="0 0 10 10">
                {sig === "noise" ? (
                  <circle cx={5} cy={5} r={4} fill={on ? sigColor : "none"} stroke={sigColor} strokeWidth={1.2} fillOpacity={on ? 0.3 : 0} />
                ) : (
                  <path d={shape.svg} fill={on ? sigColor : "none"} stroke={sigColor} strokeWidth={1.2} strokeLinejoin="round" fillOpacity={on ? 0.3 : 0} />
                )}
              </svg>
              <span>{meta?.icon} {shape?.label}</span>
            </span>
          );
        })}

        <span style={{ margin: "0 2px", color: theme.border }}>|</span>

        {/* Size filter */}
        <span style={{ fontWeight: 700, fontSize: 8, letterSpacing: 1, textTransform: "uppercase", color: theme.muted }}>Size</span>
        {SIZE_TIERS.filter(t => t.key !== "all").map((tier) => {
          const on = minWeight <= tier.min;
          const isActive = onSetMinWeight != null;
          return (
            <span key={tier.key}
              style={{ ...legendItem(on || minWeight === 0), cursor: isActive ? "pointer" : "default" }}
              onClick={() => onSetMinWeight?.(minWeight === tier.min ? 0 : tier.min)}>
              <svg width={tier.svgSize} height={tier.svgSize} viewBox="0 0 10 10">
                <circle cx={5} cy={5} r={4} fill="none" stroke={minWeight === tier.min ? theme.accent : theme.muted} strokeWidth={minWeight === tier.min ? 1.5 : 0.8} />
              </svg>
              <span>{tier.label}</span>
            </span>
          );
        })}

        <span style={{ margin: "0 2px", color: theme.border }}>|</span>

        {/* Sentiment legend (non-interactive, informational) */}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
          <svg width={8} height={8}><circle cx={4} cy={4} r={3} fill={theme.positive} /></svg> pos
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
          <svg width={8} height={8}><circle cx={4} cy={4} r={3} fill={theme.negative} /></svg> neg
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
          <svg width={8} height={8}><circle cx={4} cy={4} r={3} fill={theme.neutral} /></svg> neu
        </span>
    </div>
  );
}
