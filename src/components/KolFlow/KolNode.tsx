import React, { memo, useCallback } from "react";
import type { KolNode as KolNodeType, GraphTheme } from "../../types";
import { getKolTierStyle, KOL_TIER_META, PLATFORM_META } from "../../styles/theme";
import { kolRadius, truncateLabel, formatNumber } from "../../utils";
import { NodeImage } from "../Shared/SvgPrimitives";

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
  const isActive = isHovered || isSelected;
  const handleEnter = useCallback(() => onHoverStart(kol.id), [kol.id, onHoverStart]);
  const handleClick = useCallback(() => onSelect(kol.id), [kol.id, onSelect]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(kol.id); }
  }, [kol.id, onSelect]);

  const gradId = `kg-${kol.id}`;

  return (
    <g className="nd" transform={`translate(${x},${y})`} style={{ cursor: "pointer", transition: "opacity 0.3s" }}
      role="button" aria-label={`${tierMeta.label} KOL: ${kol.name}, ${formatNumber(kol.followers)} followers`}
      tabIndex={isDimmed ? -1 : 0} onKeyDown={handleKeyDown}
      opacity={isDimmed ? 0.15 : 1} onMouseEnter={handleEnter} onMouseLeave={onHoverEnd}
      onFocus={handleEnter} onBlur={onHoverEnd} onClick={handleClick}
      filter={isSelected ? "url(#glow)" : undefined}>

      {/* §12 BubbleNode radial gradient */}
      <defs>
        <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={tierStyle.color} stopOpacity={0.12} />
          <stop offset="60%" stopColor={tierStyle.color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={tierStyle.color} stopOpacity={0.65} />
        </radialGradient>
      </defs>

      {/* §12 Outer ring — dashed on hover, solid on select */}
      {isActive && (
        <circle r={r + 5} fill="none" stroke={tierStyle.color} strokeWidth={1.5}
          opacity={0.5} strokeDasharray={isSelected ? "none" : "4,3"} />
      )}

      {/* Main circle — radial gradient fill per §12 */}
      <circle r={r} fill={`url(#${gradId})`} stroke={tierStyle.color}
        strokeWidth={isActive ? 2 : 1} strokeOpacity={isActive ? 0.85 : 0.35}
        style={{ transition: "stroke-width 0.3s, stroke-opacity 0.3s" }} />

      {/* Avatar: image or initials */}
      {(kol.imageUrl || kol.avatarUrl) ? (
        <NodeImage href={(kol.imageUrl || kol.avatarUrl)!} radius={Math.max(r / 2.8, 10)} nodeId={kol.id} borderColor={tierStyle.color} borderWidth={1} />
      ) : (
        <text y={1} textAnchor="middle" fill={tierStyle.color} fontSize={Math.min(r / 3, 14)} fontWeight={700}
          fontFamily={theme.fontFamily} style={{ pointerEvents: "none" }}>{kol.avatar}</text>
      )}

      {/* Name label below (§12 BubbleNode nameLabel) */}
      {r > 18 && (() => {
        const lbl = truncateLabel(kol.name, 14);
        const fs = Math.min(r / 4.5, 12);
        const ly = r + 12;
        return (
          <text y={ly} textAnchor="middle" fill={theme.text} fontSize={fs}
            fontWeight={500} fontFamily={theme.fontFamily}
            style={{ pointerEvents: "none" }}>{lbl}</text>
        );
      })()}

      {/* §15 Tier badge — top-right */}
      {!isDimmed && r >= 20 && (
        <g transform={`translate(${r * 0.7},${-r * 0.7})`}>
          <circle r={7} fill={tierStyle.color} stroke={theme.bg} strokeWidth={1.5} />
          <text textAnchor="middle" y={3.5} fill="#ffffff" fontSize={7} fontWeight={700}
            fontFamily={theme.fontFamily} style={{ pointerEvents: "none" }}>
            {tierMeta.label.charAt(0).toUpperCase()}
          </text>
        </g>
      )}

      {/* Platform badge — top-left */}
      {!isDimmed && r >= 20 && (
        <g transform={`translate(${-r * 0.7},${-r * 0.7})`}>
          <circle r={7} fill={theme.surface} stroke={theme.border} strokeWidth={0.8} />
          <text textAnchor="middle" y={3} fill={theme.textSecondary} fontSize={7}
            fontWeight={600} fontFamily={theme.fontFamily} style={{ pointerEvents: "none" }}>
            {platMeta.label.substring(0, 2).toUpperCase()}
          </text>
        </g>
      )}
    </g>
  );
});
KolNodeComponent.displayName = "KolNodeComponent";
