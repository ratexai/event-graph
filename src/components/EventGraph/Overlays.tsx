import React from "react";
import type { GraphTheme } from "../../types";

interface ZoomControlsProps {
  theme: GraphTheme;
  panelOffset: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export function ZoomControls({ theme, panelOffset, onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  return (
    <div role="group" aria-label="Zoom controls" style={{ position: "absolute", bottom: 20, right: panelOffset ? panelOffset + 16 : 16, display: "flex", flexDirection: "column", gap: 3, zIndex: 25 }}>
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
            width: 30,
            height: 30,
            borderRadius: 8,
            border: `1px solid ${theme.border}`,
            background: theme.bgAlt,
            color: theme.muted,
            fontSize: 15,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "inherit",
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
