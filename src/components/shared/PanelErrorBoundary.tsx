"use client";
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  panelName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary that catches crashes in individual panels and displays
 * a fallback instead of bringing down the entire dashboard.
 */
export class PanelErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            background: "var(--bg-panel, #0d1117)",
            border: "1px solid rgba(255,68,68,0.2)",
            borderRadius: 6,
            padding: "12px 14px",
            fontSize: 11,
            color: "var(--text-dim, #5a7a8a)",
          }}
        >
          <div style={{ fontWeight: 700, color: "rgba(255,68,68,0.7)", marginBottom: 4, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {this.props.panelName ?? "Panel"} Error
          </div>
          <div style={{ lineHeight: 1.4 }}>
            This panel encountered an error and has been disabled to prevent affecting the rest of the dashboard.
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: 8,
              padding: "4px 10px",
              background: "none",
              border: "1px solid rgba(255,68,68,0.3)",
              borderRadius: 3,
              color: "rgba(255,68,68,0.7)",
              fontSize: 9,
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
