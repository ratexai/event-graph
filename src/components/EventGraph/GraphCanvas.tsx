import React from "react";
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
  const isEdgeActive = (edge: EventEdge) => !!hoveredId && activeChain.has(edge.from) && activeChain.has(edge.to);

  const resolveColor = (nodeId: string) => {
    if (mode === "events") {
      const node = eventById.get(nodeId);
      return node ? getEventTypeStyle(theme, node.type).color : theme.muted;
    }

    const node = kolById.get(nodeId);
    return node ? getKolTierStyle(theme, node.tier).color : theme.muted;
  };

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
              label={mode === "kols" ? `Wave ${i + 1}` : slot.label}
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

          const widthByWeight = mode === "events"
            ? streamWidth(eventById.get(edge.to)?.weight ?? 0.5)
            : kolStreamWidth(kolById.get(edge.to)?.followers ?? 10000);
          const active = isEdgeActive(edge);

          return (
            <StreamPath
              key={`s-${i}`}
              index={i}
              from={from}
              to={to}
              width={widthByWeight}
              fromColor={resolveColor(edge.from)}
              toColor={resolveColor(edge.to)}
              isActive={active}
              isDimmed={!!hoveredId && !active}
            />
          );
        })}

        {mode === "events"
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
                  onHoverEnd={() => onHover(null)}
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
                  onHoverEnd={() => onHover(null)}
                  onSelect={onSelect}
                />
              );
            })}
      </g>
    </svg>
  );
}
