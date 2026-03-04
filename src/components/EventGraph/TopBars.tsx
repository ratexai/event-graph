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
    mode, theme, branding, showModeSwitcher, panelOffset, onModeChange,
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
      position: "absolute", top: 0, left: 0, right: panelOffset, height: 32,
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

      {/* Filters — narrative filters moved to bottom-left overlay */}
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

const SIZE_TIERS = [
  { key: "all", label: "All", min: 0 },
  { key: "m", label: "M+", min: 0.3 },
  { key: "l", label: "L+", min: 0.5 },
  { key: "xl", label: "XL", min: 0.7 },
] as const;

interface NarrativeFilterPanelProps {
  theme: GraphTheme;
  allCategories: NarrativeCategory[];
  allSignals: NarrativeSignal[];
  activeCategories: Set<NarrativeCategory>;
  activeSignals: Set<NarrativeSignal>;
  onResetCategories: () => void;
  onToggleCategory: (category: NarrativeCategory) => void;
  onToggleSignal: (signal: NarrativeSignal) => void;
  hasMarket?: boolean;
  onToggleHasMarket?: () => void;
  minWeight?: number;
  onSetMinWeight?: (w: number) => void;
}

export function NarrativeFilterPanel(props: NarrativeFilterPanelProps) {
  const {
    theme, allCategories, allSignals,
    activeCategories, activeSignals,
    onResetCategories, onToggleCategory, onToggleSignal,
    hasMarket, onToggleHasMarket,
    minWeight = 0, onSetMinWeight,
  } = props;

  const sectionLabel: React.CSSProperties = {
    fontSize: 8, fontWeight: 700, color: theme.muted,
    letterSpacing: 1.2, textTransform: "uppercase",
    marginBottom: 4, marginTop: 6,
  };

  return (
    <div style={{
      position: "absolute", bottom: 12, left: 12,
      display: "flex", flexDirection: "column", gap: 2,
      padding: "8px 10px", borderRadius: 10,
      background: `${theme.bg}ee`, backdropFilter: "blur(12px)",
      border: `1px solid ${theme.border}`, zIndex: 25,
      fontFamily: theme.fontFamily, maxWidth: 280,
    }}>
      {/* Category filters */}
      <div style={sectionLabel}>Category</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
        <button onClick={onResetCategories} aria-pressed={activeCategories.size === allCategories.length}
          style={filterBtn(theme, activeCategories.size === allCategories.length)}>All</button>
        {allCategories.map((cat) => {
          const style = getNarrativeCategoryStyle(theme, cat);
          const meta = NARRATIVE_CATEGORY_META[cat];
          const on = activeCategories.has(cat);
          return (
            <button key={cat} onClick={() => onToggleCategory(cat)} aria-pressed={on}
              style={filterBtn(theme, on, style.color, style.color)}>{meta?.label || cat.charAt(0).toUpperCase() + cat.slice(1)}</button>
          );
        })}
        {onToggleHasMarket && (
          <button onClick={onToggleHasMarket} aria-pressed={!!hasMarket}
            style={filterBtn(theme, !!hasMarket, theme.complementUp, theme.complement)}>Prediction</button>
        )}
      </div>

      {/* Signal filters */}
      <div style={sectionLabel}>Signal</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
        {allSignals.map((sig) => {
          const style = getNarrativeSignalStyle(theme, sig);
          const meta = NARRATIVE_SIGNAL_META[sig];
          const on = activeSignals.has(sig);
          return (
            <button key={sig} onClick={() => onToggleSignal(sig)} aria-pressed={on}
              style={filterBtn(theme, on, style.color, style.color)}>{meta?.label}</button>
          );
        })}
      </div>

      {/* Size filter */}
      {onSetMinWeight && (
        <>
          <div style={sectionLabel}>Min Size</div>
          <div style={{ display: "flex", gap: 3 }}>
            {SIZE_TIERS.map((tier) => {
              const on = minWeight === tier.min;
              return (
                <button key={tier.key} onClick={() => onSetMinWeight(tier.min)}
                  aria-pressed={on} style={filterBtn(theme, on)}>{tier.label}</button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
