import React, { memo, useCallback } from "react";
import type { NarrativeNode as NarrativeNodeType, GraphTheme } from "../../types";
import { getNarrativeCategoryStyle, getNarrativeSignalStyle, NARRATIVE_CATEGORY_META, NARRATIVE_SIGNAL_META } from "../../styles/theme";
import { narrativeNodeRadius, truncateLabel } from "../../utils";
import { GlowRings, SentimentRing, ImpactRing } from "../Shared/SvgPrimitives";

interface Props {
  node: NarrativeNodeType;
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

export const NarrativeNodeComponent = memo<Props>(({
  node, x, y, theme, time, isHovered, isSelected, isDimmed,
  onHoverStart, onHoverEnd, onSelect,
}) => {
  const r = narrativeNodeRadius(node.weight, node.oddsDelta);
  const catStyle = getNarrativeCategoryStyle(theme, node.category);
  const sigStyle = getNarrativeSignalStyle(theme, node.signal);
  const catMeta = NARRATIVE_CATEGORY_META[node.category];
  const sigMeta = NARRATIVE_SIGNAL_META[node.signal];
  const handleEnter = useCallback(() => onHoverStart(node.id), [node.id, onHoverStart]);
  const handleClick = useCallback(() => onSelect(node.id), [node.id, onSelect]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(node.id); }
  }, [node.id, onSelect]);

  // Format odds delta as badge text
  const deltaText = node.oddsDelta > 0 ? `+${node.oddsDelta.toFixed(1)}pp` : node.oddsDelta < 0 ? `${node.oddsDelta.toFixed(1)}pp` : "";
  const deltaColor = node.oddsDelta > 0 ? theme.positive : node.oddsDelta < 0 ? theme.negative : theme.neutral;

  return (
    <g className="nd" transform={`translate(${x},${y})`} style={{ cursor: "pointer", transition: "opacity 0.3s" }}
      role="button" aria-label={`${catMeta?.label || node.category} narrative: ${node.label}, ${sigMeta?.label || node.signal}, odds delta ${node.oddsDelta}`}
      tabIndex={isDimmed ? -1 : 0} onKeyDown={handleKeyDown}
      opacity={isDimmed ? 0.08 : 1} onMouseEnter={handleEnter} onMouseLeave={onHoverEnd}
      onFocus={handleEnter} onBlur={onHoverEnd} onClick={handleClick}>
      <GlowRings radius={r} color={catStyle.color} time={time} isActive={isHovered || isSelected} />
      <SentimentRing radius={r + 3} sentiment={node.sentiment} theme={theme} isDimmed={isDimmed} />
      <ImpactRing radius={r} impact={node.weight * 100} color={catStyle.color} />
      {/* Momentum ring — dashed for deceleration, solid for acceleration */}
      <circle r={r + 7} fill="none" stroke={sigStyle.color} strokeWidth={1}
        opacity={isDimmed ? 0.05 : 0.3}
        strokeDasharray={node.momentum < 0 ? "3 4" : "none"}
        strokeLinecap="round" />
      {/* Main circle */}
      <circle r={r} fill={catStyle.bg} stroke={catStyle.color} strokeWidth={isHovered || isSelected ? 2.5 : 1.2} />
      {/* Category icon */}
      <text y={-3} textAnchor="middle" fontSize={r > 24 ? 16 : 13} style={{ pointerEvents: "none" }}>
        {catMeta?.icon || "●"}
      </text>
      {/* Label */}
      <text y={r > 24 ? 14 : 11} textAnchor="middle" fill={theme.text} fontSize={Math.max(7.5, r * 0.32)}
        fontWeight={600} fontFamily="'JetBrains Mono',monospace" style={{ pointerEvents: "none" }}>
        {truncateLabel(node.label)}
      </text>
      {/* Signal badge (top-left) */}
      <g transform={`translate(${-r * 0.75},${-r * 0.75})`}>
        <circle r={9} fill={sigStyle.bg} stroke={sigStyle.color} strokeWidth={0.8} />
        <text textAnchor="middle" y={3.5} fill={sigStyle.color} fontSize={9}
          style={{ pointerEvents: "none" }}>{sigMeta?.icon || "●"}</text>
      </g>
      {/* Odds delta badge (top-right) */}
      {deltaText && !isDimmed && (
        <g transform={`translate(${r * 0.7},${-r * 0.7})`}>
          <rect x={-2} y={-8} width={deltaText.length * 5.5 + 8} height={14} rx={7} fill={theme.bgAlt} stroke={deltaColor} strokeWidth={0.8} />
          <text x={deltaText.length * 2.75 + 2} y={2} textAnchor="middle" fill={deltaColor} fontSize={7}
            fontFamily="'JetBrains Mono',monospace" fontWeight={600} style={{ pointerEvents: "none" }}>{deltaText}</text>
        </g>
      )}
      {/* Market probability below node */}
      {!isDimmed && node.marketProb != null && (
        <g transform={`translate(0,${r + 14})`}>
          <text textAnchor="middle" fill={theme.muted} fontSize={8} fontFamily="'JetBrains Mono',monospace"
            style={{ pointerEvents: "none" }}>{node.marketProb.toFixed(0)}% prob</text>
        </g>
      )}
    </g>
  );
});
NarrativeNodeComponent.displayName = "NarrativeNodeComponent";
