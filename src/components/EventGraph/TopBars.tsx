import React from "react";
import type { EventType, GraphTheme, KolTier, Platform, NarrativeCategory, NarrativeSignal, ViewMode } from "../../types";
import { EVENT_TYPE_META, getEventTypeStyle, getKolTierStyle, getNarrativeCategoryStyle, getNarrativeSignalStyle, KOL_TIER_META, PLATFORM_META, NARRATIVE_CATEGORY_META, NARRATIVE_SIGNAL_META } from "../../styles/theme";
import { formatNumber } from "../../utils";

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
  mode,
  theme,
  branding,
  showModeSwitcher,
  eventCount,
  eventEdgeCount,
  kolCount,
  totalReach,
  narrativeCount = 0,
  currentProb,
  zoom,
  onModeChange,
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
            : <span style={{ color: branding.accentColor || theme.accent, fontWeight: 800, fontSize: 14, letterSpacing: 2.5 }}>{branding.name}</span>}
        <div style={{ width: 1, height: 20, background: theme.border }} />
        {showModeSwitcher && (
          <div style={{ display: "flex", borderRadius: 10, border: `1px solid ${theme.border}`, overflow: "hidden" }}>
            {([ ["events", "🌊 Events"], ["kols", "👥 KOLs"], ["narratives", "📊 Narratives"] ] as [ViewMode, string][]).map(([key, label]) => (
              <button key={key} onClick={() => onModeChange(key)} style={{
                padding: "5px 14px", border: "none",
                background: mode === key ? theme.accentDim : "transparent",
                color: mode === key ? theme.accent : theme.muted,
                fontSize: 10, fontWeight: mode === key ? 700 : 400, cursor: "pointer", fontFamily: "inherit", transition: "all .2s",
              }}>{label}</button>
            ))}
          </div>
        )}
        <div style={{ padding: "2px 8px", borderRadius: 10, background: theme.accentDim, fontSize: 9, color: theme.accent, fontWeight: 700 }}>LIVE</div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 9, color: theme.muted }}>
        {mode === "events"
          ? <>{eventCount} events · {eventEdgeCount} flows</>
          : mode === "narratives"
            ? <>{narrativeCount} events{currentProb != null ? ` · ${currentProb.toFixed(0)}% prob` : ""}</>
            : <>{kolCount} KOLs · {formatNumber(totalReach)} reach</>}
        <span>·</span><span>Zoom {(zoom * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

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
      display: "flex", alignItems: "center", gap: 4, padding: "0 16px",
      borderBottom: `1px solid ${theme.border}`, background: `${theme.bg}e0`,
      backdropFilter: "blur(8px)", zIndex: 25, overflowX: "auto",
    }}>
      {mode === "events" ? (<>
        <button onClick={onResetEventTypes} style={{
          padding: "3px 10px", borderRadius: 12,
          border: `1px solid ${activeEventTypes.size === allEventTypes.length ? theme.accent : theme.border}`,
          background: activeEventTypes.size === allEventTypes.length ? theme.accentDim : "transparent",
          color: activeEventTypes.size === allEventTypes.length ? theme.accent : theme.muted,
          fontSize: 9, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
        }}>All</button>
        {allEventTypes.map((type) => {
          const style = getEventTypeStyle(theme, type);
          const meta = EVENT_TYPE_META[type];
          const on = activeEventTypes.has(type);
          return (
            <button key={type} onClick={() => onToggleEventType(type)} style={{
              padding: "3px 10px", borderRadius: 12,
              border: `1px solid ${on ? style.color + "50" : theme.border}`,
              background: on ? style.bg : "transparent", color: on ? style.color : theme.muted,
              fontSize: 9, cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", transition: "all .2s",
            }}><span style={{ fontSize: 10 }}>{meta?.icon}</span>{meta?.label}</button>
          );
        })}
      </>) : mode === "narratives" ? (<>
        {onResetCategories && (
          <button onClick={onResetCategories} style={{
            padding: "3px 10px", borderRadius: 12,
            border: `1px solid ${activeCategories?.size === allCategories.length ? theme.accent : theme.border}`,
            background: activeCategories?.size === allCategories.length ? theme.accentDim : "transparent",
            color: activeCategories?.size === allCategories.length ? theme.accent : theme.muted,
            fontSize: 9, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
          }}>All</button>
        )}
        {allCategories.map((cat) => {
          const style = getNarrativeCategoryStyle(theme, cat);
          const meta = NARRATIVE_CATEGORY_META[cat];
          const on = activeCategories?.has(cat) ?? true;
          return (
            <button key={cat} onClick={() => onToggleCategory?.(cat)} style={{
              padding: "3px 10px", borderRadius: 12,
              border: `1px solid ${on ? style.color + "50" : theme.border}`,
              background: on ? style.bg : "transparent", color: on ? style.color : theme.muted,
              fontSize: 9, cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", transition: "all .2s",
            }}><span style={{ fontSize: 10 }}>{meta?.icon}</span>{meta?.label}</button>
          );
        })}
        {allSignals.length > 0 && (<>
          <div style={{ width: 1, height: 18, background: theme.border, margin: "0 6px" }} />
          <span style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, marginRight: 4 }}>SIGNAL:</span>
          {allSignals.map((sig) => {
            const style = getNarrativeSignalStyle(theme, sig);
            const meta = NARRATIVE_SIGNAL_META[sig];
            const on = activeSignals?.has(sig) ?? true;
            return (
              <button key={sig} onClick={() => onToggleSignal?.(sig)} style={{
                padding: "3px 10px", borderRadius: 12,
                border: `1px solid ${on ? style.color + "50" : theme.border}`,
                background: on ? style.bg : "transparent", color: on ? style.color : theme.muted,
                fontSize: 9, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
              }}>{meta?.icon} {meta?.label}</button>
            );
          })}
        </>)}
        {onToggleHasMarket && (<>
          <div style={{ width: 1, height: 18, background: theme.border, margin: "0 6px" }} />
          <button onClick={onToggleHasMarket} style={{
            padding: "3px 10px", borderRadius: 12,
            border: `1px solid ${hasMarket ? "#6366f1" + "80" : theme.border}`,
            background: hasMarket ? "rgba(99,102,241,0.15)" : "transparent",
            color: hasMarket ? "#a78bfa" : theme.muted,
            fontSize: 9, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
            display: "flex", alignItems: "center", gap: 4,
          }}>{"\uD83D\uDD2E"} Has Market</button>
        </>)}
      </>) : (<>
        <span style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, marginRight: 4 }}>TIER:</span>
        {allTiers.map((tier) => {
          const style = getKolTierStyle(theme, tier);
          const meta = KOL_TIER_META[tier];
          const on = activeTiers.has(tier);
          return (
            <button key={tier} onClick={() => onToggleTier(tier)} style={{
              padding: "3px 10px", borderRadius: 12,
              border: `1px solid ${on ? style.color + "50" : theme.border}`,
              background: on ? style.bg : "transparent", color: on ? style.color : theme.muted,
              fontSize: 9, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
            }}>{meta.label} <span style={{ opacity: 0.6, fontSize: 8 }}>{meta.minFollowers}</span></button>
          );
        })}
        <div style={{ width: 1, height: 18, background: theme.border, margin: "0 6px" }} />
        <span style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, marginRight: 4 }}>PLATFORM:</span>
        {allPlatforms.map((platform) => {
          const on = activePlatforms.has(platform);
          const meta = PLATFORM_META[platform] || PLATFORM_META.other;
          return (
            <button key={platform} onClick={() => onTogglePlatform(platform)} style={{
              padding: "3px 10px", borderRadius: 12,
              border: `1px solid ${on ? theme.accent + "40" : theme.border}`,
              background: on ? theme.accentDim : "transparent", color: on ? theme.accent : theme.muted,
              fontSize: 9, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
            }}>{meta.icon} {meta.label}</button>
          );
        })}
      </>)}
    </div>
  );
}

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
          <div style={{ fontSize: 16, fontWeight: 800, color: item.c }}>{item.v}</div>
          <div style={{ fontSize: 7.5, color: theme.muted, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 2 }}>{item.l}</div>
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
          <div style={{ fontSize: 16, fontWeight: 800, color: item.c }}>{item.v}</div>
          <div style={{ fontSize: 7.5, color: theme.muted, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 2 }}>{item.l}</div>
        </div>
      ))}
    </div>
  );
}
