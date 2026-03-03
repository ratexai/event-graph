import React, { memo, useCallback, useMemo } from "react";
import type { NarrativeNode as NarrativeNodeType, NarrativeSignal, GraphTheme } from "../../types";
import { getNarrativeCategoryStyle, getNarrativeSignalStyle, NARRATIVE_SIGNAL_META } from "../../styles/theme";
import { narrativeNodeRadius, wrapLabel, getNodeEmojis, getSourceAbbr } from "../../utils";
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

// ─── SVG shape path generators ──────────────────────────────

/** Rounded rectangle path */
function roundedRectPath(r: number, rx = 6): string {
  const w = r * 1.8;
  const h = r * 1.4;
  const hw = w / 2, hh = h / 2;
  const cr = Math.min(rx, hw, hh);
  return `M${-hw + cr},${-hh} L${hw - cr},${-hh} Q${hw},${-hh} ${hw},${-hh + cr} L${hw},${hh - cr} Q${hw},${hh} ${hw - cr},${hh} L${-hw + cr},${hh} Q${-hw},${hh} ${-hw},${hh - cr} L${-hw},${-hh + cr} Q${-hw},${-hh} ${-hw + cr},${-hh} Z`;
}

/** Diamond (rotated square) path */
function diamondPath(r: number): string {
  const s = r * 1.15;
  return `M0,${-s} L${s},0 L0,${s} L${-s},0 Z`;
}

/** Hexagon path */
function hexagonPath(r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    pts.push(`${r * Math.cos(angle)},${r * Math.sin(angle)}`);
  }
  return `M${pts.join("L")}Z`;
}

/** Triangle (pointing up) path */
function trianglePath(r: number): string {
  const h = r * 1.2;
  const w = r * 1.3;
  return `M0,${-h} L${w},${h * 0.7} L${-w},${h * 0.7} Z`;
}

/** Get shape path based on signal type */
function getSignalShapePath(signal: NarrativeSignal, r: number): string | null {
  switch (signal) {
    case "catalyst": return roundedRectPath(r, 7);
    case "escalation": return diamondPath(r);
    case "reversal": return hexagonPath(r);
    case "noise": return trianglePath(r * 0.85);
    case "resolution": return null; // circle (default)
    default: return null;
  }
}

// ─── Polymarket badge SVG ───────────────────────────────────

const PolymarketBadge = memo<{ x: number; y: number; prob: number; theme: GraphTheme }>(
  ({ x, y, prob, theme }) => (
    <g transform={`translate(${x},${y})`}>
      <rect x={-20} y={-8} width={40} height={16} rx={8} fill="#1B1464" stroke="#6366f1" strokeWidth={0.8} />
      <text x={-9} y={3.5} fontSize={7} fontWeight={800} fill="#a78bfa"
        fontFamily="'JetBrains Mono',monospace" style={{ pointerEvents: "none" }}>PM</text>
      <text x={11} y={3.5} fontSize={7} fontWeight={700} fill={theme.text}
        fontFamily="'JetBrains Mono',monospace" style={{ pointerEvents: "none" }}>{prob}%</text>
    </g>
  ),
);
PolymarketBadge.displayName = "PolymarketBadge";

// ─── Source badge (shown on hover) ──────────────────────────

const SourceBadge = memo<{ x: number; y: number; sourceName: string; theme: GraphTheme }>(
  ({ x, y, sourceName, theme }) => {
    const parts = sourceName.split(/\s*[/,]\s*/).slice(0, 3);
    const badges = parts.map((s) => getSourceAbbr(s) || s.slice(0, 3).toUpperCase());
    const totalWidth = badges.reduce((sum, b) => sum + b.length * 5.5 + 10, 0) + (badges.length - 1) * 2;
    let cx = -totalWidth / 2;
    return (
      <g transform={`translate(${x},${y})`} opacity={0.9}>
        {badges.map((abbr, i) => {
          const w = abbr.length * 5.5 + 8;
          const bx = cx;
          cx += w + 2;
          return (
            <g key={i} transform={`translate(${bx},0)`}>
              <rect x={0} y={-7} width={w} height={14} rx={7} fill={theme.card} stroke={theme.borderLight} strokeWidth={0.6} />
              <text x={w / 2} y={3} textAnchor="middle" fontSize={6.5} fontWeight={700}
                fill={theme.textSecondary} fontFamily="'JetBrains Mono',monospace"
                style={{ pointerEvents: "none" }}>{abbr}</text>
            </g>
          );
        })}
      </g>
    );
  },
);
SourceBadge.displayName = "SourceBadge";

// ─── Main component ─────────────────────────────────────────

export const NarrativeNodeComponent = memo<Props>(({
  node, x, y, theme, time, isHovered, isSelected, isDimmed,
  onHoverStart, onHoverEnd, onSelect,
}) => {
  const r = narrativeNodeRadius(node.weight, node.oddsDelta);
  const catStyle = getNarrativeCategoryStyle(theme, node.category);
  const sigStyle = getNarrativeSignalStyle(theme, node.signal);
  const sigMeta = NARRATIVE_SIGNAL_META[node.signal];
  const handleEnter = useCallback(() => onHoverStart(node.id), [node.id, onHoverStart]);
  const handleClick = useCallback(() => onSelect(node.id), [node.id, onSelect]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(node.id); }
  }, [node.id, onSelect]);

  // Emojis from tags
  const [flag, ctxIcon] = useMemo(() => getNodeEmojis(node.tags), [node.tags]);
  const emojiPrefix = flag + (ctxIcon ? " " + ctxIcon : "");

  // 2-line label
  const lines = useMemo(() => wrapLabel(node.label, 18), [node.label]);
  const labelFontSize = Math.max(6.5, Math.min(8.5, r * 0.26));

  // Odds delta badge
  const deltaText = node.oddsDelta > 0 ? `+${node.oddsDelta.toFixed(1)}pp` : node.oddsDelta < 0 ? `${node.oddsDelta.toFixed(1)}pp` : "";
  const deltaColor = node.oddsDelta > 0 ? theme.positive : node.oddsDelta < 0 ? theme.negative : theme.neutral;

  // Shape path (null = circle)
  const shapePath = useMemo(() => getSignalShapePath(node.signal, r), [node.signal, r]);
  const isCircle = shapePath === null;

  // Outer ring radius depends on shape
  const outerR = isCircle ? r + 7 : r * 1.2 + 4;

  return (
    <g className="nd" transform={`translate(${x},${y})`} style={{ cursor: "pointer", transition: "opacity 0.3s" }}
      role="button" aria-label={`${node.signal} ${node.category}: ${node.label}, odds delta ${node.oddsDelta}`}
      tabIndex={isDimmed ? -1 : 0} onKeyDown={handleKeyDown}
      opacity={isDimmed ? 0.08 : 1} onMouseEnter={handleEnter} onMouseLeave={onHoverEnd}
      onFocus={handleEnter} onBlur={onHoverEnd} onClick={handleClick}>

      {/* Glow rings */}
      <GlowRings radius={r} color={catStyle.color} time={time} isActive={isHovered || isSelected} />

      {/* Sentiment ring (uses circle always for visual consistency) */}
      <SentimentRing radius={r + 3} sentiment={node.sentiment} theme={theme} isDimmed={isDimmed} />

      {/* Impact ring */}
      <ImpactRing radius={r} impact={node.weight * 100} color={catStyle.color} />

      {/* Momentum ring */}
      <circle r={outerR} fill="none" stroke={sigStyle.color} strokeWidth={1}
        opacity={isDimmed ? 0.05 : 0.3}
        strokeDasharray={node.momentum < 0 ? "3 4" : "none"}
        strokeLinecap="round" />

      {/* Main shape */}
      {isCircle ? (
        <circle r={r} fill={catStyle.bg} stroke={catStyle.color}
          strokeWidth={isHovered || isSelected ? 2.5 : 1.2} />
      ) : (
        <path d={shapePath} fill={catStyle.bg} stroke={catStyle.color}
          strokeWidth={isHovered || isSelected ? 2.5 : 1.2}
          strokeLinejoin="round" />
      )}

      {/* Emoji prefix (flag + context) above center */}
      {emojiPrefix && (
        <text y={lines.length > 1 ? -8 : -5} textAnchor="middle"
          fontSize={r > 24 ? 13 : 11} style={{ pointerEvents: "none" }}>
          {emojiPrefix}
        </text>
      )}

      {/* 2-line label */}
      {lines.map((line, i) => (
        <text key={i}
          y={(emojiPrefix ? 5 : -2) + i * (labelFontSize + 2) + (lines.length === 1 ? 4 : 0)}
          textAnchor="middle" fill={theme.text} fontSize={labelFontSize}
          fontWeight={600} fontFamily="'JetBrains Mono',monospace"
          style={{ pointerEvents: "none" }}>
          {line}
        </text>
      ))}

      {/* Signal badge (top-left) */}
      <g transform={`translate(${-r * 0.75},${-r * 0.85})`}>
        <circle r={9} fill={sigStyle.bg} stroke={sigStyle.color} strokeWidth={0.8} />
        <text textAnchor="middle" y={3.5} fill={sigStyle.color} fontSize={9}
          style={{ pointerEvents: "none" }}>{sigMeta?.icon || "\u25CF"}</text>
      </g>

      {/* Odds delta badge (top-right) */}
      {deltaText && !isDimmed && (
        <g transform={`translate(${r * 0.7},${-r * 0.85})`}>
          <rect x={-2} y={-8} width={deltaText.length * 5.5 + 8} height={14} rx={7}
            fill={theme.bgAlt} stroke={deltaColor} strokeWidth={0.8} />
          <text x={deltaText.length * 2.75 + 2} y={2} textAnchor="middle" fill={deltaColor} fontSize={7}
            fontFamily="'JetBrains Mono',monospace" fontWeight={600}
            style={{ pointerEvents: "none" }}>{deltaText}</text>
        </g>
      )}

      {/* Polymarket badge (bottom-center) — visible when marketProb is set */}
      {!isDimmed && node.marketProb != null && (
        <PolymarketBadge x={0} y={r + 14} prob={node.marketProb} theme={theme} />
      )}

      {/* Source badges (shown on hover/select below the Polymarket badge) */}
      {(isHovered || isSelected) && !isDimmed && node.sourceName && (
        <SourceBadge
          x={0}
          y={r + (node.marketProb != null ? 32 : 16)}
          sourceName={node.sourceName}
          theme={theme}
        />
      )}
    </g>
  );
});
NarrativeNodeComponent.displayName = "NarrativeNodeComponent";
