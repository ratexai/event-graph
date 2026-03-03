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
}

export const StreamPath = memo<StreamProps>(({
  from, to, width, fromColor, toColor, isActive, isDimmed, index = 0, particles = 3, isFuture,
}) => {
  const paths = streamPath(from, to, width);
  const gradId = `sg-${index}`;

  return (
    <g opacity={isDimmed ? 0.04 : 1} style={{ transition: "opacity 0.3s" }}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={fromColor} stopOpacity={isActive ? 0.5 : isFuture ? 0.12 : 0.08} />
          <stop offset="100%" stopColor={toColor} stopOpacity={isActive ? 0.6 : isFuture ? 0.18 : 0.15} />
        </linearGradient>
      </defs>
      {isFuture ? (
        <>
          {/* Future edges: no filled shape, just dashed center + top/bottom lines */}
          <path d={paths.center} fill="none" stroke={toColor} strokeWidth={isActive ? 1.5 : 0.8}
            strokeDasharray="6 4" opacity={isActive ? 0.55 : 0.2} />
          <path d={paths.top} fill="none" stroke={toColor} strokeWidth={0.4}
            strokeDasharray="3 5" opacity={isActive ? 0.25 : 0.08} />
          <path d={paths.bottom} fill="none" stroke={toColor} strokeWidth={0.4}
            strokeDasharray="3 5" opacity={isActive ? 0.25 : 0.08} />
        </>
      ) : (
        <>
          <path d={paths.shape} fill={`url(#${gradId})`} />
          <path d={paths.center} fill="none" stroke={toColor} strokeWidth={isActive ? 1 : 0.4} opacity={isActive ? 0.4 : 0.08} />
        </>
      )}
      {isActive && (
        <>
          {!isFuture && (
            <>
              <path d={paths.top} fill="none" stroke={toColor} strokeWidth={0.8} opacity={0.3} />
              <path d={paths.bottom} fill="none" stroke={toColor} strokeWidth={0.8} opacity={0.3} />
            </>
          )}
          {Array.from({ length: particles }).map((_, i) => (
            <circle key={i} r={2.5 - i * 0.4} fill={toColor} opacity={0.8 - i * 0.15}>
              <animateMotion
                dur={`${isFuture ? 2.5 + i * 0.5 : 1.5 + i * 0.3}s`}
                repeatCount="indefinite"
                path={paths.center}
                begin={`${i * 0.35}s`}
              />
            </circle>
          ))}
        </>
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
}

export const GridColumn = memo<GridColumnProps>(({ x, topY, bottomY, label, theme, isFuture }) => (
  <g>
    <line x1={x} y1={topY - 14} x2={x} y2={bottomY + 14}
      stroke={isFuture ? "#6366f1" : theme.border}
      strokeWidth={isFuture ? 1.2 : 1}
      strokeDasharray={isFuture ? "4 8" : "1 6"}
      opacity={isFuture ? 0.35 : 0.5} />
    {isFuture && (
      <rect x={x - 30} y={topY - 14} width={60} height={bottomY - topY + 28}
        fill="rgba(99,102,241,0.03)" rx={4} />
    )}
    <rect x={x - 28} y={bottomY + 18} width={56} height={18} rx={9}
      fill={isFuture ? "rgba(99,102,241,0.15)" : theme.bgAlt}
      stroke={isFuture ? "#6366f1" : theme.border}
      strokeWidth={isFuture ? 0.8 : 0.5} />
    <text x={x} y={bottomY + 30} textAnchor="middle"
      fill={isFuture ? "#a78bfa" : theme.muted}
      fontSize={8.5} fontFamily="'JetBrains Mono',monospace"
      fontWeight={isFuture ? 700 : 500}>{label}</text>
  </g>
));
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
  return (
    <>
      <circle r={radius + 22 + Math.sin(time * 1.8) * 5} fill="none" stroke={color} strokeWidth={0.6} opacity={0.08 + Math.sin(time * 2) * 0.03} />
      <circle r={radius + 14 + Math.sin(time * 2.5) * 3} fill="none" stroke={color} strokeWidth={0.8} opacity={0.12} />
      <circle r={radius + 6} fill={color} opacity={0.05} />
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
      fontFamily="'JetBrains Mono',monospace" style={{ pointerEvents: "none" }}>{label}</text>
  </g>
));
TierBadge.displayName = "TierBadge";
