import React, { useState, useRef, useEffect, useCallback } from "react";
import type { EventType, GraphTheme, KolTier, Platform, NarrativeCategory, NarrativeSignal, ViewMode, MapItem, ProjectItem, MapStatus, RadiantNavProps } from "../../types";
import { EVENT_TYPE_META, getEventTypeStyle, getKolTierStyle, getNarrativeCategoryStyle, KOL_TIER_META, PLATFORM_META, NARRATIVE_CATEGORY_META, NARRATIVE_SIGNAL_META } from "../../styles/theme";
import { formatNumber } from "../../utils";

// ─── Compact filter button ──────────────────────────────────────
const filterBtn = (theme: GraphTheme, on: boolean, activeColor?: string, activeBg?: string): React.CSSProperties => ({
  height: 22,
  padding: "0 7px",
  borderRadius: 5,
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
  gap: 3,
});

// ─── Flyout helpers ──────────────────────────────────────────────

const STATUS_COLOR: Record<MapStatus, string> = {
  active: "#30fd82", developing: "#ff9f44", monitoring: "#848798",
};
const STATUS_LABEL: Record<MapStatus, string> = {
  active: "ACTIVE", developing: "DEVELOPING", monitoring: "MONITORING",
};

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose]);
}

// ─── Nav flyout item ─────────────────────────────────────────────

const flyoutStyle = (theme: GraphTheme): React.CSSProperties => ({
  position: "absolute", top: "100%", left: 0, marginTop: 2,
  width: 340, maxHeight: 400, overflowY: "auto",
  background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 8,
  padding: "6px 0", zIndex: 100,
  boxShadow: "0 8px 32px rgba(0,0,0,0.5)", fontFamily: theme.fontFamily,
});

// ─── TopBar ──────────────────────────────────────────────────────

interface TopBarProps {
  mode: ViewMode;
  theme: GraphTheme;
  panelOffset: number;
  onModeChange: (mode: ViewMode) => void;
  // Nav
  nav?: RadiantNavProps;
  // Filters
  allEventTypes: EventType[];
  allTiers: KolTier[];
  allPlatforms: Platform[];
  allCategories?: NarrativeCategory[];
  activeEventTypes: Set<EventType>;
  activeTiers: Set<KolTier>;
  activePlatforms: Set<Platform>;
  activeCategories?: Set<NarrativeCategory>;
  onResetEventTypes: () => void;
  onResetCategories?: () => void;
  onToggleEventType: (type: EventType) => void;
  onToggleTier: (tier: KolTier) => void;
  onTogglePlatform: (platform: Platform) => void;
  onToggleCategory?: (category: NarrativeCategory) => void;
  hasMarket?: boolean;
  onToggleHasMarket?: () => void;
}

export function TopBar(props: TopBarProps) {
  const {
    mode, theme, panelOffset, onModeChange: _onModeChange,
    nav,
    allEventTypes, allTiers, allPlatforms,
    allCategories = [],
    activeEventTypes, activeTiers, activePlatforms,
    activeCategories,
    onResetEventTypes, onResetCategories,
    onToggleEventType, onToggleTier, onTogglePlatform,
    onToggleCategory,
    hasMarket, onToggleHasMarket,
  } = props;

  const [openFlyout, setOpenFlyout] = useState<"maps" | "projects" | "search" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const mapsRef = useRef<HTMLDivElement>(null);
  const projectsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeFlyout = useCallback(() => setOpenFlyout(null), []);
  useClickOutside(mapsRef, closeFlyout);
  useClickOutside(projectsRef, closeFlyout);
  useClickOutside(searchRef, closeFlyout);

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpenFlyout((prev) => prev === "search" ? null : "search");
      }
      if (e.key === "Escape") setOpenFlyout(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const hoverOpen = (which: "maps" | "projects") => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setOpenFlyout(which);
  };
  const hoverClose = () => {
    hoverTimerRef.current = setTimeout(() => setOpenFlyout(null), 200);
  };
  const keepOpen = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
  };

  const maps = nav?.maps ?? [];
  const projects = nav?.projects ?? [];

  const mapsByStatus = maps.reduce<Record<string, MapItem[]>>((acc, m) => {
    (acc[m.status] = acc[m.status] || []).push(m); return acc;
  }, {});

  const projectsByCategory = projects.reduce<Record<string, ProjectItem[]>>((acc, p) => {
    const cat = p.category || "Other";
    (acc[cat] = acc[cat] || []).push(p); return acc;
  }, {});

  // Search results (unified)
  const sq = searchQuery.trim().toLowerCase();
  const searchMaps = sq ? maps.filter((m) => m.title.toLowerCase().includes(sq)) : maps.slice(0, 4);
  const searchProjects = sq ? projects.filter((p) => p.title.toLowerCase().includes(sq)) : projects.slice(0, 4);

  const navLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 500, cursor: "pointer",
    color: theme.textSecondary, display: "inline-flex",
    alignItems: "center", gap: 4, padding: "2px 6px",
    borderRadius: 4, transition: "background 0.15s",
    whiteSpace: "nowrap", flexShrink: 0,
  };

  const rowItem = (active: boolean): React.CSSProperties => ({
    display: "flex", width: "100%", alignItems: "center", gap: 8,
    padding: "5px 14px",
    background: active ? `${theme.accent}12` : "transparent",
    border: "none", color: theme.text, fontSize: 11,
    fontFamily: theme.fontFamily, cursor: "pointer", textAlign: "left",
  });

  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: panelOffset, height: 28,
      display: "flex", alignItems: "center", gap: 6, padding: "0 10px",
      borderBottom: `1px solid ${theme.border}`, background: `${theme.bg}f0`,
      backdropFilter: "blur(16px)", zIndex: 30, overflowX: "auto",
      scrollbarWidth: "none" as const, fontFamily: theme.fontFamily,
    }}>
      {/* RADIANT logo */}
      <span style={{
        fontWeight: 800, fontSize: 11, letterSpacing: 2,
        color: theme.accent, fontFamily: theme.monoFontFamily,
        flexShrink: 0,
      }}>◈ RADIANT</span>

      {/* Prediction Map nav */}
      {nav && (
        <div ref={mapsRef} style={{ position: "relative", flexShrink: 0 }}
          onMouseEnter={() => hoverOpen("maps")}
          onMouseLeave={hoverClose}>
          <span style={{ ...navLabel, background: openFlyout === "maps" ? `${theme.accent}18` : undefined }}>
            🗺️ Prediction Map <span style={{ fontSize: 9, color: theme.muted }}>▾</span>
          </span>
          {openFlyout === "maps" && (
            <div style={flyoutStyle(theme)} onMouseEnter={keepOpen} onMouseLeave={hoverClose}>
              {(["active", "developing", "monitoring"] as MapStatus[]).map((status) => {
                const group = mapsByStatus[status];
                if (!group?.length) return null;
                return (
                  <React.Fragment key={status}>
                    <div style={{
                      padding: "6px 14px 2px", fontSize: 8, fontWeight: 700,
                      letterSpacing: 1.5, textTransform: "uppercase",
                      color: STATUS_COLOR[status],
                      display: "flex", alignItems: "center", gap: 5,
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: STATUS_COLOR[status], display: "inline-block" }} />
                      {STATUS_LABEL[status]}
                    </div>
                    {group.map((m) => (
                      <button key={m.id} onClick={() => { nav.onNavigateMap?.(m.id); setOpenFlyout(null); }}
                        style={rowItem(m.id === nav.activeMapId)}>
                        <span style={{ fontSize: 13, flexShrink: 0 }}>{m.emoji || "🗺️"}</span>
                        <span style={{ flex: 1, fontWeight: m.id === nav.activeMapId ? 600 : 400 }}>{m.title}</span>
                        <span style={{ fontSize: 9, color: theme.muted, padding: "0 4px", borderRadius: 3, background: theme.surface }}>{m.nodeCount}</span>
                        {m.headlineProb != null && <span style={{ fontSize: 10, fontWeight: 600, color: theme.accent }}>{m.headlineProb}%</span>}
                        {m.trend && m.trend !== "flat" && <span style={{ fontSize: 9, color: m.trend === "up" ? theme.positive : theme.negative }}>{m.trend === "up" ? "↑" : "↓"}</span>}
                      </button>
                    ))}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* HistoryFi nav */}
      {nav && (
        <div ref={projectsRef} style={{ position: "relative", flexShrink: 0 }}
          onMouseEnter={() => hoverOpen("projects")}
          onMouseLeave={hoverClose}>
          <span style={{ ...navLabel, background: openFlyout === "projects" ? `${theme.accent}18` : undefined }}>
            ⚡ HistoryFi <span style={{ fontSize: 9, color: theme.muted }}>▾</span>
          </span>
          {openFlyout === "projects" && (
            <div style={flyoutStyle(theme)} onMouseEnter={keepOpen} onMouseLeave={hoverClose}>
              {Object.entries(projectsByCategory).map(([cat, items]) => (
                <React.Fragment key={cat}>
                  <div style={{ padding: "6px 14px 2px", fontSize: 8, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: theme.muted }}>{cat}</div>
                  {items.map((p) => (
                    <button key={p.id} onClick={() => { nav.onNavigateProject?.(p.id); setOpenFlyout(null); }}
                      style={rowItem(p.id === nav.activeProjectId)}>
                      <span style={{ fontSize: 11 }}>⚡</span>
                      <span style={{ flex: 1, fontWeight: p.id === nav.activeProjectId ? 600 : 400 }}>{p.title}</span>
                      <span style={{ fontSize: 9, color: theme.muted }}>{p.eventCount} ev</span>
                      {p.rating && <span style={{ fontSize: 9, fontWeight: 700, color: theme.accent, padding: "0 3px", borderRadius: 3, background: `${theme.accent}18` }}>{p.rating}</span>}
                      {p.price && <span style={{ fontSize: 10, color: theme.text }}>{p.price}{p.priceChange && <span style={{ fontSize: 9, marginLeft: 2, color: p.priceChange.startsWith("+") || p.priceChange.startsWith("-") ? (p.priceChange.startsWith("+") ? theme.positive : theme.negative) : theme.muted }}>{p.priceChange}</span>}</span>}
                    </button>
                  ))}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Divider */}
      <div style={{ width: 1, height: 14, background: theme.border, flexShrink: 0 }} />

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
          <div style={{ width: 1, height: 12, background: theme.border, margin: "0 1px", flexShrink: 0 }} />
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
        <div style={{ width: 1, height: 12, background: theme.border, margin: "0 1px", flexShrink: 0 }} />
        {allPlatforms.map((platform) => {
          const on = activePlatforms.has(platform);
          const meta = PLATFORM_META[platform] || PLATFORM_META.other;
          return (
            <button key={platform} onClick={() => onTogglePlatform(platform)} aria-pressed={on}
              style={filterBtn(theme, on)}>{meta.label}</button>
          );
        })}
      </>) : null}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Search ⌘K */}
      {nav && (
        <div ref={searchRef} style={{ position: "relative", flexShrink: 0 }}>
          <span
            onClick={() => setOpenFlyout(openFlyout === "search" ? null : "search")}
            style={{ ...navLabel, fontSize: 10, gap: 3, cursor: "pointer" }}
          >
            🔍 <span style={{ fontSize: 9, color: theme.muted, fontFamily: theme.monoFontFamily }}>⌘K</span>
          </span>
          {openFlyout === "search" && (
            <div style={{ ...flyoutStyle(theme), right: 0, left: "auto", width: 380 }}>
              <div style={{ padding: "4px 10px 6px" }}>
                <input
                  type="text" placeholder="Search maps, projects..." autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && sq) nav.onSearch?.(searchQuery); }}
                  style={{
                    width: "100%", background: theme.surface,
                    border: `1px solid ${theme.accent}40`, borderRadius: 5,
                    padding: "5px 10px", color: theme.text, fontSize: 12,
                    fontFamily: theme.fontFamily, outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
              {searchMaps.length > 0 && (<>
                <div style={{ padding: "4px 14px 1px", fontSize: 8, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: theme.muted }}>🗺️ PREDICTION MAPS</div>
                {searchMaps.map((m) => (
                  <button key={m.id} onClick={() => { nav.onNavigateMap?.(m.id); setOpenFlyout(null); setSearchQuery(""); }}
                    style={rowItem(false)}>
                    <span style={{ fontSize: 12 }}>{m.emoji || "🗺️"}</span>
                    <span style={{ flex: 1 }}>{m.title}</span>
                    <span style={{ fontSize: 9, color: theme.muted }}>{m.nodeCount}</span>
                    <span style={{ fontSize: 8, padding: "0 4px", borderRadius: 44, background: `${STATUS_COLOR[m.status]}18`, color: STATUS_COLOR[m.status] }}>● {m.status}</span>
                  </button>
                ))}
              </>)}
              {searchProjects.length > 0 && (<>
                <div style={{ padding: "4px 14px 1px", fontSize: 8, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: theme.muted, marginTop: 2 }}>⚡ HISTORYFI</div>
                {searchProjects.map((p) => (
                  <button key={p.id} onClick={() => { nav.onNavigateProject?.(p.id); setOpenFlyout(null); setSearchQuery(""); }}
                    style={rowItem(false)}>
                    <span>⚡</span>
                    <span style={{ flex: 1 }}>{p.title}</span>
                    <span style={{ fontSize: 9, color: theme.muted }}>{p.eventCount} ev</span>
                    {p.rating && <span style={{ fontSize: 9, color: theme.accent, fontWeight: 600 }}>{p.rating}</span>}
                  </button>
                ))}
              </>)}
              {sq && searchMaps.length === 0 && searchProjects.length === 0 && (
                <div style={{ padding: 12, textAlign: "center", color: theme.muted, fontSize: 11 }}>No results for "{searchQuery}"</div>
              )}
            </div>
          )}
        </div>
      )}
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

// ─── Narrative Legend Bar (bottom overlay) ────────────────────

const SIGNAL_SHAPES: Record<NarrativeSignal, { label: string; svg: string }> = {
  escalation: { label: "Escalation", svg: "M5,0 L10,8.66 L0,8.66Z" },
  catalyst:   { label: "Catalyst",   svg: "M5,0 L10,5 L5,10 L0,5Z" },
  resolution: { label: "Resolution", svg: "M1,0 L9,0 Q10,0 10,1 L10,7 Q10,8 9,8 L1,8 Q0,8 0,7 L0,1 Q0,0 1,0Z" },
  reversal:   { label: "Reversal",   svg: "M5,0.5 L9.5,5 L5,9.5 L0.5,5Z" },
  noise:      { label: "Noise",      svg: "" },
};

const SIZE_TIERS = [
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
      <span style={{ fontWeight: 700, fontSize: 8, letterSpacing: 1, textTransform: "uppercase", color: theme.muted }}>Size</span>
      {SIZE_TIERS.map((tier) => (
        <span key={tier.key}
          style={{ ...legendItem(minWeight === 0 || minWeight <= tier.min), cursor: onSetMinWeight ? "pointer" : "default" }}
          onClick={() => onSetMinWeight?.(minWeight === tier.min ? 0 : tier.min)}>
          <svg width={tier.svgSize} height={tier.svgSize} viewBox="0 0 10 10">
            <circle cx={5} cy={5} r={4} fill="none" stroke={minWeight === tier.min ? theme.accent : theme.muted} strokeWidth={minWeight === tier.min ? 1.5 : 0.8} />
          </svg>
          <span>{tier.label}</span>
        </span>
      ))}
      <span style={{ margin: "0 2px", color: theme.border }}>|</span>
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
