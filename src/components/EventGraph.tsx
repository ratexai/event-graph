/* ═══════════════════════════════════════════════════════════════
   EventGraph — Main Orchestrator Component

   Usage:
   ```tsx
   import { EventGraph } from "@ratexai/event-graph";
   <EventGraph eventData={...} kolData={...} defaultMode="events" />
   ```
   ═══════════════════════════════════════════════════════════════ */

import React, { useRef, useMemo, useCallback, useState } from "react";
import type {
  EventGraphProps, ViewMode, EventType, KolTier, Platform, EventEdge, GraphTheme,
} from "../../types";
import {
  mergeTheme, getEventTypeStyle, getKolTierStyle,
  EVENT_TYPE_META, KOL_TIER_META, PLATFORM_META,
} from "../../styles/theme";
import {
  useAnimationTime, useContainerSize, usePanZoom,
  useGraphFilters, useGraphSelection,
  useEventFlowGraph, useKolFlowGraph,
} from "../../hooks";
import { formatNumber, streamWidth, kolStreamWidth } from "../../utils";
import { StreamPath, GridColumn, FlowArrow } from "../Shared/SvgPrimitives";
import { EventNodeComponent } from "../EventFlow/EventNode";
import { KolNodeComponent } from "../KolFlow/KolNode";
import { DetailPanel, HoverTooltip } from "../Panel/DetailPanel";

export const EventGraph: React.FC<EventGraphProps> = ({
  defaultMode = "events",
  eventData,
  kolData,
  theme: themeOverrides,
  layout: layoutOverrides,
  showModeSwitcher = true,
  showFilters = true,
  showDetailPanel = true,
  showZoomControls = true,
  showKolStats = true,
  branding = { name: "RateXAI" },
  onNodeSelect,
  onNodeHover,
  onModeChange,
  loading = false,
  error = null,
  className,
  style,
  width = "100%",
  height = "100vh",
}) => {
  const [mode, setMode] = useState<ViewMode>(defaultMode);
  const containerRef = useRef<HTMLDivElement>(null);
  const dims = useContainerSize(containerRef);
  const time = useAnimationTime();
  const panZoom = usePanZoom();
  const selection = useGraphSelection();
  const theme = useMemo(() => mergeTheme(themeOverrides), [themeOverrides]);

  // Derive filter values from data
  const allEventTypes = useMemo<EventType[]>(() => [...new Set(eventData?.nodes.map((n) => n.type) || [])], [eventData]);
  const allTiers = useMemo<KolTier[]>(() => [...new Set(kolData?.nodes.map((k) => k.tier) || [])], [kolData]);
  const allPlatforms = useMemo<Platform[]>(() => [...new Set(kolData?.nodes.map((k) => k.platform) || [])], [kolData]);
  const graphFilters = useGraphFilters(allEventTypes, allTiers, allPlatforms);

  // Layout dimensions
  const HEADER_H = 48;
  const FILTER_H = showFilters ? 38 : 0;
  const STATS_H = mode === "kols" && showKolStats ? 52 : 0;
  const topOffset = HEADER_H + FILTER_H + STATS_H;
  const panelW = selection.panelOpen && showDetailPanel ? 340 : 0;
  const svgW = dims.w - panelW;
  const svgH = dims.h - topOffset;

  const evGraph = useEventFlowGraph(eventData, svgW, svgH, graphFilters.filters, selection.hovered, layoutOverrides);
  const kolGraph = useKolFlowGraph(kolData, svgW, svgH, graphFilters.filters, selection.hovered, layoutOverrides);

  // Callbacks
  const handleModeChange = useCallback((m: ViewMode) => { setMode(m); selection.closePanel(); onModeChange?.(m); }, [onModeChange, selection]);
  const handleNodeHover = useCallback((id: string | null) => { selection.setHovered(id); onNodeHover?.(id, mode); }, [mode, onNodeHover, selection]);
  const handleNodeSelect = useCallback((id: string) => { selection.setSelected(id); onNodeSelect?.(id, mode); }, [mode, onNodeSelect, selection]);

  // Current mode data
  const currentEdges = mode === "events" ? evGraph.edges : kolGraph.edges;
  const currentPositions = mode === "events" ? evGraph.positions : kolGraph.positions;
  const currentChain = mode === "events" ? evGraph.activeChain : kolGraph.activeChain;
  const currentMaxCol = mode === "events" ? evGraph.maxCol : kolGraph.maxCol;
  const currentLayout = mode === "events" ? evGraph.layout : kolGraph.layout;
  const timeSlots = mode === "events" ? (eventData?.timeSlots || []) : (kolData?.timeSlots || []);
  const gw = svgW - currentLayout.padding.left - currentLayout.padding.right;
  const gh = svgH - currentLayout.padding.top - currentLayout.padding.bottom;

  const getStreamColor = useCallback((nodeId: string): string => {
    if (mode === "events") {
      const n = eventData?.nodes.find((e) => e.id === nodeId);
      return n ? getEventTypeStyle(theme, n.type).color : theme.muted;
    }
    const k = kolData?.nodes.find((e) => e.id === nodeId);
    return k ? getKolTierStyle(theme, k.tier).color : theme.muted;
  }, [mode, eventData, kolData, theme]);

  const isEdgeActive = useCallback((edge: EventEdge) => !!selection.hovered && currentChain.has(edge.from) && currentChain.has(edge.to), [selection.hovered, currentChain]);

  // Selected & hovered node references
  const selectedEvent = mode === "events" && selection.selected ? eventData?.nodes.find((n) => n.id === selection.selected) ?? null : null;
  const selectedKol = mode === "kols" && selection.selected ? kolData?.nodes.find((k) => k.id === selection.selected) ?? null : null;
  const hoveredEvent = mode === "events" && selection.hovered && !selection.panelOpen ? eventData?.nodes.find((n) => n.id === selection.hovered) ?? null : null;
  const hoveredKol = mode === "kols" && selection.hovered && !selection.panelOpen ? kolData?.nodes.find((k) => k.id === selection.hovered) ?? null : null;
  const timeSlotLabels = useMemo(() => timeSlots.map((s) => s.label), [timeSlots]);

  // ─── Render ─────────────────────────────────────────
  return (
    <div ref={containerRef} className={className} style={{
      width, height, background: theme.bg, fontFamily: "'JetBrains Mono','SF Mono',monospace",
      color: theme.text, overflow: "hidden", position: "relative", userSelect: "none", ...style,
    }}>
      {/* ═══ HEADER ═══ */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: HEADER_H,
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
              {([["events", "🌊 Events Flow"], ["kols", "👥 KOLs"]] as [ViewMode, string][]).map(([key, label]) => (
                <button key={key} onClick={() => handleModeChange(key)} style={{
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
            ? <>{evGraph.filtered.length} events · {evGraph.edges.length} flows</>
            : <>{kolGraph.filtered.length} KOLs · {formatNumber(kolGraph.stats.totalReach)} reach</>}
          <span>·</span><span>Zoom {(panZoom.zoom * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* ═══ FILTER BAR ═══ */}
      {showFilters && (
        <div style={{
          position: "absolute", top: HEADER_H, left: 0, right: panelW, height: FILTER_H,
          display: "flex", alignItems: "center", gap: 4, padding: "0 16px",
          borderBottom: `1px solid ${theme.border}`, background: `${theme.bg}e0`,
          backdropFilter: "blur(8px)", zIndex: 25, overflowX: "auto",
        }}>
          {mode === "events" ? (<>
            <button onClick={graphFilters.resetEventTypes} style={{
              padding: "3px 10px", borderRadius: 12,
              border: `1px solid ${graphFilters.filters.activeEventTypes.size === allEventTypes.length ? theme.accent : theme.border}`,
              background: graphFilters.filters.activeEventTypes.size === allEventTypes.length ? theme.accentDim : "transparent",
              color: graphFilters.filters.activeEventTypes.size === allEventTypes.length ? theme.accent : theme.muted,
              fontSize: 9, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
            }}>All</button>
            {allEventTypes.map((type) => {
              const info = getEventTypeStyle(theme, type);
              const meta = EVENT_TYPE_META[type];
              const on = graphFilters.filters.activeEventTypes.has(type);
              return (
                <button key={type} onClick={() => graphFilters.toggleEventType(type)} style={{
                  padding: "3px 10px", borderRadius: 12,
                  border: `1px solid ${on ? info.color + "50" : theme.border}`,
                  background: on ? info.bg : "transparent", color: on ? info.color : theme.muted,
                  fontSize: 9, cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", transition: "all .2s",
                }}><span style={{ fontSize: 10 }}>{meta?.icon}</span>{meta?.label}</button>
              );
            })}
          </>) : (<>
            <span style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, marginRight: 4 }}>TIER:</span>
            {allTiers.map((tier) => {
              const s = getKolTierStyle(theme, tier);
              const meta = KOL_TIER_META[tier];
              const on = graphFilters.filters.activeTiers.has(tier);
              return (
                <button key={tier} onClick={() => graphFilters.toggleTier(tier)} style={{
                  padding: "3px 10px", borderRadius: 12,
                  border: `1px solid ${on ? s.color + "50" : theme.border}`,
                  background: on ? s.bg : "transparent", color: on ? s.color : theme.muted,
                  fontSize: 9, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                }}>{meta.label} <span style={{ opacity: 0.6, fontSize: 8 }}>{meta.minFollowers}</span></button>
              );
            })}
            <div style={{ width: 1, height: 18, background: theme.border, margin: "0 6px" }} />
            <span style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, marginRight: 4 }}>PLATFORM:</span>
            {allPlatforms.map((p) => {
              const on = graphFilters.filters.activePlatforms.has(p);
              const meta = PLATFORM_META[p] || PLATFORM_META.other;
              return (
                <button key={p} onClick={() => graphFilters.togglePlatform(p)} style={{
                  padding: "3px 10px", borderRadius: 12,
                  border: `1px solid ${on ? theme.accent + "40" : theme.border}`,
                  background: on ? theme.accentDim : "transparent", color: on ? theme.accent : theme.muted,
                  fontSize: 9, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                }}>{meta.icon} {meta.label}</button>
              );
            })}
          </>)}
        </div>
      )}

      {/* ═══ KOL STATS BAR ═══ */}
      {mode === "kols" && showKolStats && (
        <div style={{
          position: "absolute", top: HEADER_H + FILTER_H, left: 0, right: panelW,
          height: STATS_H, display: "flex", alignItems: "center",
          borderBottom: `1px solid ${theme.border}`, background: `${theme.bg}d8`, zIndex: 24,
        }}>
          {[
            { l: "KOLs", v: String(kolGraph.stats.totalKols), c: theme.accent },
            { l: "Total Reach", v: formatNumber(kolGraph.stats.totalReach), c: getKolTierStyle(theme, "mega").color },
            { l: "Mentions", v: String(kolGraph.stats.totalMentions), c: getKolTierStyle(theme, "macro").color },
            { l: "Avg Eng.", v: kolGraph.stats.avgEngRate.toFixed(1) + "%", c: getKolTierStyle(theme, "mid").color },
            { l: "Positive", v: kolGraph.stats.positiveRatio + "%", c: theme.positive },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", borderRight: i < 4 ? `1px solid ${theme.border}` : "none", padding: "4px 0" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 7.5, color: theme.muted, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ SVG CANVAS ═══ */}
      <svg width={svgW} height={svgH}
        style={{ marginTop: topOffset, cursor: panZoom.isPanning ? "grabbing" : "grab" }}
        {...panZoom.handlers}>
        <defs>
          <pattern id="dotgrid" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="15" cy="15" r="0.5" fill={theme.muted} opacity="0.12" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dotgrid)" />
        <g transform={`translate(${panZoom.pan.x},${panZoom.pan.y}) scale(${panZoom.zoom})`}>
          {/* Grid columns */}
          {timeSlots.map((slot, i) => {
            if (i > currentMaxCol) return null;
            const x = currentLayout.padding.left + (gw / currentMaxCol) * i;
            return (
              <GridColumn key={i} x={x} topY={currentLayout.padding.top}
                bottomY={currentLayout.padding.top + gh}
                label={mode === "kols" ? `Wave ${i + 1}` : slot.label} theme={theme} />
            );
          })}
          {/* Flow direction arrow */}
          <FlowArrow startX={currentLayout.padding.left - 20} endX={currentLayout.padding.left + gw + 30}
            centerY={currentLayout.padding.top + gh / 2} theme={theme} />
          {/* Streams */}
          {currentEdges.map((edge, i) => {
            const from = currentPositions[edge.from];
            const to = currentPositions[edge.to];
            if (!from || !to) return null;
            const w = mode === "events"
              ? streamWidth(eventData?.nodes.find((n) => n.id === edge.to)?.weight ?? 0.5)
              : kolStreamWidth(kolData?.nodes.find((k) => k.id === edge.to)?.followers ?? 10000);
            const active = isEdgeActive(edge);
            return (
              <StreamPath key={`s-${i}`} index={i} from={from} to={to} width={w}
                fromColor={getStreamColor(edge.from)} toColor={getStreamColor(edge.to)}
                isActive={active} isDimmed={!!selection.hovered && !active} />
            );
          })}
          {/* Nodes */}
          {mode === "events"
            ? evGraph.filtered.map((ev) => {
                const pos = evGraph.positions[ev.id];
                if (!pos) return null;
                return <EventNodeComponent key={ev.id} event={ev} x={pos.x} y={pos.y} theme={theme} time={time}
                  isHovered={selection.hovered === ev.id} isSelected={selection.selected === ev.id}
                  isDimmed={!!selection.hovered && !evGraph.activeChain.has(ev.id)}
                  onHoverStart={(id) => handleNodeHover(id)} onHoverEnd={() => handleNodeHover(null)} onSelect={handleNodeSelect} />;
              })
            : kolGraph.filtered.map((kol) => {
                const pos = kolGraph.positions[kol.id];
                if (!pos) return null;
                return <KolNodeComponent key={kol.id} kol={kol} x={pos.x} y={pos.y} theme={theme} time={time}
                  isHovered={selection.hovered === kol.id} isSelected={selection.selected === kol.id}
                  isDimmed={!!selection.hovered && !kolGraph.activeChain.has(kol.id)}
                  onHoverStart={(id) => handleNodeHover(id)} onHoverEnd={() => handleNodeHover(null)} onSelect={handleNodeSelect} />;
              })}
        </g>
      </svg>

      {/* ═══ LOADING / ERROR ═══ */}
      {loading && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          padding: "16px 32px", borderRadius: 12, background: theme.surface, border: `1px solid ${theme.border}`,
          zIndex: 40, fontSize: 12, color: theme.textSecondary }}>Loading graph data...</div>
      )}
      {error && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          padding: "16px 32px", borderRadius: 12, background: theme.negativeDim, border: `1px solid ${theme.negative}40`,
          zIndex: 40, fontSize: 12, color: theme.negative }}>{error}</div>
      )}

      {/* ═══ ZOOM ═══ */}
      {showZoomControls && (
        <div style={{ position: "absolute", bottom: 20, right: panelW ? panelW + 16 : 16, display: "flex", flexDirection: "column", gap: 3, zIndex: 25 }}>
          {[
            { l: "+", a: panZoom.zoomIn },
            { l: "⊙", a: panZoom.reset },
            { l: "−", a: panZoom.zoomOut },
          ].map((b) => (
            <button key={b.l} onClick={b.a} style={{
              width: 30, height: 30, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bgAlt,
              color: theme.muted, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit",
            }}>{b.l}</button>
          ))}
        </div>
      )}

      {/* ═══ DETAIL PANEL ═══ */}
      {showDetailPanel && (
        <DetailPanel
          isOpen={selection.panelOpen}
          selectedEvent={selectedEvent}
          selectedKol={selectedKol}
          allEvents={eventData?.nodes || []}
          allKols={kolData?.nodes || []}
          timeSlotLabels={timeSlotLabels}
          theme={theme}
          onClose={selection.closePanel}
          onNavigate={handleNodeSelect}
        />
      )}

      {/* ═══ HOVER TOOLTIP ═══ */}
      <HoverTooltip event={hoveredEvent} kol={hoveredKol} theme={theme} />
    </div>
  );
};

export default EventGraph;
