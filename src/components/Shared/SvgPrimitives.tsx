/* ═══════════════════════════════════════════════════════════════
   Shared SVG Sub-Components
   StreamPath, GridColumn, FlowArrow, Sparkline, GlowRings, etc.
   ═══════════════════════════════════════════════════════════════ */

import React, { memo } from "react";
import type { Point2D, GraphTheme, Sentiment } from "../../types";
import { streamPath } from "../../utils";
import { getSentimentColor } from "../../styles/theme";

// ─── StreamPath ─────────────────────────────────────────────────

interface StreamProps {
  from: Point2D;
  to: Point2D;
  width: number;
  fromColor: string;
  toColor: string;
  isActive: boolean;
  isDimmed: boolean;
  /** Unique index for gradient ID deduplication */
  index?: number;
  particles?: number;
  /** Future edge — dashed, purple-tinted */
  isFuture?: boolean;
  /** Influence value for causal links to anchors (colors stream red/green) */
  influence?: number;
  /** Mechanism label shown on hover for influence edges */
  mechanism?: string;
  /** Is this edge going to a scenario node? */
  isScenarioEdge?: boolean;
  /** Scenario outcome — colors the edge green (YES) or red (NO) */
  scenarioOutcome?: "YES" | "NO" | "PARTIAL";
}

export const StreamPath = memo<StreamProps>(({
  from, to, width, fromColor, toColor, isActive, isDimmed, index = 0, particles = 3,
  isFuture, influence, mechanism, isScenarioEdge, scenarioOutcome,
}) => {
  const paths = streamPath(from, to, width);
  const gradId = `sg-${index}`;

  // Influence-colored streams: red for negative, green for positive
  const isInfluenceEdge = influence != null && influence !== 0;
  const influenceColor = isInfluenceEdge
    ? (influence! > 0 ? "#30fd82" : "#ff495f")
    : toColor;

  // Scenario edges: green for YES, red for NO
  const scenarioColor = isScenarioEdge
    ? (scenarioOutcome === "YES" || scenarioOutcome === "PARTIAL" ? "#30fd82" : "#ff495f")
    : undefined;

  const effectiveColor = scenarioColor || (isInfluenceEdge ? influenceColor : toColor);
  const effectiveFromColor = scenarioColor || (isInfluenceEdge ? influenceColor : fromColor);

  return (
    <g opacity={isDimmed ? 0.04 : 1} style={{ transition: "opacity 0.3s" }}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={effectiveFromColor} stopOpacity={isActive ? 0.5 : isFuture ? 0.12 : 0.08} />
          <stop offset="100%" stopColor={effectiveColor} stopOpacity={isActive ? 0.6 : isFuture ? 0.18 : 0.15} />
        </linearGradient>
      </defs>
      {isFuture || isScenarioEdge ? (
        <>
          {/* Future/scenario edges: dashed center + top/bottom lines */}
          <path d={paths.center} fill="none" stroke={effectiveColor}
            strokeWidth={isActive ? 1.5 : isInfluenceEdge ? Math.max(0.8, Math.abs(influence!) * 0.05) : 0.8}
            strokeDasharray={isScenarioEdge ? "8 4" : "6 4"} opacity={isActive ? 0.55 : 0.25} />
          <path d={paths.top} fill="none" stroke={effectiveColor} strokeWidth={0.4}
            strokeDasharray="3 5" opacity={isActive ? 0.25 : 0.08} />
          <path d={paths.bottom} fill="none" stroke={effectiveColor} strokeWidth={0.4}
            strokeDasharray="3 5" opacity={isActive ? 0.25 : 0.08} />
        </>
      ) : isInfluenceEdge ? (
        <>
          {/* Influence edges to anchors: colored shape + thicker center */}
          <path d={paths.shape} fill={`url(#${gradId})`} />
          <path d={paths.center} fill="none" stroke={influenceColor}
            strokeWidth={isActive ? 1.5 : 0.8} opacity={isActive ? 0.6 : 0.2} />
        </>
      ) : (
        <>
          <path d={paths.shape} fill={`url(#${gradId})`} />
          <path d={paths.center} fill="none" stroke={effectiveColor} strokeWidth={isActive ? 1 : 0.4} opacity={isActive ? 0.4 : 0.08} />
        </>
      )}
      {isActive && (
        <>
          {!isFuture && !isScenarioEdge && (
            <>
              <path d={paths.top} fill="none" stroke={effectiveColor} strokeWidth={0.8} opacity={0.3} />
              <path d={paths.bottom} fill="none" stroke={effectiveColor} strokeWidth={0.8} opacity={0.3} />
            </>
          )}
          {Array.from({ length: particles }).map((_, i) => (
            <circle key={i} r={2.5 - i * 0.4} fill={effectiveColor} opacity={0.8 - i * 0.15}>
              <animateMotion
                dur={`${isFuture || isScenarioEdge ? 2.5 + i * 0.5 : 1.5 + i * 0.3}s`}
                repeatCount="indefinite"
                path={paths.center}
                begin={`${i * 0.35}s`}
              />
            </circle>
          ))}
        </>
      )}
      {/* Influence label on hover */}
      {isActive && isInfluenceEdge && (
        <text
          x={(from.x + to.x) / 2}
          y={(from.y + to.y) / 2 - 8}
          textAnchor="middle" fill={influenceColor} fontSize={7} fontWeight={700}
          fontFamily="'JetBrains Mono','SF Mono',monospace" style={{ pointerEvents: "none" }}>
          {influence! > 0 ? "+" : ""}{influence}pp{mechanism ? `: ${mechanism}` : ""}
        </text>
      )}
    </g>
  );
});
StreamPath.displayName = "StreamPath";

// ─── GridColumn ─────────────────────────────────────────────────

interface GridColumnProps {
  x: number;
  topY: number;
  bottomY: number;
  label: string;
  theme: GraphTheme;
  isFuture?: boolean;
  /** Anchor date column — special purple treatment with 📊 icon */
  isAnchorDate?: boolean;
}

export const GridColumn = memo<GridColumnProps>(({ x, topY, bottomY, label, theme, isFuture, isAnchorDate }) => {
  const isSpecial = isFuture || isAnchorDate;
  return (
    <g>
      <line x1={x} y1={topY - 14} x2={x} y2={bottomY + 14}
        stroke={isSpecial ? "#901dea" : theme.border}
        strokeWidth={isAnchorDate ? 1.5 : isFuture ? 1.2 : 1}
        strokeDasharray={isAnchorDate ? "6 6" : isFuture ? "4 8" : "1 6"}
        opacity={isAnchorDate ? 0.5 : isFuture ? 0.35 : 0.5} />
      {isSpecial && (
        <rect x={x - 30} y={topY - 14} width={60} height={bottomY - topY + 28}
          fill={isAnchorDate ? "rgba(144,29,234,0.06)" : "rgba(144,29,234,0.03)"} rx={4} />
      )}
      {isAnchorDate && (
        <>
          {/* Anchor date expiry marker at top */}
          <text x={x} y={topY - 20} textAnchor="middle" fontSize={13}
            style={{ pointerEvents: "none" }}>📊</text>
        </>
      )}
      <rect x={x - 28} y={bottomY + 18} width={56} height={18} rx={9}
        fill={isSpecial ? "rgba(144,29,234,0.15)" : theme.bgAlt}
        stroke={isAnchorDate ? "#901dea" : isFuture ? "#901dea" : theme.border}
        strokeWidth={isAnchorDate ? 1 : isFuture ? 0.8 : 0.5} />
      <text x={x} y={bottomY + 30} textAnchor="middle"
        fill={isSpecial ? "#b659ff" : theme.muted}
        fontSize={8.5} fontFamily="'JetBrains Mono','SF Mono',monospace"
        fontWeight={isSpecial ? 700 : 500}>{label}</text>
      {isAnchorDate && (
        <text x={x} y={bottomY + 41} textAnchor="middle" fill="#b659ff"
          fontSize={6} fontWeight={600} fontFamily="'JetBrains Mono','SF Mono',monospace">
          expiry
        </text>
      )}
    </g>
  );
});
GridColumn.displayName = "GridColumn";

// ─── FlowArrow ──────────────────────────────────────────────────

interface FlowArrowProps { startX: number; endX: number; centerY: number; theme: GraphTheme; }

export const FlowArrow = memo<FlowArrowProps>(({ startX, endX, centerY, theme }) => (
  <g opacity={0.25}>
    <line x1={startX} y1={centerY} x2={endX} y2={centerY} stroke={theme.accent} strokeWidth={0.5} strokeDasharray="6 8" />
    <polygon points={`${endX},${centerY} ${endX - 8},${centerY - 4} ${endX - 8},${centerY + 4}`} fill={theme.accent} />
  </g>
));
FlowArrow.displayName = "FlowArrow";

// ─── SentimentRing ──────────────────────────────────────────────

interface SentimentRingProps { radius: number; sentiment: Sentiment; theme: GraphTheme; isDimmed: boolean; }

export const SentimentRing = memo<SentimentRingProps>(({ radius, sentiment, theme, isDimmed }) => (
  <circle r={radius} fill="none" stroke={getSentimentColor(theme, sentiment)} strokeWidth={2.5}
    opacity={isDimmed ? 0.05 : 0.4} strokeDasharray={sentiment === "neg" ? "4 3" : sentiment === "neu" ? "2 5" : "none"} />
));
SentimentRing.displayName = "SentimentRing";

// ─── Sparkline ──────────────────────────────────────────────────

interface SparklineProps { data: number[]; color: string; width?: number; height?: number; }

export const Sparkline: React.FC<SparklineProps> = ({ data, color, width = 140, height = 28 }) => {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => `${(i / Math.max(data.length - 1, 1)) * width},${height - (v / max) * height}`).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline points={`0,${height} ${pts} ${width},${height}`} fill={`${color}12`} stroke="none" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
};

// ─── GlowRings ──────────────────────────────────────────────────

interface GlowRingsProps { radius: number; color: string; time: number; isActive: boolean; }

export const GlowRings = memo<GlowRingsProps>(({ radius, color, time, isActive }) => {
  if (!isActive) return null;
  // Subdued glow per RateXAI dashboard spec (stdDeviation 4→3, 8→5)
  return (
    <>
      <circle r={radius + 18 + Math.sin(time * 1.8) * 3} fill="none" stroke={color} strokeWidth={0.5} opacity={0.06 + Math.sin(time * 2) * 0.02} />
      <circle r={radius + 10 + Math.sin(time * 2.5) * 2} fill="none" stroke={color} strokeWidth={0.6} opacity={0.08} />
      <circle r={radius + 5} fill={color} opacity={0.04} />
    </>
  );
});
GlowRings.displayName = "GlowRings";

// ─── ImpactRing ─────────────────────────────────────────────────

interface ImpactRingProps { radius: number; impact: number; color: string; }

export const ImpactRing = memo<ImpactRingProps>(({ radius, impact, color }) => (
  <circle r={radius + 6} fill="none" stroke={color} strokeWidth={0.5} opacity={0.15}
    strokeDasharray={`${impact * 0.6} ${(100 - impact) * 0.6}`} strokeDashoffset={-25} strokeLinecap="round" />
));
ImpactRing.displayName = "ImpactRing";

// ─── TierBadge ──────────────────────────────────────────────────

interface TierBadgeProps { label: string; color: string; bg: string; offsetX: number; offsetY: number; }

export const TierBadge = memo<TierBadgeProps>(({ label, color, bg, offsetX, offsetY }) => (
  <g transform={`translate(${offsetX},${offsetY})`}>
    <rect x={-12} y={-7} width={24} height={14} rx={7} fill={bg} stroke={color} strokeWidth={0.8} />
    <text x={0} y={3} textAnchor="middle" fill={color} fontSize={6.5} fontWeight={800}
      fontFamily="'JetBrains Mono','SF Mono',monospace" style={{ pointerEvents: "none" }}>{label}</text>
  </g>
));
TierBadge.displayName = "TierBadge";
