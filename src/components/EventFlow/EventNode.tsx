import React, { memo, useCallback } from "react";
import type { EventNode as EventNodeType, GraphTheme } from "../../types";
import { getEventTypeStyle, EVENT_TYPE_META } from "../../styles/theme";
import { nodeRadius, truncateLabel } from "../../utils";
import { NodeImage } from "../Shared/SvgPrimitives";

interface Props {
  event: EventNodeType;
  x: number;
  y: number;
  theme: GraphTheme;
  time: number;
  isHovered: boolean;
  isSelected: boolean;
  isDimmed: boolean;
  onHoverStart: (id: string) => void;
  onHoverEnd: () => void;
  onSelect: (id: string) => void;
}

export const EventNodeComponent = memo<Props>(({
  event, x, y, theme, time: _time, isHovered, isSelected, isDimmed,
  onHoverStart, onHoverEnd, onSelect,
}) => {
  const r = nodeRadius(event.weight);
  const style = getEventTypeStyle(theme, event.type);
  const meta = EVENT_TYPE_META[event.type];
  const isActive = isHovered || isSelected;
  const handleEnter = useCallback(() => onHoverStart(event.id), [event.id, onHoverStart]);
  const handleClick = useCallback(() => onSelect(event.id), [event.id, onSelect]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(event.id); }
  }, [event.id, onSelect]);

  const gradId = `eg-${event.id}`;

  return (
    <g className="nd" transform={`translate(${x},${y})`} style={{ cursor: "pointer", transition: "opacity 0.3s", outline: "none" }}
      role="button" aria-label={`${meta?.label || event.type} event: ${event.label}, impact ${event.impact}`}
      tabIndex={isDimmed ? -1 : 0} onKeyDown={handleKeyDown}
      opacity={isDimmed ? 0.15 : 1} onMouseEnter={handleEnter} onMouseLeave={onHoverEnd}
      onFocus={handleEnter} onBlur={onHoverEnd} onClick={handleClick}
      filter={isSelected ? "url(#glow)" : undefined}>

      {/* §12 BubbleNode radial gradient */}
      <defs>
        <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={style.color} stopOpacity={0.12} />
          <stop offset="60%" stopColor={style.color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={style.color} stopOpacity={0.65} />
        </radialGradient>
      </defs>

      {/* §12 Outer ring — always visible: dashed default, solid on select */}
      {!isDimmed && (
        <circle r={r + 5} fill="none" stroke={style.color} strokeWidth={isActive ? 1.5 : 1}
          opacity={isActive ? 0.5 : 0.25} strokeDasharray={isSelected ? "none" : "4,3"} />
      )}

      {/* Main circle — radial gradient fill, 2px stroke always */}
      <circle r={r} fill={`url(#${gradId})`} stroke={style.color}
        strokeWidth={2} strokeOpacity={isActive ? 0.85 : 0.6}
        style={{ transition: "stroke-opacity 0.3s" }} />

      {/* Avatar or label */}
      {event.imageUrl ? (
        <NodeImage href={event.imageUrl} radius={Math.max(r / 2.8, 10)} nodeId={event.id} borderColor={style.color} borderWidth={1} />
      ) : r > 24 ? (
        <text x={-r * 0.8} y={1} textAnchor="start" fontSize={Math.min(r / 4.5, 12)} fontWeight={500}
          fill={theme.text} fontFamily={theme.fontFamily}
          style={{ pointerEvents: "none" }}>{meta?.label || event.type}</text>
      ) : null}

      {/* Name label below — left-aligned */}
      {r > 18 && (() => {
        const lbl = truncateLabel(event.label, 14);
        const fs = Math.min(r / 4.5, 12);
        const ly = r + 12;
        return (
          <text x={-r} y={ly} textAnchor="start" fill={theme.text} fontSize={fs}
            fontWeight={500} fontFamily={theme.fontFamily}
            style={{ pointerEvents: "none" }}>{lbl}</text>
        );
      })()}

      {/* §15 Connection count badge — top-right */}
      {!isDimmed && event.from && event.from.length > 0 && r >= 20 && (
        <g transform={`translate(${r * 0.7},${-r * 0.7})`}>
          <circle r={7} fill={theme.accent} stroke={theme.bg} strokeWidth={1.5} />
          <text textAnchor="middle" y={3.5} fill="#ffffff" fontSize={8} fontWeight={700}
            fontFamily={theme.fontFamily} style={{ pointerEvents: "none" }}>
            {event.from.length}
          </text>
        </g>
      )}
    </g>
  );
});
EventNodeComponent.displayName = "EventNodeComponent";
