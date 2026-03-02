import React, { useCallback, useMemo } from "react";
import type { EventEdge, EventNode, GraphTheme, KolNode, TimeSlot, ViewMode } from "../../types";
import { getEventTypeStyle, getKolTierStyle } from "../../styles/theme";
import { kolStreamWidth, streamWidth, type ComputedPositions } from "../../utils";
import { EventNodeComponent } from "../EventFlow/EventNode";
import { KolNodeComponent } from "../KolFlow/KolNode";
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
    };
  };
  edges: EventEdge[];
  positions: ComputedPositions;
  activeChain: Set<string>;
  hoveredId: string | null;
  selectedId: string | null;
  eventNodes: EventNode[];
  kolNodes: KolNode[];
  eventById: Map<string, EventNode>;
  kolById: Map<string, KolNode>;
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
  eventById,
  kolById,
  onHover,
  onSelect,
}: GraphCanvasProps) {
  const isEventsMode = mode === "events";

  const handleHoverEnd = useCallback(() => onHover(null), [onHover]);

  const colorResolver = useMemo(() => {
    if (isEventsMode) {
      return (nodeId: string) => {
        const node = eventById.get(nodeId);
        return node ? getEventTypeStyle(theme, node.type).color : theme.muted;
      };
    }

    return (nodeId: string) => {
      const node = kolById.get(nodeId);
      return node ? getKolTierStyle(theme, node.tier).color : theme.muted;
    };
  }, [eventById, isEventsMode, kolById, theme]);

  const streamWidthResolver = useMemo(() => {
    if (isEventsMode) {
      return (toId: string) => streamWidth(eventById.get(toId)?.weight ?? 0.5);
    }
    return (toId: string) => kolStreamWidth(kolById.get(toId)?.followers ?? 10000);
  }, [eventById, isEventsMode, kolById]);

  return (
    <svg
      width={width}
      height={height}
      style={{ marginTop: topOffset, cursor: panZoom.isPanning ? "grabbing" : "grab" }}
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
          return (
            <GridColumn
              key={`${slot.label}-${i}`}
              x={x}
              topY={layoutPadding.top}
              bottomY={layoutPadding.top + graphHeight}
              label={isEventsMode ? slot.label : `Wave ${i + 1}`}
              theme={theme}
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

          return (
            <StreamPath
              key={`s-${edge.from}-${edge.to}-${i}`}
              index={i}
              from={from}
              to={to}
              width={streamWidthResolver(edge.to)}
              fromColor={colorResolver(edge.from)}
              toColor={colorResolver(edge.to)}
              isActive={active}
              isDimmed={!!hoveredId && !active}
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
