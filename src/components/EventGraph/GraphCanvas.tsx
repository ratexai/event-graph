import React, { useCallback, useMemo } from "react";
import type { EventEdge, EventNode, GraphTheme, KolNode, NarrativeNode, TimeSlot, ViewMode } from "../../types";
import { getEventTypeStyle, getKolTierStyle, getNarrativeCategoryStyle } from "../../styles/theme";
import { kolStreamWidth, streamWidth, narrativeStreamWidth, influenceStreamWidth, isAnchorNode, isScenarioNode, type ComputedPositions } from "../../utils";
import { EventNodeComponent } from "../EventFlow/EventNode";
import { KolNodeComponent } from "../KolFlow/KolNode";
import { NarrativeNodeComponent } from "../NarrativeFlow/NarrativeNode";
import { AnchorNodeComponent } from "../NarrativeFlow/AnchorNode";
import { ScenarioNodeComponent } from "../NarrativeFlow/ScenarioNode";
import { FlowArrow, GridColumn, StreamPath } from "../Shared/SvgPrimitives";

interface GraphCanvasProps {
  width: number;
  height: number;
  topOffset: number;
  mode: ViewMode;
  theme: GraphTheme;
  time: number;
  timeSlots: TimeSlot[];
  maxCol: number;
  graphWidth: number;
  graphHeight: number;
  layoutPadding: { left: number; right: number; top: number; bottom: number };
  panZoom: {
    isPanning: boolean;
    pan: { x: number; y: number };
    zoom: number;
    handlers: {
      onWheel: (e: React.WheelEvent) => void;
      onMouseDown: (e: React.MouseEvent) => void;
      onMouseMove: (e: React.MouseEvent) => void;
      onMouseUp: () => void;
      onMouseLeave: () => void;
      onTouchStart: (e: React.TouchEvent) => void;
      onTouchMove: (e: React.TouchEvent) => void;
      onTouchEnd: () => void;
    };
  };
  edges: EventEdge[];
  positions: ComputedPositions;
  activeChain: Set<string>;
  hoveredId: string | null;
  selectedId: string | null;
  eventNodes: EventNode[];
  kolNodes: KolNode[];
  narrativeNodes?: NarrativeNode[];
  eventById: Map<string, EventNode>;
  kolById: Map<string, KolNode>;
  narrativeById?: Map<string, NarrativeNode>;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onBackgroundClick?: () => void;
  /** Set of node IDs that are causally linked to the focused prediction */
  predictionFocusIds?: Set<string> | null;
}

export function GraphCanvas({
  width,
  height,
  topOffset,
  mode,
  theme,
  time,
  timeSlots,
  maxCol,
  graphWidth,
  graphHeight,
  layoutPadding,
  panZoom,
  edges,
  positions,
  activeChain,
  hoveredId,
  selectedId,
  eventNodes,
  kolNodes,
  narrativeNodes = [],
  eventById,
  kolById,
  narrativeById,
  onHover,
  onSelect,
  onBackgroundClick,
  predictionFocusIds,
}: GraphCanvasProps) {
  const isEventsMode = mode === "events";
  const isNarrativeMode = mode === "narratives";
  const hasPredictionFocus = !!predictionFocusIds && predictionFocusIds.size > 0;

  const handleHoverEnd = useCallback(() => onHover(null), [onHover]);

  /** Determine if a node should be dimmed — combines hover chain + prediction focus */
  const isNodeDimmed = useCallback((nodeId: string): boolean => {
    // Hover dimming takes priority
    if (hoveredId) return !activeChain.has(nodeId);
    // Prediction focus dimming
    if (hasPredictionFocus) return !predictionFocusIds!.has(nodeId);
    return false;
  }, [hoveredId, activeChain, hasPredictionFocus, predictionFocusIds]);

  /** Determine if an edge should be dimmed */
  const isEdgeDimmed = useCallback((fromId: string, toId: string): boolean => {
    if (hoveredId) return !(activeChain.has(fromId) && activeChain.has(toId));
    if (hasPredictionFocus) return !(predictionFocusIds!.has(fromId) && predictionFocusIds!.has(toId));
    return false;
  }, [hoveredId, activeChain, hasPredictionFocus, predictionFocusIds]);

  /** Determine if an edge is active (highlighted) */
  const isEdgeActive = useCallback((fromId: string, toId: string): boolean => {
    if (hoveredId) return activeChain.has(fromId) && activeChain.has(toId);
    if (hasPredictionFocus) return predictionFocusIds!.has(fromId) && predictionFocusIds!.has(toId);
    return false;
  }, [hoveredId, activeChain, hasPredictionFocus, predictionFocusIds]);

  const colorResolver = useMemo(() => {
    if (isEventsMode) {
      return (nodeId: string) => {
        const node = eventById.get(nodeId);
        return node ? getEventTypeStyle(theme, node.type).color : theme.muted;
      };
    }
    if (isNarrativeMode) {
      return (nodeId: string) => {
        const node = narrativeById?.get(nodeId);
        return node ? getNarrativeCategoryStyle(theme, node.category).color : theme.muted;
      };
    }
    return (nodeId: string) => {
      const node = kolById.get(nodeId);
      return node ? getKolTierStyle(theme, node.tier).color : theme.muted;
    };
  }, [eventById, isEventsMode, isNarrativeMode, kolById, narrativeById, theme]);

  const streamWidthResolver = useMemo(() => {
    if (isEventsMode) {
      return (edge: EventEdge) => streamWidth(eventById.get(edge.to)?.weight ?? 0.5);
    }
    if (isNarrativeMode) {
      return (edge: EventEdge) => {
        // Influence edges: width proportional to |influence|
        if (edge.influence != null && edge.influence !== 0) {
          return influenceStreamWidth(edge.influence);
        }
        const n = narrativeById?.get(edge.to);
        return narrativeStreamWidth(n?.weight ?? 0.5, n?.oddsDelta ?? 0);
      };
    }
    return (edge: EventEdge) => kolStreamWidth(kolById.get(edge.to)?.followers ?? 10000);
  }, [eventById, isEventsMode, isNarrativeMode, kolById, narrativeById]);

  // Connection counts per node (incoming + outgoing edges)
  const connectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const edge of edges) {
      counts.set(edge.from, (counts.get(edge.from) || 0) + 1);
      counts.set(edge.to, (counts.get(edge.to) || 0) + 1);
    }
    return counts;
  }, [edges]);

  // Split narrative nodes into facts, anchors, scenarios
  const { factNodes, anchorNodes, scenarioNodeList } = useMemo(() => {
    if (!isNarrativeMode) return { factNodes: [] as NarrativeNode[], anchorNodes: [] as NarrativeNode[], scenarioNodeList: [] as NarrativeNode[] };
    const facts: NarrativeNode[] = [];
    const anchors: NarrativeNode[] = [];
    const scenarios: NarrativeNode[] = [];
    for (const node of narrativeNodes) {
      if (isAnchorNode(node)) anchors.push(node);
      else if (isScenarioNode(node)) scenarios.push(node);
      else facts.push(node);
    }
    return { factNodes: facts, anchorNodes: anchors, scenarioNodeList: scenarios };
  }, [isNarrativeMode, narrativeNodes]);

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={`${isEventsMode ? "Event flow" : isNarrativeMode ? "Narrative flow" : "KOL influence"} graph visualization`}
      style={{ marginTop: topOffset, cursor: panZoom.isPanning ? "grabbing" : "grab", touchAction: "none" }}
      {...panZoom.handlers}
    >
      <defs>
        <pattern id="dotgrid" width="30" height="30" patternUnits="userSpaceOnUse">
          <circle cx="15" cy="15" r="0.5" fill={theme.muted} opacity="0.12" />
        </pattern>
        {/* §16 BubbleMap glow filter for selected nodes */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#dotgrid)" onClick={onBackgroundClick} />
      <g transform={`translate(${panZoom.pan.x},${panZoom.pan.y}) scale(${panZoom.zoom})`}>
        {timeSlots.map((slot, i) => {
          if (i > maxCol) return null;
          const MIN_COL_PX = 115;
          const effectiveWidth = Math.max(graphWidth, maxCol * MIN_COL_PX);
          const x = layoutPadding.left + (effectiveWidth / maxCol) * i;
          const slotIsFuture = isNarrativeMode && (
            slot.label.includes("(fut)") || slot.label.includes("(prog)") ||
            slot.type === "near_future"
          );
          const slotIsAnchorDate = isNarrativeMode && slot.type === "anchor_date";
          return (
            <GridColumn
              key={`${slot.label}-${i}`}
              x={x}
              topY={layoutPadding.top}
              bottomY={layoutPadding.top + graphHeight}
              label={isEventsMode ? slot.label : isNarrativeMode ? slot.label : `Wave ${i + 1}`}
              theme={theme}
              isFuture={slotIsFuture}
              isAnchorDate={slotIsAnchorDate}
            />
          );
        })}

        <FlowArrow
          startX={layoutPadding.left - 20}
          endX={layoutPadding.left + graphWidth + 30}
          centerY={layoutPadding.top + graphHeight / 2}
          theme={theme}
        />

        {edges.map((edge, i) => {
          const from = positions[edge.from];
          const to = positions[edge.to];
          if (!from || !to) return null;

          const active = isEdgeActive(edge.from, edge.to);
          const toNode = isNarrativeMode ? narrativeById?.get(edge.to) : null;
          const fromNode = isNarrativeMode ? narrativeById?.get(edge.from) : null;
          const edgeIsFuture = isNarrativeMode && (toNode?.temporal === "future" || fromNode?.temporal === "future");
          const edgeIsInfluence = edge.type === "influence" && edge.influence != null;
          const edgeToAnchor = isNarrativeMode && toNode && isAnchorNode(toNode);
          const edgeToScenario = isNarrativeMode && toNode && isScenarioNode(toNode);

          return (
            <StreamPath
              key={`s-${edge.from}-${edge.to}-${i}`}
              index={i}
              from={from}
              to={to}
              width={streamWidthResolver(edge)}
              fromColor={edgeToAnchor ? colorResolver(edge.from) : edgeIsFuture ? theme.complement : colorResolver(edge.from)}
              toColor={edgeToAnchor ? theme.complement : edgeIsFuture ? theme.complement : colorResolver(edge.to)}
              isActive={active}
              isDimmed={isEdgeDimmed(edge.from, edge.to)}
              isFuture={edgeIsFuture && !edgeIsInfluence && !edgeToScenario}
              influence={edgeIsInfluence ? edge.influence : undefined}
              mechanism={edgeIsInfluence ? edge.mechanism : undefined}
              isScenarioEdge={!!edgeToScenario}
              scenarioOutcome={edgeToScenario ? toNode?.outcome : undefined}
            />
          );
        })}

        {isEventsMode
          ? eventNodes.map((eventNode) => {
              const pos = positions[eventNode.id];
              if (!pos) return null;
              return (
                <EventNodeComponent
                  key={eventNode.id}
                  event={eventNode}
                  x={pos.x}
                  y={pos.y}
                  theme={theme}
                  time={time}
                  connectionCount={connectionCounts.get(eventNode.id) || 0}
                  isHovered={hoveredId === eventNode.id}
                  isSelected={selectedId === eventNode.id}
                  isDimmed={isNodeDimmed(eventNode.id)}
                  onHoverStart={onHover}
                  onHoverEnd={handleHoverEnd}
                  onSelect={onSelect}
                />
              );
            })
          : isNarrativeMode
            ? (
              <>
                {/* Layer 1: Fact nodes (standard narrative nodes) */}
                {factNodes.map((narNode) => {
                  const pos = positions[narNode.id];
                  if (!pos) return null;
                  return (
                    <NarrativeNodeComponent
                      key={narNode.id}
                      node={narNode}
                      x={pos.x}
                      y={pos.y}
                      theme={theme}
                      time={time}
                      connectionCount={connectionCounts.get(narNode.id) || 0}
                      isHovered={hoveredId === narNode.id}
                      isSelected={selectedId === narNode.id}
                      isDimmed={isNodeDimmed(narNode.id)}
                      onHoverStart={onHover}
                      onHoverEnd={handleHoverEnd}
                      onSelect={onSelect}
                    />
                  );
                })}
                {/* Layer 2: Anchor nodes (Polymarket future endpoints) */}
                {anchorNodes.map((anchor) => {
                  const pos = positions[anchor.id];
                  if (!pos) return null;
                  return (
                    <AnchorNodeComponent
                      key={anchor.id}
                      node={anchor}
                      x={pos.x}
                      y={pos.y}
                      theme={theme}
                      time={time}
                      isHovered={hoveredId === anchor.id}
                      isSelected={selectedId === anchor.id}
                      isDimmed={isNodeDimmed(anchor.id)}
                      onHoverStart={onHover}
                      onHoverEnd={handleHoverEnd}
                      onSelect={onSelect}
                    />
                  );
                })}
                {/* Layer 3: Scenario nodes (YES/NO branches) */}
                {scenarioNodeList.map((sc) => {
                  const pos = positions[sc.id];
                  if (!pos) return null;
                  return (
                    <ScenarioNodeComponent
                      key={sc.id}
                      node={sc}
                      x={pos.x}
                      y={pos.y}
                      theme={theme}
                      time={time}
                      isHovered={hoveredId === sc.id}
                      isSelected={selectedId === sc.id}
                      isDimmed={isNodeDimmed(sc.id)}
                      onHoverStart={onHover}
                      onHoverEnd={handleHoverEnd}
                      onSelect={onSelect}
                    />
                  );
                })}
              </>
            )
            : kolNodes.map((kolNode) => {
                const pos = positions[kolNode.id];
                if (!pos) return null;
                return (
                  <KolNodeComponent
                    key={kolNode.id}
                    kol={kolNode}
                    x={pos.x}
                    y={pos.y}
                    theme={theme}
                    time={time}
                    isHovered={hoveredId === kolNode.id}
                    isSelected={selectedId === kolNode.id}
                    isDimmed={isNodeDimmed(kolNode.id)}
                    onHoverStart={onHover}
                    onHoverEnd={handleHoverEnd}
                    onSelect={onSelect}
                  />
                );
              })}
      </g>
    </svg>
  );
}
