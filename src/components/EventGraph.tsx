/* ═══════════════════════════════════════════════════════════════
   EventGraph — Main Orchestrator Component

   Usage:
   ```tsx
   import { EventGraph } from "@ratexai/event-graph";
   <EventGraph eventData={...} kolData={...} defaultMode="events" />
   ```
   ═══════════════════════════════════════════════════════════════ */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EventGraphProps, EventNode, EventType, FilterState, KolNode, KolTier, Platform, ViewMode } from "../types";
import { mergeTheme } from "../styles/theme";
import {
  useAnimationTime,
  useContainerSize,
  useEventFlowGraph,
  useGraphFilters,
  useGraphSelection,
  useKolFlowGraph,
  usePanZoom,
} from "../hooks";
import { DetailPanel, HoverTooltip } from "./Panel/DetailPanel";
import { GraphCanvas } from "./EventGraph/GraphCanvas";
import { StatusOverlay, ZoomControls } from "./EventGraph/Overlays";
import { FilterBar, HeaderBar, KolStatsBar } from "./EventGraph/TopBars";

const HEADER_HEIGHT = 48;
const FILTER_HEIGHT = 38;
const KOL_STATS_HEIGHT = 52;
const DETAIL_PANEL_WIDTH = 340;

const EMPTY_EVENT_NODES: EventNode[] = [];
const EMPTY_KOL_NODES: KolNode[] = [];

function toIdMap<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

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
  onFilterChange,
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

  const eventNodes = eventData?.nodes ?? EMPTY_EVENT_NODES;
  const kolNodes = kolData?.nodes ?? EMPTY_KOL_NODES;

  const allEventTypes = useMemo<EventType[]>(() => [...new Set(eventNodes.map((node) => node.type))], [eventNodes]);
  const allTiers = useMemo<KolTier[]>(() => [...new Set(kolNodes.map((node) => node.tier))], [kolNodes]);
  const allPlatforms = useMemo<Platform[]>(() => [...new Set(kolNodes.map((node) => node.platform))], [kolNodes]);
  const graphFilters = useGraphFilters(allEventTypes, allTiers, allPlatforms);

  // Notify parent when filters change
  useEffect(() => {
    onFilterChangeRef.current?.(graphFilters.filters);
  }, [graphFilters.filters]);

  const statsHeight = mode === "kols" && showKolStats ? KOL_STATS_HEIGHT : 0;
  const topOffset = HEADER_HEIGHT + (showFilters ? FILTER_HEIGHT : 0) + statsHeight;
  const panelWidth = selection.panelOpen && showDetailPanel ? DETAIL_PANEL_WIDTH : 0;
  const svgWidth = Math.max(0, dims.w - panelWidth);
  const svgHeight = Math.max(0, dims.h - topOffset);

  const evGraph = useEventFlowGraph(eventData, svgWidth, svgHeight, graphFilters.filters, selection.hovered, layoutOverrides);
  const kolGraph = useKolFlowGraph(kolData, svgWidth, svgHeight, graphFilters.filters, selection.hovered, layoutOverrides);

  const currentGraph = mode === "events" ? evGraph : kolGraph;
  const timeSlots = mode === "events" ? (eventData?.timeSlots ?? []) : (kolData?.timeSlots ?? []);

  const graphWidth = svgWidth - currentGraph.layout.padding.left - currentGraph.layout.padding.right;
  const graphHeight = svgHeight - currentGraph.layout.padding.top - currentGraph.layout.padding.bottom;

  const eventById = useMemo(() => toIdMap(eventNodes), [eventNodes]);
  const kolById = useMemo(() => toIdMap(kolNodes), [kolNodes]);

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
    selection.setSelected(id);
    onNodeSelectRef.current?.(id, modeRef.current);
  }, [selection.setSelected]);

  const selectedEvent = mode === "events" && selection.selected ? eventById.get(selection.selected) ?? null : null;
  const selectedKol = mode === "kols" && selection.selected ? kolById.get(selection.selected) ?? null : null;
  const hoveredEvent = mode === "events" && selection.hovered && !selection.panelOpen ? eventById.get(selection.hovered) ?? null : null;
  const hoveredKol = mode === "kols" && selection.hovered && !selection.panelOpen ? kolById.get(selection.hovered) ?? null : null;
  const timeSlotLabels = useMemo(() => timeSlots.map((slot) => slot.label), [timeSlots]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width,
        height,
        background: theme.bg,
        fontFamily: "'JetBrains Mono','SF Mono',monospace",
        color: theme.text,
        overflow: "hidden",
        position: "relative",
        userSelect: "none",
        ...style,
      }}
    >
      <HeaderBar
        mode={mode}
        theme={theme}
        branding={branding}
        showModeSwitcher={showModeSwitcher}
        eventCount={evGraph.filtered.length}
        eventEdgeCount={evGraph.edges.length}
        kolCount={kolGraph.filtered.length}
        totalReach={kolGraph.stats.totalReach}
        zoom={panZoom.zoom}
        onModeChange={handleModeChange}
      />

      {showFilters && (
        <FilterBar
          mode={mode}
          top={HEADER_HEIGHT}
          panelOffset={panelWidth}
          theme={theme}
          allEventTypes={allEventTypes}
          allTiers={allTiers}
          allPlatforms={allPlatforms}
          activeEventTypes={graphFilters.filters.activeEventTypes}
          activeTiers={graphFilters.filters.activeTiers}
          activePlatforms={graphFilters.filters.activePlatforms}
          onResetEventTypes={graphFilters.resetEventTypes}
          onToggleEventType={graphFilters.toggleEventType}
          onToggleTier={graphFilters.toggleTier}
          onTogglePlatform={graphFilters.togglePlatform}
        />
      )}

      {mode === "kols" && showKolStats && (
        <KolStatsBar
          top={HEADER_HEIGHT + (showFilters ? FILTER_HEIGHT : 0)}
          height={statsHeight}
          panelOffset={panelWidth}
          theme={theme}
          stats={kolGraph.stats}
        />
      )}

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
        eventById={eventById}
        kolById={kolById}
        onHover={handleNodeHover}
        onSelect={handleNodeSelect}
      />

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

      {showDetailPanel && (
        <DetailPanel
          isOpen={selection.panelOpen}
          selectedEvent={selectedEvent}
          selectedKol={selectedKol}
          allEvents={eventNodes}
          allKols={kolNodes}
          timeSlotLabels={timeSlotLabels}
          theme={theme}
          onClose={selection.closePanel}
          onNavigate={handleNodeSelect}
        />
      )}

      <HoverTooltip event={hoveredEvent} kol={hoveredKol} theme={theme} />
    </div>
  );
};

export default EventGraph;
