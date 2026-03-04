import React, { memo, useCallback } from "react";
import type { EventNode as EventNodeType, GraphTheme } from "../../types";
import { getEventTypeStyle, EVENT_TYPE_META } from "../../styles/theme";
import { nodeRadius, truncateLabel } from "../../utils";
import { GlowRings, SentimentRing, ImpactRing } from "../Shared/SvgPrimitives";

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
  event, x, y, theme, time, isHovered, isSelected, isDimmed,
  onHoverStart, onHoverEnd, onSelect,
}) => {
  const r = nodeRadius(event.weight);
  const style = getEventTypeStyle(theme, event.type);
  const meta = EVENT_TYPE_META[event.type];
  const handleEnter = useCallback(() => onHoverStart(event.id), [event.id, onHoverStart]);
  const handleClick = useCallback(() => onSelect(event.id), [event.id, onSelect]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(event.id); }
  }, [event.id, onSelect]);

  return (
    <g className="nd" transform={`translate(${x},${y})`} style={{ cursor: "pointer", transition: "opacity 0.3s" }}
      role="button" aria-label={`${meta?.label || event.type} event: ${event.label}, impact ${event.impact}`}
      tabIndex={isDimmed ? -1 : 0} onKeyDown={handleKeyDown}
      opacity={isDimmed ? 0.08 : 1} onMouseEnter={handleEnter} onMouseLeave={onHoverEnd}
      onFocus={handleEnter} onBlur={onHoverEnd} onClick={handleClick}>
      <GlowRings radius={r} color={style.color} time={time} isActive={isHovered || isSelected} />
      <SentimentRing radius={r + 3} sentiment={event.sentiment} theme={theme} isDimmed={isDimmed} />
      <ImpactRing radius={r} impact={event.impact} color={style.color} />
      <circle r={r} fill={style.bg} stroke={style.color} strokeWidth={isHovered || isSelected ? 2.5 : 1.2} />
      <text y={-3} textAnchor="middle" fontSize={r > 24 ? 16 : 13} style={{ pointerEvents: "none" }}>{meta?.icon || "●"}</text>
      <text y={r > 24 ? 14 : 11} textAnchor="middle" fill={theme.text} fontSize={Math.max(7.5, r * 0.32)}
        fontWeight={600} fontFamily={theme.monoFontFamily} style={{ pointerEvents: "none" }}>{truncateLabel(event.label)}</text>
      {event.extra && !isDimmed && (
        <g transform={`translate(${r * 0.7},${-r * 0.7})`}>
          <rect x={-2} y={-8} width={event.extra.length * 5.5 + 8} height={14} rx={7} fill={theme.bgAlt} stroke={style.color} strokeWidth={0.8} />
          <text x={event.extra.length * 2.75 + 2} y={2} textAnchor="middle" fill={style.color} fontSize={7}
            fontFamily={theme.monoFontFamily} fontWeight={600} style={{ pointerEvents: "none" }}>{event.extra}</text>
        </g>
      )}
    </g>
  );
});
EventNodeComponent.displayName = "EventNodeComponent";
