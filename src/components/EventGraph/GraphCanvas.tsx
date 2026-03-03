import React, { useCallback, useMemo } from "react";
import type { EventEdge, EventNode, GraphTheme, KolNode, NarrativeNode, TimeSlot, ViewMode } from "../../types";
import { getEventTypeStyle, getKolTierStyle, getNarrativeCategoryStyle } from "../../styles/theme";
import { kolStreamWidth, streamWidth, narrativeStreamWidth, type ComputedPositions } from "../../utils";
import { EventNodeComponent } from "../EventFlow/EventNode";
import { KolNodeComponent } from "../KolFlow/KolNode";
import { NarrativeNodeComponent } from "../NarrativeFlow/NarrativeNode";
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
}: GraphCanvasProps) {
  const isEventsMode = mode === "events";
  const isNarrativeMode = mode === "narratives";

  const handleHoverEnd = useCallback(() => onHover(null), [onHover]);

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
      return (toId: string) => streamWidth(eventById.get(toId)?.weight ?? 0.5);
    }
    if (isNarrativeMode) {
      return (toId: string) => {
        const n = narrativeById?.get(toId);
        return narrativeStreamWidth(n?.weight ?? 0.5, n?.oddsDelta ?? 0);
      };
    }
    return (toId: string) => kolStreamWidth(kolById.get(toId)?.followers ?? 10000);
  }, [eventById, isEventsMode, isNarrativeMode, kolById, narrativeById]);

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
      </defs>
      <rect width="100%" height="100%" fill="url(#dotgrid)" />
      <g transform={`translate(${panZoom.pan.x},${panZoom.pan.y}) scale(${panZoom.zoom})`}>
        {timeSlots.map((slot, i) => {
          if (i > maxCol) return null;
          const x = layoutPadding.left + (graphWidth / maxCol) * i;
          const slotIsFuture = isNarrativeMode && (slot.label.includes("(fut)") || slot.label.includes("(prog)"));
          return (
            <GridColumn
              key={`${slot.label}-${i}`}
              x={x}
              topY={layoutPadding.top}
              bottomY={layoutPadding.top + graphHeight}
              label={isEventsMode ? slot.label : isNarrativeMode ? slot.label : `Wave ${i + 1}`}
              theme={theme}
              isFuture={slotIsFuture}
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

          const active = !!hoveredId && activeChain.has(edge.from) && activeChain.has(edge.to);
          const toNode = isNarrativeMode ? narrativeById?.get(edge.to) : null;
          const fromNode = isNarrativeMode ? narrativeById?.get(edge.from) : null;
          const edgeIsFuture = isNarrativeMode && (toNode?.temporal === "future" || fromNode?.temporal === "future");

          return (
            <StreamPath
              key={`s-${edge.from}-${edge.to}-${i}`}
              index={i}
              from={from}
              to={to}
              width={streamWidthResolver(edge.to)}
              fromColor={edgeIsFuture ? "#6366f1" : colorResolver(edge.from)}
              toColor={edgeIsFuture ? "#6366f1" : colorResolver(edge.to)}
              isActive={active}
              isDimmed={!!hoveredId && !active}
              isFuture={edgeIsFuture}
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
                  isHovered={hoveredId === eventNode.id}
                  isSelected={selectedId === eventNode.id}
                  isDimmed={!!hoveredId && !activeChain.has(eventNode.id)}
                  onHoverStart={onHover}
                  onHoverEnd={handleHoverEnd}
                  onSelect={onSelect}
                />
              );
            })
          : isNarrativeMode
            ? narrativeNodes.map((narNode) => {
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
                    isHovered={hoveredId === narNode.id}
                    isSelected={selectedId === narNode.id}
                    isDimmed={!!hoveredId && !activeChain.has(narNode.id)}
                    onHoverStart={onHover}
                    onHoverEnd={handleHoverEnd}
                    onSelect={onSelect}
                  />
                );
              })
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
                    isDimmed={!!hoveredId && !activeChain.has(kolNode.id)}
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
