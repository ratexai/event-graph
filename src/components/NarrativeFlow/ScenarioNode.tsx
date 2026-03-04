/* ═══════════════════════════════════════════════════════════════
   ScenarioNode — YES/NO branch from a Polymarket Anchor
   Dashed border, semi-transparent fill, outcome badge,
   conditions preview on hover
   ═══════════════════════════════════════════════════════════════ */

import React, { memo, useCallback, useMemo } from "react";
import type { NarrativeNode as NarrativeNodeType, GraphTheme } from "../../types";
import { narrativeNodeRadius, wrapLabel } from "../../utils";
import { getNarrativeCategoryStyle } from "../../styles/theme";

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

export const ScenarioNodeComponent = memo<Props>(({
  node, x, y, theme, time, isHovered, isSelected, isDimmed,
  onHoverStart, onHoverEnd, onSelect,
}) => {
  const r = narrativeNodeRadius(node.weight, node.oddsDelta);
  const catStyle = getNarrativeCategoryStyle(theme, node.category);
  const handleEnter = useCallback(() => onHoverStart(node.id), [node.id, onHoverStart]);
  const handleClick = useCallback(() => onSelect(node.id), [node.id, onSelect]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(node.id); }
  }, [node.id, onSelect]);

  const isYes = node.outcome === "YES" || node.outcome === "PARTIAL";
  const outcomeColor = isYes ? theme.positive : theme.negative;
  const outcomeBg = isYes ? theme.positiveDim : theme.negativeDim;
  const outcomeIcon = isYes ? "✓" : "✗";
  const probText = node.outcomeProbability != null ? `${node.outcomeProbability}%` : "";

  const lines = useMemo(() => wrapLabel(node.label, 18), [node.label]);
  const labelFontSize = Math.max(7, Math.min(9, r * 0.36));

  return (
    <g className="scenario-nd" transform={`translate(${x},${y})`}
      style={{ cursor: "pointer", transition: "opacity 0.3s" }}
      role="button" aria-label={`Scenario ${node.outcome}: ${node.label}`}
      tabIndex={isDimmed ? -1 : 0} onKeyDown={handleKeyDown}
      opacity={isDimmed ? 0.08 : 1} onMouseEnter={handleEnter} onMouseLeave={onHoverEnd}
      onFocus={handleEnter} onBlur={onHoverEnd} onClick={handleClick}>

      {/* Outer dashed ring */}
      <circle r={r + 4} fill="none" stroke={outcomeColor} strokeWidth={0.8}
        strokeDasharray="4 5" opacity={isDimmed ? 0.05 : 0.25} />

      {/* Main shape — dashed border, semi-transparent fill */}
      <circle r={r} fill={outcomeBg}
        stroke={outcomeColor} strokeWidth={isHovered || isSelected ? 2 : 1.2}
        strokeDasharray="5 3" />

      {/* Outcome badge (top-left) — YES or NO */}
      <g transform={`translate(${-r * 0.8},${-r * 0.8})`}>
        <rect x={-10} y={-7} width={20 + (probText.length * 4)} height={14} rx={7}
          fill={outcomeBg} stroke={outcomeColor} strokeWidth={0.6} />
        <text textAnchor="middle" x={(probText.length * 4) / 2} y={2.5}
          fill={outcomeColor} fontSize={7} fontWeight={800}
          fontFamily={theme.monoFontFamily} style={{ pointerEvents: "none" }}>
          {outcomeIcon} {node.outcome} {probText}
        </text>
      </g>

      {/* "prog" badge (top-right) */}
      <g transform={`translate(${r * 0.6},${-r * 0.85})`}>
        <rect x={-2} y={-6} width={22} height={12} rx={6}
          fill={theme.complementDim} stroke={theme.complement} strokeWidth={0.4} />
        <text x={9} y={1.5} textAnchor="middle" fill={theme.complementUp} fontSize={5.5} fontWeight={700}
          fontFamily={theme.monoFontFamily} style={{ pointerEvents: "none" }}>
          prog
        </text>
      </g>

      {/* Label with background plate */}
      {lines.map((line, i) => {
        const baseY = -labelFontSize * 0.3 + i * (labelFontSize + 1.5);
        const tw = line.length * labelFontSize * 0.58 + 6;
        return (
          <g key={i}>
            <rect x={-tw / 2} y={baseY - labelFontSize * 0.75} width={tw} height={labelFontSize + 3}
              rx={3} fill={theme.bg} opacity={0.75} />
            <text y={baseY}
              textAnchor="middle" fill={theme.text}
              fontSize={labelFontSize} fontWeight={isHovered ? 700 : 600}
              fontFamily={theme.monoFontFamily}
              style={{ pointerEvents: "none" }}>
              {line}
            </text>
          </g>
        );
      })}

      {/* Conditions preview (on hover, below node) */}
      {(isHovered || isSelected) && node.conditions && node.conditions.length > 0 && (
        <g transform={`translate(0,${r + 10})`}>
          {node.conditions.slice(0, 3).map((cond, i) => (
            <text key={i} y={i * 9} textAnchor="middle" fill={theme.textSecondary}
              fontSize={6} fontFamily={theme.monoFontFamily}
              style={{ pointerEvents: "none" }}>
              • {cond.length > 35 ? cond.slice(0, 33) + "…" : cond}
            </text>
          ))}
        </g>
      )}

      {/* Cui Bono micro-indicator */}
      {!isDimmed && node.cuiBono && (
        <g transform={`translate(${r * 0.7},${r * 0.6})`}>
          <circle r={4} fill={theme.warningDim} stroke={theme.warning} strokeWidth={0.4} />
          <text textAnchor="middle" y={2.5} fontSize={7} style={{ pointerEvents: "none" }}>🕵️</text>
        </g>
      )}
    </g>
  );
});
ScenarioNodeComponent.displayName = "ScenarioNodeComponent";
