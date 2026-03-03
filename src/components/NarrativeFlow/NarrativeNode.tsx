import React, { memo, useCallback, useMemo } from "react";
import type { NarrativeNode as NarrativeNodeType, NarrativeSignal, GraphTheme } from "../../types";
import { getNarrativeCategoryStyle, getNarrativeSignalStyle, getSentimentColor, NARRATIVE_SIGNAL_META } from "../../styles/theme";
import { narrativeNodeRadius, wrapLabel, getNodeEmojis, getSourceAbbr } from "../../utils";
import { GlowRings, ImpactRing } from "../Shared/SvgPrimitives";

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

/** Rounded rectangle path — used for RESOLUTION (stable, diplomatic) */
function roundedRectPath(r: number, rx = 5): string {
  const w = r * 1.7;
  const h = r * 1.35;
  const hw = w / 2, hh = h / 2;
  const cr = Math.min(rx, hw, hh);
  return `M${-hw + cr},${-hh} L${hw - cr},${-hh} Q${hw},${-hh} ${hw},${-hh + cr} L${hw},${hh - cr} Q${hw},${hh} ${hw - cr},${hh} L${-hw + cr},${hh} Q${-hw},${hh} ${-hw},${hh - cr} L${-hw},${-hh + cr} Q${-hw},${-hh} ${-hw + cr},${-hh} Z`;
}

/** Diamond (rotated square) path — used for CATALYST (trigger, turning point) */
function diamondPath(r: number): string {
  const s = r * 1.1;
  return `M0,${-s} L${s},0 L0,${s} L${-s},0 Z`;
}

/** Hexagon path — used for ESCALATION (aggressive, alarming) */
function hexagonPath(r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    pts.push(`${r * Math.cos(angle)},${r * Math.sin(angle)}`);
  }
  return `M${pts.join("L")}Z`;
}

/**
 * Shape mapping per spec v2:
 *   escalation → hexagon (aggressive)
 *   catalyst   → diamond (trigger)
 *   resolution → rounded rect (stability)
 *   noise      → circle (default, neutral)
 *   reversal   → diamond rotated 90° (reuse diamond with different stroke)
 */
function getSignalShapePath(signal: NarrativeSignal, r: number): string | null {
  switch (signal) {
    case "escalation": return hexagonPath(r);
    case "catalyst": return diamondPath(r);
    case "resolution": return roundedRectPath(r, 5);
    case "reversal": return diamondPath(r * 0.9); // smaller diamond variant
    case "noise": return null; // circle (default)
    default: return null;
  }
}

// ─── Polymarket dot (bottom, small, solid purple) ────────────

const PolymarketDot = memo<{ x: number; y: number; prob: number; isHovered: boolean }>(
  ({ x, y, prob, isHovered }) => (
    <g transform={`translate(${x},${y})`}>
      <circle r={isHovered ? 8 : 5} fill="#6366f1" opacity={0.9} />
      {isHovered && (
        <text y={3} textAnchor="middle" fontSize={6} fontWeight={700} fill="#fff"
          fontFamily="'JetBrains Mono',monospace" style={{ pointerEvents: "none" }}>
          {prob}%
        </text>
      )}
      {!isHovered && (
        <text y={2} textAnchor="middle" fontSize={5.5} fontWeight={700} fill="rgba(255,255,255,0.9)"
          fontFamily="'JetBrains Mono',monospace" style={{ pointerEvents: "none" }}>
          PM
        </text>
      )}
    </g>
  ),
);
PolymarketDot.displayName = "PolymarketDot";

// ─── Source badge colors ────────────────────────────────────

const SOURCE_COLORS: Record<string, { bg: string; fg: string }> = {
  R:    { bg: "rgba(251,146,60,0.2)", fg: "#fb923c" },  // Reuters orange
  AJ:   { bg: "rgba(251,191,36,0.2)", fg: "#fbbf24" },  // Al Jazeera gold
  BB:   { bg: "rgba(167,139,250,0.2)", fg: "#a78bfa" },  // Bloomberg purple
  CNBC: { bg: "rgba(56,189,248,0.15)", fg: "#38bdf8" },  // CNBC blue
  CNN:  { bg: "rgba(248,113,113,0.15)", fg: "#f87171" }, // CNN red
  NPR:  { bg: "rgba(45,212,191,0.15)", fg: "#2dd4bf" },  // NPR teal
  WSJ:  { bg: "rgba(253,224,71,0.15)", fg: "#fde047" },  // WSJ yellow
  WP:   { bg: "rgba(148,163,184,0.15)", fg: "#94a3b8" }, // WashPost gray
  IAEA: { bg: "rgba(34,211,238,0.15)", fg: "#22d3ee" },  // IAEA cyan
  ISW:  { bg: "rgba(129,140,248,0.15)", fg: "#818cf8" }, // ISW indigo
  IDF:  { bg: "rgba(74,222,128,0.15)", fg: "#4ade80" },  // IDF green
  PM:   { bg: "rgba(99,102,241,0.2)", fg: "#6366f1" },   // Polymarket
  IR:   { bg: "rgba(248,113,113,0.15)", fg: "#f87171" }, // Iran state
  WH:   { bg: "rgba(96,165,250,0.15)", fg: "#60a5fa" },  // White House
};

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
          const sc = SOURCE_COLORS[abbr] || { bg: theme.card, fg: theme.textSecondary };
          return (
            <g key={i} transform={`translate(${bx},0)`}>
              <rect x={0} y={-7} width={w} height={14} rx={7}
                fill={sc.bg} stroke={sc.fg} strokeWidth={0.5} opacity={0.9} />
              <text x={w / 2} y={3} textAnchor="middle" fontSize={6.5} fontWeight={700}
                fill={sc.fg} fontFamily="'JetBrains Mono',monospace"
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
  const sentColor = getSentimentColor(theme, node.sentiment);
  const handleEnter = useCallback(() => onHoverStart(node.id), [node.id, onHoverStart]);
  const handleClick = useCallback(() => onSelect(node.id), [node.id, onSelect]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(node.id); }
  }, [node.id, onSelect]);

  // Emojis from tags (action + flags, up to 3)
  const [flag, ctxIcon] = useMemo(() => getNodeEmojis(node.tags), [node.tags]);
  const emojiLine = ctxIcon && flag ? `${ctxIcon}${flag}` : ctxIcon || flag || "";

  // 2-line label
  const lines = useMemo(() => wrapLabel(node.label, 18), [node.label]);
  const labelFontSize = Math.max(7, Math.min(9.5, r * 0.38));

  // Odds delta badge
  const deltaText = node.oddsDelta > 0 ? `+${node.oddsDelta.toFixed(1)}pp` : node.oddsDelta < 0 ? `${node.oddsDelta.toFixed(1)}pp` : "";
  const deltaColor = node.oddsDelta > 0 ? theme.positive : node.oddsDelta < 0 ? theme.negative : theme.neutral;

  // Shape path (null = circle for noise)
  const shapePath = useMemo(() => getSignalShapePath(node.signal, r), [node.signal, r]);
  const isCircle = shapePath === null;

  // Outer ring radius depends on shape
  const outerR = isCircle ? r + 5 : r * 1.15 + 3;

  // Has cuiBono data?
  const hasCuiBono = !!(node as unknown as Record<string, unknown>).cuiBono;

  return (
    <g className="nd" transform={`translate(${x},${y})`} style={{ cursor: "pointer", transition: "opacity 0.3s" }}
      role="button" aria-label={`${node.signal} ${node.category}: ${node.label}, odds delta ${node.oddsDelta}`}
      tabIndex={isDimmed ? -1 : 0} onKeyDown={handleKeyDown}
      opacity={isDimmed ? 0.08 : 1} onMouseEnter={handleEnter} onMouseLeave={onHoverEnd}
      onFocus={handleEnter} onBlur={onHoverEnd} onClick={handleClick}>

      {/* Glow rings */}
      <GlowRings radius={r} color={catStyle.color} time={time} isActive={isHovered || isSelected} />

      {/* Impact ring */}
      <ImpactRing radius={r} impact={node.weight * 100} color={catStyle.color} />

      {/* Momentum ring — dashed for deceleration */}
      <circle r={outerR} fill="none" stroke={sigStyle.color} strokeWidth={1}
        opacity={isDimmed ? 0.05 : 0.25}
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

      {/* Sentiment dot — top-right corner (3-4px) */}
      <circle cx={r * 0.7} cy={-r * 0.7} r={3.5}
        fill={sentColor} stroke={theme.bg} strokeWidth={1}
        opacity={isDimmed ? 0.1 : 0.9} />

      {/* Emoji line (action + flag) above center */}
      {emojiLine && (
        <text y={-r * 0.15 - (lines.length > 1 ? 6 : 3)} textAnchor="middle"
          fontSize={Math.max(9, r * 0.45)} style={{ pointerEvents: "none" }}>
          {emojiLine}
        </text>
      )}

      {/* 2-line label */}
      {lines.map((line, i) => {
        const baseY = emojiLine
          ? r * 0.15 + i * (labelFontSize + 1.5)
          : -labelFontSize * 0.3 + i * (labelFontSize + 1.5);
        return (
          <text key={i} y={baseY}
            textAnchor="middle" fill={theme.text}
            fontSize={labelFontSize}
            fontWeight={isHovered ? 700 : 600}
            fontFamily="'JetBrains Mono',monospace"
            style={{ pointerEvents: "none" }}>
            {line}
          </text>
        );
      })}

      {/* Signal badge (top-left, small) */}
      <g transform={`translate(${-r * 0.8},${-r * 0.8})`}>
        <circle r={6} fill={sigStyle.bg} stroke={sigStyle.color} strokeWidth={0.6} />
        <text textAnchor="middle" y={2.5} fill={sigStyle.color} fontSize={6.5}
          style={{ pointerEvents: "none" }}>{sigMeta?.icon || "\u25CF"}</text>
      </g>

      {/* Odds delta badge (top-right, only on hover) */}
      {deltaText && !isDimmed && (isHovered || isSelected) && (
        <g transform={`translate(${r * 0.6},${-r * 0.85})`}>
          <rect x={-2} y={-7} width={deltaText.length * 5 + 6} height={12} rx={6}
            fill={theme.bgAlt} stroke={deltaColor} strokeWidth={0.6} />
          <text x={deltaText.length * 2.5 + 1} y={1.5} textAnchor="middle" fill={deltaColor} fontSize={6}
            fontFamily="'JetBrains Mono',monospace" fontWeight={600}
            style={{ pointerEvents: "none" }}>{deltaText}</text>
        </g>
      )}

      {/* Polymarket dot (bottom-center, small solid purple) */}
      {!isDimmed && node.marketProb != null && (
        <PolymarketDot x={0} y={r + (isHovered ? 10 : 8)} prob={node.marketProb} isHovered={isHovered || isSelected} />
      )}

      {/* 🕵️ Cui Bono marker (bottom-right, small) */}
      {!isDimmed && hasCuiBono && (
        <g transform={`translate(${r * 0.75},${r * 0.65})`}>
          <circle r={5} fill="rgba(251,191,36,0.25)" stroke="#fbbf24" strokeWidth={0.5} />
          <text textAnchor="middle" y={3} fontSize={7}
            style={{ pointerEvents: "none" }}>{"\uD83D\uDD75\uFE0F"}</text>
        </g>
      )}

      {/* Source badges (shown on hover/select) */}
      {(isHovered || isSelected) && !isDimmed && node.sourceName && (
        <SourceBadge
          x={0}
          y={r + (node.marketProb != null ? 24 : 14)}
          sourceName={node.sourceName}
          theme={theme}
        />
      )}
    </g>
  );
});
NarrativeNodeComponent.displayName = "NarrativeNodeComponent";
