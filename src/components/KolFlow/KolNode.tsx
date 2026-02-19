import React, { memo, useCallback } from "react";
import type { KolNode as KolNodeType, GraphTheme } from "../../types";
import { getKolTierStyle, KOL_TIER_META, PLATFORM_META } from "../../styles/theme";
import { kolRadius, truncateLabel, formatNumber } from "../../utils";
import { GlowRings, SentimentRing, TierBadge } from "../Shared/SvgPrimitives";

interface Props {
  kol: KolNodeType;
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

export const KolNodeComponent = memo<Props>(({
  kol, x, y, theme, time, isHovered, isSelected, isDimmed,
  onHoverStart, onHoverEnd, onSelect,
}) => {
  const r = kolRadius(kol.followers);
  const tierStyle = getKolTierStyle(theme, kol.tier);
  const tierMeta = KOL_TIER_META[kol.tier];
  const platMeta = PLATFORM_META[kol.platform] || PLATFORM_META.other;
  const handleEnter = useCallback(() => onHoverStart(kol.id), [kol.id, onHoverStart]);
  const handleClick = useCallback(() => onSelect(kol.id), [kol.id, onSelect]);

  return (
    <g className="nd" transform={`translate(${x},${y})`} style={{ cursor: "pointer", transition: "opacity 0.3s" }}
      opacity={isDimmed ? 0.08 : 1} onMouseEnter={handleEnter} onMouseLeave={onHoverEnd} onClick={handleClick}>
      <GlowRings radius={r} color={tierStyle.color} time={time} isActive={isHovered || isSelected} />
      {/* Engagement ring */}
      <circle r={r + 5} fill="none" stroke={tierStyle.color} strokeWidth={1} opacity={0.2}
        strokeDasharray={`${kol.engRate * 8} ${(10 - kol.engRate) * 8}`} strokeDashoffset={-15} strokeLinecap="round" />
      <SentimentRing radius={r + 3} sentiment={kol.sentiment} theme={theme} isDimmed={isDimmed} />
      <circle r={r} fill={tierStyle.bg} stroke={tierStyle.color} strokeWidth={isHovered || isSelected ? 2.5 : 1.2} />
      {/* Avatar initials */}
      <text y={-5} textAnchor="middle" fill={tierStyle.color} fontSize={r * 0.45} fontWeight={800}
        fontFamily="'JetBrains Mono',monospace" style={{ pointerEvents: "none" }}>{kol.avatar}</text>
      {/* Name */}
      <text y={r * 0.35 + 4} textAnchor="middle" fill={theme.text} fontSize={Math.max(7, r * 0.28)}
        fontWeight={600} fontFamily="'JetBrains Mono',monospace" style={{ pointerEvents: "none" }}>{truncateLabel(kol.name, 14)}</text>
      {/* Followers + platform */}
      {!isDimmed && (
        <g transform={`translate(0,${r + 14})`}>
          <text textAnchor="middle" fill={theme.muted} fontSize={8} fontFamily="'JetBrains Mono',monospace"
            style={{ pointerEvents: "none" }}>{formatNumber(kol.followers)} · {platMeta.icon}</text>
        </g>
      )}
      <TierBadge label={tierMeta.label} color={tierStyle.color} bg={tierStyle.bg} offsetX={r * 0.75} offsetY={-r * 0.75} />
      {/* Platform icon */}
      <g transform={`translate(${-r * 0.75},${-r * 0.75})`}>
        <circle r={9} fill={theme.bgAlt} stroke={theme.border} strokeWidth={0.8} />
        <text textAnchor="middle" y={3.5} fill={theme.textSecondary} fontSize={9}
          fontFamily="'JetBrains Mono',monospace" style={{ pointerEvents: "none" }}>{platMeta.icon}</text>
      </g>
    </g>
  );
});
KolNodeComponent.displayName = "KolNodeComponent";
