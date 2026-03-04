import React from "react";
import type { EventType, GraphTheme, KolTier, Platform, NarrativeCategory, NarrativeSignal, ViewMode } from "../../types";
import { EVENT_TYPE_META, getEventTypeStyle, getKolTierStyle, getNarrativeCategoryStyle, KOL_TIER_META, PLATFORM_META, NARRATIVE_CATEGORY_META } from "../../styles/theme";
import { formatNumber } from "../../utils";

// ─── BubbleMap filter button base style ─────────────────────────
// §4 FilterButton_CSS: height 30, borderRadius 8, border none,
// bg faintStrong (#353742), color white, fontSize 11, fontWeight 500

const filterBtn = (theme: GraphTheme, on: boolean, activeColor?: string, activeBg?: string): React.CSSProperties => ({
  height: 30,
  padding: "0 12px",
  borderRadius: 8,
  border: "none",
  background: on ? (activeBg || theme.accent) : theme.border,      // §4: active=accentStrong, inactive=faintStrong
  color: on ? "#ffffff" : theme.text,                                // §4: always white text
  fontSize: 11,
  fontWeight: 500,
  fontFamily: "inherit",
  cursor: "pointer",
  transition: "background 0.3s ease",
  whiteSpace: "nowrap",
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
});

// ─── Header Bar ─────────────────────────────────────────────────

interface HeaderBarProps {
  mode: ViewMode;
  theme: GraphTheme;
  branding: { name: string; logo?: React.ReactNode | string; accentColor?: string };
  showModeSwitcher: boolean;
  eventCount: number;
  eventEdgeCount: number;
  kolCount: number;
  totalReach: number;
  narrativeCount?: number;
  currentProb?: number;
  zoom: number;
  onModeChange: (mode: ViewMode) => void;
}

export function HeaderBar({
  mode, theme, branding, showModeSwitcher,
  eventCount, eventEdgeCount, kolCount, totalReach,
  narrativeCount = 0, currentProb, zoom, onModeChange,
}: HeaderBarProps) {
  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, height: 48,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 20px", borderBottom: `1px solid ${theme.border}`,
      background: `${theme.bg}f0`, backdropFilter: "blur(16px)", zIndex: 30,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {typeof branding.logo === "string"
          ? <img src={branding.logo} alt={branding.name} style={{ height: 20 }} />
          : branding.logo
            ? branding.logo
            : <span style={{ color: branding.accentColor || theme.accent, fontWeight: 700, fontSize: 14, letterSpacing: 2, fontFamily: theme.monoFontFamily, textTransform: "uppercase" as const }}>{branding.name}</span>}
        <div style={{ width: 1, height: 20, background: theme.border }} />
        {showModeSwitcher && (
          <div style={{ display: "flex", borderRadius: 8, border: `1px solid ${theme.border}`, overflow: "hidden" }}>
            {([ ["narratives", "Narratives"], ["events", "Events (Demo)"], ["kols", "KOLs (Demo)"] ] as [ViewMode, string][]).map(([key, label]) => (
              <button key={key} onClick={() => onModeChange(key)} style={{
                padding: "5px 14px", border: "none",
                background: mode === key ? theme.accent : "transparent",
                color: mode === key ? "#ffffff" : theme.muted,
                fontSize: 11, fontWeight: mode === key ? 600 : 400, cursor: "pointer",
                fontFamily: "inherit", transition: "background 0.3s ease",
                opacity: key === "narratives" ? 1 : 0.6,
              }}>{label}</button>
            ))}
          </div>
        )}
        <div style={{ padding: "2px 8px", borderRadius: 8, background: theme.accent, fontSize: 9, color: "#ffffff", fontWeight: 700 }}>LIVE</div>
      </div>
      <div style={{
        display: "flex", gap: 8, alignItems: "center",
        padding: "4px 10px", borderRadius: 8,
        background: theme.surface, border: `1px solid ${theme.border}`,
        fontSize: 12, fontWeight: 400, color: theme.textSecondary,
      }}>
        {mode === "events"
          ? <>{eventCount} entities · {eventEdgeCount} links</>
          : mode === "narratives"
            ? <>{narrativeCount} events{currentProb != null ? ` · ${currentProb.toFixed(0)}% prob` : ""}</>
            : <>{kolCount} KOLs · {formatNumber(totalReach)} reach</>}
        <span style={{ color: theme.border }}>|</span>
        <span>Zoom {(zoom * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

// ─── Filter Bar ─────────────────────────────────────────────────

interface FilterBarProps {
  mode: ViewMode;
  top: number;
  panelOffset: number;
  theme: GraphTheme;
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

export function FilterBar(props: FilterBarProps) {
  const {
    mode, top, panelOffset, theme,
    allEventTypes, allTiers, allPlatforms,
    allCategories = [], allSignals = [],
    activeEventTypes, activeTiers, activePlatforms,
    activeCategories, activeSignals,
    onResetEventTypes, onResetCategories,
    onToggleEventType, onToggleTier, onTogglePlatform,
    onToggleCategory, onToggleSignal,
    hasMarket, onToggleHasMarket,
  } = props;

  return (
    <div style={{
      position: "absolute", top, left: 0, right: panelOffset, height: 38,
      display: "flex", alignItems: "center", gap: 8, padding: "0 16px",
      borderBottom: `1px solid ${theme.border}`, background: `${theme.bg}e0`,
      backdropFilter: "blur(8px)", zIndex: 25, overflowX: "auto",
      scrollbarWidth: "none" as const,
    }}>
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
          <div style={{ width: 1, height: 18, background: theme.border, margin: "0 4px", flexShrink: 0 }} />
          <button onClick={onToggleHasMarket} aria-pressed={!!hasMarket}
            style={filterBtn(theme, !!hasMarket, theme.complementUp, theme.complement)}>Prediction</button>
        </>)}
      </>) : (<>
        {allTiers.map((tier) => {
          const style = getKolTierStyle(theme, tier);
          const meta = KOL_TIER_META[tier];
          const on = activeTiers.has(tier);
          return (
            <button key={tier} onClick={() => onToggleTier(tier)} aria-pressed={on}
              style={filterBtn(theme, on, style.color, style.color)}>{meta.label}</button>
          );
        })}
        <div style={{ width: 1, height: 18, background: theme.border, margin: "0 4px", flexShrink: 0 }} />
        {allPlatforms.map((platform) => {
          const on = activePlatforms.has(platform);
          const meta = PLATFORM_META[platform] || PLATFORM_META.other;
          return (
            <button key={platform} onClick={() => onTogglePlatform(platform)} aria-pressed={on}
              style={filterBtn(theme, on)}>{meta.label}</button>
          );
        })}
      </>)}
    </div>
  );
}

// ─── Stats Bars ─────────────────────────────────────────────────

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
        { l: "Total Reach", v: formatNumber(stats.totalReach), c: getKolTierStyle(theme, "mega").color },
        { l: "Mentions", v: String(stats.totalMentions), c: getKolTierStyle(theme, "macro").color },
        { l: "Avg Eng.", v: `${stats.avgEngRate.toFixed(1)}%`, c: getKolTierStyle(theme, "mid").color },
        { l: "Positive", v: `${stats.positiveRatio}%`, c: theme.positive },
      ].map((item, i) => (
        <div key={item.l} style={{ flex: 1, textAlign: "center", borderRight: i < 4 ? `1px solid ${theme.border}` : "none", padding: "4px 0" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: item.c }}>{item.v}</div>
          <div style={{ fontSize: 11, fontWeight: 500, color: theme.muted, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 2 }}>{item.l}</div>
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
        { l: "Probability", v: `${stats.currentProb.toFixed(1)}%`, c: theme.accent },
        { l: "Net Odds", v: `${stats.netOddsDelta > 0 ? "+" : ""}${stats.netOddsDelta.toFixed(1)}pp`, c: deltaColor },
        { l: "Momentum", v: stats.avgMomentum > 0 ? `+${stats.avgMomentum.toFixed(1)}` : stats.avgMomentum.toFixed(1), c: momentumColor },
        { l: "Volume", v: formatNumber(stats.totalVolume), c: getNarrativeCategoryStyle(theme, "ai").color },
      ].map((item, i) => (
        <div key={item.l} style={{ flex: 1, textAlign: "center", borderRight: i < 4 ? `1px solid ${theme.border}` : "none", padding: "4px 0" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: item.c }}>{item.v}</div>
          <div style={{ fontSize: 11, fontWeight: 500, color: theme.muted, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 2 }}>{item.l}</div>
        </div>
      ))}
    </div>
  );
}
