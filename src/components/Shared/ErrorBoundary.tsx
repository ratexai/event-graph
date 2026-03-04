import React from "react";
import type { GraphTheme } from "../../types";

interface Props {
  theme: GraphTheme;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GraphErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { theme } = this.props;
      return (
        <div
          role="alert"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            gap: 12,
            color: theme.textSecondary,
            fontFamily: "'Work Sans', sans-serif",
          }}
        >
          <div style={{ fontSize: 24, opacity: 0.5 }}>⚠</div>
          <div style={{ fontSize: 12, fontWeight: 600 }}>Graph rendering failed</div>
          <div style={{ fontSize: 10, color: theme.muted, maxWidth: 300, textAlign: "center" }}>
            {this.state.error?.message || "An unexpected error occurred"}
          </div>
          <button
            onClick={this.handleRetry}
            style={{
              marginTop: 8,
              padding: "6px 16px",
              borderRadius: 8,
              border: `1px solid ${theme.border}`,
              background: theme.bgAlt,
              color: theme.accent,
              fontSize: 10,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
