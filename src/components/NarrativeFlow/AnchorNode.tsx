/* ═══════════════════════════════════════════════════════════════
   AnchorNode — Polymarket Future Endpoint
   Large pulsing purple node with double ring, prob inside,
   probHistory sparkline, expiry date badge
   ═══════════════════════════════════════════════════════════════ */

import React, { memo, useCallback, useMemo } from "react";
import type { NarrativeNode as NarrativeNodeType, GraphTheme } from "../../types";
import { ANCHOR_NODE_RADIUS, wrapLabel } from "../../utils";

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

// Polymarket complement color constants (from theme.complement family)
const COMPLEMENT = "#901dea";
const COMPLEMENT_DIM = "rgba(144,29,234,0.15)";
const COMPLEMENT_GLOW = "rgba(144,29,234,0.25)";

/** Mini sparkline for probHistory inside the anchor node */
const MiniSparkline = memo<{ data: number[]; width: number; height: number }>(
  ({ data, width, height }) => {
    if (!data.length) return null;
    const max = Math.max(...data, 100);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const pts = data.map((v, i) =>
      `${(i / Math.max(data.length - 1, 1)) * width},${height - ((v - min) / range) * height}`,
    ).join(" ");
    return (
      <g>
        <polyline points={pts} fill="none" stroke={COMPLEMENT} strokeWidth={1.2}
          strokeLinecap="round" opacity={0.7} />
        {/* Endpoint dot */}
        {data.length > 0 && (() => {
          const lastX = width;
          const lastY = height - ((data[data.length - 1] - min) / range) * height;
          return <circle cx={lastX} cy={lastY} r={2} fill={COMPLEMENT} opacity={0.9} />;
        })()}
      </g>
    );
  },
);
MiniSparkline.displayName = "MiniSparkline";

export const AnchorNodeComponent = memo<Props>(({
  node, x, y, theme, time, isHovered, isSelected, isDimmed,
  onHoverStart, onHoverEnd, onSelect,
}) => {
  const r = ANCHOR_NODE_RADIUS;
  const handleEnter = useCallback(() => onHoverStart(node.id), [node.id, onHoverStart]);
  const handleClick = useCallback(() => onSelect(node.id), [node.id, onSelect]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(node.id); }
  }, [node.id, onSelect]);

  const lines = useMemo(() => wrapLabel(node.label, 22), [node.label]);
  const pmProb = node.marketProb;
  const rxProb = node.rateXProb;
  const alpha = node.alpha ?? (rxProb != null && pmProb != null ? rxProb - pmProb : undefined);
  const probText = pmProb != null ? `${pmProb}%` : "—";
  const rxText = rxProb != null ? `${rxProb}%` : null;
  const expiryLabel = node.resolvesAt
    ? new Date(node.resolvesAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";

  // Alpha badge styling
  const alphaInfo = useMemo(() => {
    if (alpha == null || alpha === 0) return null;
    const abs = Math.abs(alpha);
    let color = "#888";
    let icon = "≈";
    if (abs > 10) { color = alpha > 0 ? "#30fd82" : "#ff495f"; icon = alpha > 0 ? "▲▲" : "▼▼"; }
    else if (abs > 5) { color = alpha > 0 ? "#30fd82" : "#ff495f"; icon = alpha > 0 ? "▲" : "▼"; }
    else if (abs > 2) { color = "#ff9f44"; icon = alpha > 0 ? "△" : "▽"; }
    return { color, icon, text: `${alpha > 0 ? "+" : ""}${alpha}pp` };
  }, [alpha]);

  // Aggregated influence bar data
  const influenceData = useMemo(() => {
    if (!node.influenceLinks?.length) return null;
    let posTotal = 0;
    let negTotal = 0;
    for (const link of node.influenceLinks) {
      if (link.influence > 0) posTotal += link.influence;
      else negTotal += Math.abs(link.influence);
    }
    return { posTotal, negTotal, total: posTotal + negTotal };
  }, [node.influenceLinks]);

  return (
    <g className="anchor-nd" transform={`translate(${x},${y})`}
      style={{ cursor: "pointer", transition: "opacity 0.3s" }}
      role="button" aria-label={`Polymarket anchor: ${node.label}, ${probText}`}
      tabIndex={isDimmed ? -1 : 0} onKeyDown={handleKeyDown}
      opacity={isDimmed ? 0.08 : 1} onMouseEnter={handleEnter} onMouseLeave={onHoverEnd}
      onFocus={handleEnter} onBlur={onHoverEnd} onClick={handleClick}>

      {/* Outer pulsing glow */}
      {!isDimmed && (
        <circle r={r + 12} fill="none" stroke={COMPLEMENT} strokeWidth={1.2}
          opacity={0.2} strokeDasharray="6 4">
          <animate attributeName="opacity" values="0.1;0.35;0.1" dur="3s" repeatCount="indefinite" />
          <animate attributeName="r" values={`${r + 10};${r + 16};${r + 10}`} dur="3s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Second pulsing ring */}
      {!isDimmed && (
        <circle r={r + 6} fill="none" stroke={COMPLEMENT} strokeWidth={0.8}
          opacity={0.15}>
          <animate attributeName="opacity" values="0.08;0.25;0.08" dur="2.5s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Inner glow fill */}
      <circle r={r + 3} fill={COMPLEMENT_GLOW} opacity={0.15} />

      {/* Double ring: outer white + inner purple */}
      <circle r={r + 2} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={2} />
      <circle r={r} fill={COMPLEMENT_DIM}
        stroke={COMPLEMENT} strokeWidth={isHovered || isSelected ? 3 : 2}
        style={{ transition: "stroke-width 0.2s" }} />

      {/* Dual probability display: PM (small gray) + RX (large green bold) */}
      {rxText ? (
        <>
          {/* PM prob — small, muted, top */}
          <text y={-10} textAnchor="middle" fill={theme.muted} fontSize={8} fontWeight={600}
            fontFamily={theme.monoFontFamily} style={{ pointerEvents: "none" }}>
            PM: {probText}
          </text>
          {/* RX prob — large, green, bold, center */}
          <text y={5} textAnchor="middle" fill={theme.positive} fontSize={14} fontWeight={800}
            fontFamily={theme.monoFontFamily} style={{ pointerEvents: "none" }}>
            RX: {rxText}
          </text>
          {/* Alpha badge — bottom */}
          {alphaInfo && (
            <text y={16} textAnchor="middle" fill={alphaInfo.color} fontSize={7.5} fontWeight={800}
              fontFamily={theme.monoFontFamily} style={{ pointerEvents: "none" }}>
              α {alphaInfo.text}
            </text>
          )}
        </>
      ) : (
        /* Fallback: single probability */
        <text y={-1} textAnchor="middle" fill="#fff" fontSize={16} fontWeight={800}
          fontFamily={theme.monoFontFamily} style={{ pointerEvents: "none" }}>
          {probText}
        </text>
      )}

      {/* 📊 icon badge */}
      <text y={-r + 8} textAnchor="middle" fontSize={10} style={{ pointerEvents: "none" }}>
        📊
      </text>

      {/* probHistory sparkline inside node (only when no RateXAI data, as dual display uses the space) */}
      {!rxText && node.probHistory && node.probHistory.length > 2 && (
        <g transform={`translate(${-r * 0.6},${6})`}>
          <MiniSparkline data={node.probHistory} width={r * 1.2} height={r * 0.45} />
        </g>
      )}

      {/* Label below node */}
      {lines.map((line, i) => (
        <text key={i} y={r + 14 + i * 10} textAnchor="middle" fill={theme.text}
          fontSize={8.5} fontWeight={isHovered ? 700 : 600}
          fontFamily={theme.monoFontFamily}
          style={{ pointerEvents: "none" }}>
          {line}
        </text>
      ))}

      {/* Expiry date badge */}
      {expiryLabel && (
        <g transform={`translate(0,${r + 14 + lines.length * 10 + 4})`}>
          <rect x={-22} y={-6} width={44} height={12} rx={6}
            fill="rgba(144,29,234,0.3)" stroke={COMPLEMENT} strokeWidth={0.5} />
          <text textAnchor="middle" y={2} fill={theme.complementUp} fontSize={6.5} fontWeight={700}
            fontFamily={theme.monoFontFamily} style={{ pointerEvents: "none" }}>
            ⏰ {expiryLabel}
          </text>
        </g>
      )}

      {/* Trading volume badge (on hover) */}
      {(isHovered || isSelected) && node.tradingVolume && (
        <g transform={`translate(${r + 6},${-8})`}>
          <rect x={0} y={-7} width={node.tradingVolume.length * 5.5 + 10} height={14} rx={7}
            fill="rgba(144,29,234,0.2)" stroke={COMPLEMENT} strokeWidth={0.5} />
          <text x={(node.tradingVolume.length * 5.5 + 10) / 2} y={2} textAnchor="middle"
            fill={theme.complementUp} fontSize={7} fontWeight={700}
            fontFamily={theme.monoFontFamily} style={{ pointerEvents: "none" }}>
            {node.tradingVolume}
          </text>
        </g>
      )}

      {/* Aggregated influence bar (below sparkline, on hover) */}
      {(isHovered || isSelected) && influenceData && influenceData.total > 0 && (
        <g transform={`translate(${-r * 0.7},${r + 14 + lines.length * 10 + (expiryLabel ? 18 : 4)})`}>
          {/* Negative (red) bar */}
          <rect x={0} y={0} width={Math.min(r * 1.4 * (influenceData.negTotal / (influenceData.total || 1)), r * 1.4)} height={4}
            rx={2} fill={theme.negative} opacity={0.6} />
          {/* Positive (green) bar */}
          <rect x={0} y={6} width={Math.min(r * 1.4 * (influenceData.posTotal / (influenceData.total || 1)), r * 1.4)} height={4}
            rx={2} fill={theme.positive} opacity={0.6} />
          <text x={r * 1.4 + 4} y={3} fill={theme.negative} fontSize={5.5} fontWeight={700}
            fontFamily={theme.monoFontFamily} style={{ pointerEvents: "none" }}>
            −{influenceData.negTotal.toFixed(0)}pp
          </text>
          <text x={r * 1.4 + 4} y={9} fill={theme.positive} fontSize={5.5} fontWeight={700}
            fontFamily={theme.monoFontFamily} style={{ pointerEvents: "none" }}>
            +{influenceData.posTotal.toFixed(0)}pp
          </text>
        </g>
      )}
    </g>
  );
});
AnchorNodeComponent.displayName = "AnchorNodeComponent";
