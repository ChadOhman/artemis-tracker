"use client";
import { useState, ReactNode } from "react";

interface PanelFrameProps {
  title: string;
  /** Icon or element shown before the title */
  icon?: ReactNode;
  /** Slot rendered on the right side of the header */
  headerRight?: ReactNode;
  /** CSS border-left accent color override (e.g. var(--accent-cyan)) */
  accentColor?: string;
  /** Whether the panel body can be collapsed by clicking the header */
  collapsible?: boolean;
  /** Default collapsed state (only relevant when collapsible=true) */
  defaultCollapsed?: boolean;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function PanelFrame({
  title,
  icon,
  headerRight,
  accentColor,
  collapsible = false,
  defaultCollapsed = false,
  children,
  className = "",
  bodyClassName = "",
}: PanelFrameProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const panelStyle = accentColor
    ? { borderLeftColor: accentColor, borderLeftWidth: 2 }
    : undefined;

  return (
    <div className={`panel ${className}`} style={panelStyle}>
      <div
        className="panel-header"
        onClick={collapsible ? () => setCollapsed((c) => !c) : undefined}
        style={collapsible ? { cursor: "pointer", userSelect: "none" } : undefined}
      >
        <div className="panel-header-title">
          {icon && <span>{icon}</span>}
          {title}
          {collapsible && (
            <span
              style={{
                marginLeft: 4,
                fontSize: 9,
                color: "var(--text-dim)",
                transition: "transform 0.15s",
                display: "inline-block",
                transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
              }}
            >
              ▾
            </span>
          )}
        </div>
        {headerRight && (
          <div className="panel-header-right">{headerRight}</div>
        )}
      </div>
      {!collapsed && (
        <div className={`panel-body ${bodyClassName}`}>{children}</div>
      )}
    </div>
  );
}
