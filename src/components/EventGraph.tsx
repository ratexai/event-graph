/* ═══════════════════════════════════════════════════════════════
   EventGraph — Main Orchestrator Component

   Usage:
   ```tsx
   import { EventGraph } from "@ratexai/event-graph";
   <EventGraph eventData={...} kolData={...} defaultMode="events" />
   ```
   ═══════════════════════════════════════════════════════════════ */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EventGraphProps, EventNode, EventType, KolNode, NarrativeNode, KolTier, Platform, NarrativeCategory, NarrativeSignal, ViewMode } from "../types";
import { mergeTheme } from "../styles/theme";
import {
  useAnimationTime,
  useContainerSize,
  useEventFlowGraph,
  useGraphFilters,
  useGraphSelection,
  useKolFlowGraph,
  useNarrativeFlowGraph,
  usePanZoom,
} from "../hooks";
import { isAnchorNode } from "../utils";
import { DetailPanel, HoverTooltip } from "./Panel/DetailPanel";
import { GraphCanvas } from "./EventGraph/GraphCanvas";
import { StatusOverlay, ZoomControls } from "./EventGraph/Overlays";
import { TopBar, KolStatsBar, NarrativeStatsBar, NarrativeLegendBar } from "./EventGraph/TopBars";
import { GraphErrorBoundary } from "./Shared/ErrorBoundary";
import { CuiBonoPanel } from "./CuiBono/CuiBonoPanel";
import { AnchorModal } from "./NarrativeFlow/AnchorModal";

const TOP_BAR_HEIGHT = 36;
const KOL_STATS_HEIGHT = 30;
/** Right sidebar occupies 20 % of the container width (min 260, max 380). */
const CUI_BONO_PCT = 0.20;

const EMPTY_EVENT_NODES: EventNode[] = [];
const EMPTY_KOL_NODES: KolNode[] = [];
const EMPTY_NARRATIVE_NODES: NarrativeNode[] = [];
const NARRATIVE_STATS_HEIGHT = 30;

function toIdMap<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

export const EventGraph: React.FC<EventGraphProps> = ({
  defaultMode = "narratives",
  eventData,
  kolData,
  narrativeData,
  theme: themeOverrides,
  layout: layoutOverrides,
  showFilters = true,
  showDetailPanel = true,
  showZoomControls = true,
  showKolStats = true,
  showNarrativeStats = true,
  nav,
  onNodeSelect,
  onNodeHover,
  onModeChange,
  onFilterChange,
  loading = false,
  error = null,
  className,
  style,
  width = "100%",
  height = "100vh",
}) => {
  const [mode, setMode] = useState<ViewMode>(defaultMode);
  const [anchorModalId, setAnchorModalId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dims = useContainerSize(containerRef);
  const time = useAnimationTime();
  const panZoom = usePanZoom();
  const selection = useGraphSelection();
  const theme = useMemo(() => mergeTheme(themeOverrides), [themeOverrides]);

  const eventNodes = eventData?.nodes ?? EMPTY_EVENT_NODES;
  const kolNodes = kolData?.nodes ?? EMPTY_KOL_NODES;
  const narrativeNodes = narrativeData?.nodes ?? EMPTY_NARRATIVE_NODES;

  const allEventTypes = useMemo<EventType[]>(() => [...new Set(eventNodes.map((node) => node.type))], [eventNodes]);
  const allTiers = useMemo<KolTier[]>(() => [...new Set(kolNodes.map((node) => node.tier))], [kolNodes]);
  const allPlatforms = useMemo<Platform[]>(() => [...new Set(kolNodes.map((node) => node.platform))], [kolNodes]);
  const allCategories = useMemo<NarrativeCategory[]>(() => [...new Set(narrativeNodes.map((node) => node.category))], [narrativeNodes]);
  const allSignals = useMemo<NarrativeSignal[]>(() => [...new Set(narrativeNodes.map((node) => node.signal))], [narrativeNodes]);
  const graphFilters = useGraphFilters(allEventTypes, allTiers, allPlatforms, allCategories, allSignals);

  // Notify parent when filters change
  useEffect(() => {
    onFilterChangeRef.current?.(graphFilters.filters);
  }, [graphFilters.filters]);

  const statsHeight = mode === "kols" && showKolStats ? KOL_STATS_HEIGHT : mode === "narratives" && showNarrativeStats ? NARRATIVE_STATS_HEIGHT : 0;
  const topOffset = (showFilters ? TOP_BAR_HEIGHT : 0) + statsHeight;
  const hasCuiBono = mode === "narratives" && !!narrativeData?.narrative?.cuiBono;
  const hasNarrativeSidebar = mode === "narratives" && (hasCuiBono || narrativeNodes.length > 0);
  const sidebarWidth = Math.max(260, Math.min(380, Math.round(dims.w * CUI_BONO_PCT)));
  const cuiBonoWidth = hasNarrativeSidebar ? sidebarWidth : 0;
  const panelWidth = selection.panelOpen && showDetailPanel ? sidebarWidth : cuiBonoWidth;
  // Map canvas always takes full width — sidebars overlay on top.
  // This prevents element collisions when the viewport is small.
  const svgWidth = Math.max(0, dims.w);
  const svgHeight = Math.max(0, dims.h - topOffset);

  const evGraph = useEventFlowGraph(eventData, svgWidth, svgHeight, graphFilters.filters, selection.hovered, layoutOverrides);
  const kolGraph = useKolFlowGraph(kolData, svgWidth, svgHeight, graphFilters.filters, selection.hovered, layoutOverrides);
  const narGraph = useNarrativeFlowGraph(narrativeData, svgWidth, svgHeight, graphFilters.filters, selection.hovered, layoutOverrides);

  const currentGraph = mode === "events" ? evGraph : mode === "narratives" ? narGraph : kolGraph;
  const timeSlots = mode === "events" ? (eventData?.timeSlots ?? []) : mode === "narratives" ? (narrativeData?.timeSlots ?? []) : (kolData?.timeSlots ?? []);

  const graphWidth = svgWidth - currentGraph.layout.padding.left - currentGraph.layout.padding.right;
  const graphHeight = svgHeight - currentGraph.layout.padding.top - currentGraph.layout.padding.bottom;

  const eventById = useMemo(() => toIdMap(eventNodes), [eventNodes]);
  const kolById = useMemo(() => toIdMap(kolNodes), [kolNodes]);
  const narrativeById = useMemo(() => toIdMap(narrativeNodes), [narrativeNodes]);

  // Use refs for callbacks to avoid recreating handlers on every render
  const onModeChangeRef = useRef(onModeChange);
  onModeChangeRef.current = onModeChange;
  const onNodeHoverRef = useRef(onNodeHover);
  onNodeHoverRef.current = onNodeHover;
  const onNodeSelectRef = useRef(onNodeSelect);
  onNodeSelectRef.current = onNodeSelect;
  const onFilterChangeRef = useRef(onFilterChange);
  onFilterChangeRef.current = onFilterChange;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const handleModeChange = useCallback((nextMode: ViewMode) => {
    setMode(nextMode);
    selection.closePanel();
    onModeChangeRef.current?.(nextMode);
  }, [selection.closePanel]);

  const handleNodeHover = useCallback((id: string | null) => {
    selection.setHovered(id);
    onNodeHoverRef.current?.(id, modeRef.current);
  }, [selection.setHovered]);

  const handleNodeSelect = useCallback((id: string) => {
    // If clicking an anchor node, show the anchor modal instead of detail panel
    if (modeRef.current === "narratives") {
      const node = narrativeById.get(id);
      if (node && isAnchorNode(node)) {
        setAnchorModalId(id);
        return;
      }
    }
    selection.setSelected(id);
    onNodeSelectRef.current?.(id, modeRef.current);
  }, [selection.setSelected, narrativeById]);

  const handleMarketSelect = useCallback((anchorId: string) => {
    // Highlight the anchor on the graph + all causal chains
    selection.setHovered(anchorId);
    setAnchorModalId(anchorId);
  }, [selection.setHovered]);

  const selectedEvent = mode === "events" && selection.selected ? eventById.get(selection.selected) ?? null : null;
  const selectedKol = mode === "kols" && selection.selected ? kolById.get(selection.selected) ?? null : null;
  const selectedNarrative = mode === "narratives" && selection.selected ? narrativeById.get(selection.selected) ?? null : null;
  const hoveredEvent = mode === "events" && selection.hovered && !selection.panelOpen ? eventById.get(selection.hovered) ?? null : null;
  const hoveredKol = mode === "kols" && selection.hovered && !selection.panelOpen ? kolById.get(selection.hovered) ?? null : null;
  const hoveredNarrative = mode === "narratives" && selection.hovered && !selection.panelOpen ? narrativeById.get(selection.hovered) ?? null : null;
  const timeSlotLabels = useMemo(() => timeSlots.map((slot) => slot.label), [timeSlots]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width,
        height,
        background: theme.bg,
        fontFamily: theme.fontFamily,
        color: theme.text,
        overflow: "hidden",
        position: "relative",
        userSelect: "none",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {/* Disable SVG animations when user prefers reduced motion */}
      <style>{`@media (prefers-reduced-motion: reduce) { animate, animateMotion, animateTransform { display: none; } }`}</style>

      {showFilters && (
        <TopBar
          mode={mode}
          theme={theme}
          nav={nav}
          panelOffset={panelWidth}
          onModeChange={handleModeChange}
          allEventTypes={allEventTypes}
          allTiers={allTiers}
          allPlatforms={allPlatforms}
          allCategories={allCategories}
          activeEventTypes={graphFilters.filters.activeEventTypes}
          activeTiers={graphFilters.filters.activeTiers}
          activePlatforms={graphFilters.filters.activePlatforms}
          activeCategories={graphFilters.filters.activeCategories}
          onResetEventTypes={graphFilters.resetEventTypes}
          onResetCategories={graphFilters.resetCategories}
          onToggleEventType={graphFilters.toggleEventType}
          onToggleTier={graphFilters.toggleTier}
          onTogglePlatform={graphFilters.togglePlatform}
          onToggleCategory={graphFilters.toggleCategory}
          hasMarket={graphFilters.filters.hasMarket}
          onToggleHasMarket={graphFilters.toggleHasMarket}
        />
      )}

      {mode === "kols" && showKolStats && (
        <KolStatsBar
          top={showFilters ? TOP_BAR_HEIGHT : 0}
          height={statsHeight}
          panelOffset={panelWidth}
          theme={theme}
          stats={kolGraph.stats}
        />
      )}

      {mode === "narratives" && showNarrativeStats && (
        <NarrativeStatsBar
          top={showFilters ? TOP_BAR_HEIGHT : 0}
          height={statsHeight}
          panelOffset={panelWidth}
          theme={theme}
          stats={narGraph.stats}
        />
      )}

      <GraphErrorBoundary theme={theme}>
        <GraphCanvas
          width={svgWidth}
          height={svgHeight}
          topOffset={topOffset}
          mode={mode}
          theme={theme}
          time={time}
          timeSlots={timeSlots}
          maxCol={currentGraph.maxCol}
          graphWidth={graphWidth}
          graphHeight={graphHeight}
          layoutPadding={currentGraph.layout.padding}
          panZoom={panZoom}
          edges={currentGraph.edges}
          positions={currentGraph.positions}
          activeChain={currentGraph.activeChain}
          hoveredId={selection.hovered}
          selectedId={selection.selected}
          eventNodes={evGraph.filtered}
          kolNodes={kolGraph.filtered}
          narrativeNodes={narGraph.filtered}
          eventById={eventById}
          kolById={kolById}
          narrativeById={narrativeById}
          onHover={handleNodeHover}
          onSelect={handleNodeSelect}
          onBackgroundClick={selection.closePanel}
        />
      </GraphErrorBoundary>

      <StatusOverlay theme={theme} loading={loading} error={error} />

      {showZoomControls && (
        <ZoomControls
          theme={theme}
          panelOffset={panelWidth}
          onZoomIn={panZoom.zoomIn}
          onZoomOut={panZoom.zoomOut}
          onReset={panZoom.reset}
        />
      )}

      {mode === "narratives" && (
        <NarrativeLegendBar
          theme={theme}
          panelOffset={panelWidth}
          allSignals={allSignals}
          activeSignals={graphFilters.filters.activeSignals}
          onToggleSignal={graphFilters.toggleSignal}
          minWeight={graphFilters.filters.minWeight ?? 0}
          onSetMinWeight={graphFilters.setMinWeight}
        />
      )}

      {/* Cui Bono + Markets sidebar — visible in narrative mode */}
      {hasNarrativeSidebar && (
        <CuiBonoPanel
          isOpen={hasNarrativeSidebar}
          narrativeCuiBono={narrativeData?.narrative?.cuiBono}
          selectedNodeCuiBono={selectedNarrative?.cuiBono}
          selectedNodeLabel={selectedNarrative?.label}
          theme={theme}
          topOffset={TOP_BAR_HEIGHT}
          narrativeNodes={narrativeNodes}
          onMarketSelect={handleMarketSelect}
          panelWidth={cuiBonoWidth}
        />
      )}

      {showDetailPanel && (
        <DetailPanel
          isOpen={selection.panelOpen}
          selectedEvent={selectedEvent}
          selectedKol={selectedKol}
          selectedNarrative={selectedNarrative}
          allEvents={eventNodes}
          allKols={kolNodes}
          allNarratives={narrativeNodes}
          timeSlotLabels={timeSlotLabels}
          theme={theme}
          onClose={selection.closePanel}
          onNavigate={handleNodeSelect}
          panelWidth={sidebarWidth}
        />
      )}

      <HoverTooltip event={hoveredEvent} kol={hoveredKol} narrative={hoveredNarrative} theme={theme} />

      {/* Anchor Modal — full overlay for Polymarket anchor nodes */}
      {anchorModalId && narrativeById.get(anchorModalId) && (
        <AnchorModal
          anchor={narrativeById.get(anchorModalId)!}
          allNodes={narrativeNodes}
          theme={theme}
          onClose={() => setAnchorModalId(null)}
          onNavigate={(id) => {
            setAnchorModalId(null);
            handleNodeSelect(id);
          }}
        />
      )}
    </div>
  );
};
