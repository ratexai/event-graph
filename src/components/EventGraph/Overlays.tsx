import React, { memo } from "react";
import type { GraphTheme, NarrativeSignal } from "../../types";
import { NARRATIVE_SIGNAL_META } from "../../styles/theme";

interface ZoomControlsProps {
  theme: GraphTheme;
  panelOffset: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  isMobile?: boolean;
}

export function ZoomControls({ theme, panelOffset, onZoomIn, onZoomOut, onReset, isMobile = false }: ZoomControlsProps) {
  const btnSize = isMobile ? 44 : 30;
  const fontSize = isMobile ? 20 : 15;
  return (
    <div role="group" aria-label="Zoom controls" style={{ position: "absolute", bottom: isMobile ? 16 : 20, right: panelOffset ? panelOffset + 16 : 16, display: "flex", flexDirection: "column", gap: isMobile ? 6 : 3, zIndex: 25 }}>
      {[
        { label: "+", action: onZoomIn, ariaLabel: "Zoom in" },
        { label: "⊙", action: onReset, ariaLabel: "Reset zoom" },
        { label: "−", action: onZoomOut, ariaLabel: "Zoom out" },
      ].map((button) => (
        <button
          key={button.label}
          onClick={button.action}
          aria-label={button.ariaLabel}
          style={{
            width: btnSize,
            height: btnSize,
            borderRadius: isMobile ? 12 : 8,
            border: `1px solid ${theme.border}`,
            background: theme.bgAlt,
            color: theme.muted,
            fontSize,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "inherit",
            transition: "background-color 0.3s ease",
          }}
        >
          {button.label}
        </button>
      ))}
    </div>
  );
}

interface StatusOverlayProps {
  theme: GraphTheme;
  loading: boolean;
  error: string | null;
}

export function StatusOverlay({ theme, loading, error }: StatusOverlayProps) {
  if (loading) {
    return (
      <div style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        padding: "16px 32px", borderRadius: 12, background: theme.surface, border: `1px solid ${theme.border}`,
        zIndex: 40, fontSize: 12, color: theme.textSecondary,
      }}>
        Loading graph data...
      </div>
    );
  }

  if (!error) return null;

  return (
    <div style={{
      position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
      padding: "16px 32px", borderRadius: 12, background: theme.negativeDim, border: `1px solid ${theme.negative}40`,
      zIndex: 40, fontSize: 12, color: theme.negative,
    }}>
      {error}
    </div>
  );
}

// ─── Legend Bar ─────────────────────────────────────────────────

interface LegendBarProps {
  theme: GraphTheme;
  panelOffset: number;
}

const SIGNAL_SHAPES: Record<NarrativeSignal, { label: string; svg: string }> = {
  escalation: { label: "Escalation", svg: "M5,0 L10,8.66 L0,8.66Z" }, // hexagon simplified
  catalyst:   { label: "Catalyst",   svg: "M5,0 L10,5 L5,10 L0,5Z" }, // diamond
  resolution: { label: "Resolution", svg: "M1,0 L9,0 Q10,0 10,1 L10,7 Q10,8 9,8 L1,8 Q0,8 0,7 L0,1 Q0,0 1,0Z" }, // rounded rect
  reversal:   { label: "Reversal",   svg: "M5,0.5 L9.5,5 L5,9.5 L0.5,5Z" }, // diamond variant
  noise:      { label: "Noise",      svg: "" }, // circle (special case)
};

export const NarrativeLegend = memo<LegendBarProps>(({ theme, panelOffset }) => {
  const signals: NarrativeSignal[] = ["escalation", "catalyst", "resolution", "reversal", "noise"];
  return (
    <div style={{
      position: "absolute", bottom: 8, left: 16, right: panelOffset + 16,
      display: "flex", alignItems: "center", gap: 14, padding: "5px 12px",
      background: theme.surface, borderRadius: 8,
      border: `1px solid ${theme.border}`, zIndex: 20,
      fontSize: 12, fontFamily: theme.fontFamily,
      color: theme.textSecondary, opacity: 0.85,
      pointerEvents: "none",
    }}>
      <span style={{ fontWeight: 700, fontSize: 8, letterSpacing: 1, textTransform: "uppercase", color: theme.muted }}>Shapes</span>
      {signals.map((sig) => {
        const meta = NARRATIVE_SIGNAL_META[sig];
        const shape = SIGNAL_SHAPES[sig];
        const sigColor = theme.narrativeSignalColors[sig]?.color ?? theme.muted;
        return (
          <span key={sig} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <svg width={12} height={12} viewBox="0 0 10 10">
              {sig === "noise" ? (
                <circle cx={5} cy={5} r={4} fill="none" stroke={sigColor} strokeWidth={1.2} />
              ) : (
                <path d={shape.svg} fill="none" stroke={sigColor} strokeWidth={1.2} strokeLinejoin="round" />
              )}
            </svg>
            <span>{meta?.icon} {shape.label}</span>
          </span>
        );
      })}
      <span style={{ margin: "0 4px", color: theme.border }}>|</span>
      <span style={{ fontWeight: 700, fontSize: 8, letterSpacing: 1, textTransform: "uppercase", color: theme.muted }}>Size</span>
      {["XS", "S", "M", "L", "XL"].map((tier, i) => (
        <span key={tier} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
          <svg width={8 + i * 3} height={8 + i * 3} viewBox="0 0 10 10">
            <circle cx={5} cy={5} r={4} fill="none" stroke={theme.muted} strokeWidth={0.8} />
          </svg>
          <span>{tier}</span>
        </span>
      ))}
      <span style={{ margin: "0 4px", color: theme.border }}>|</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
        <svg width={8} height={8}><circle cx={4} cy={4} r={3} fill={theme.positive} /></svg> pos
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
        <svg width={8} height={8}><circle cx={4} cy={4} r={3} fill={theme.negative} /></svg> neg
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
        <svg width={8} height={8}><circle cx={4} cy={4} r={3} fill={theme.neutral} /></svg> neu
      </span>
    </div>
  );
});
NarrativeLegend.displayName = "NarrativeLegend";
