import React, { useState, useRef, useEffect, useCallback } from "react";
import type { GraphTheme, MapItem, ProjectItem, MapStatus } from "../../types";

// ─── Flyout hook (click outside to close) ────────────────────

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose]);
}

// ─── Status dot color ────────────────────────────────────────

const statusColor: Record<MapStatus, string> = {
  active: "#30fd82",
  developing: "#ff9f44",
  monitoring: "#848798",
};

const statusLabel: Record<MapStatus, string> = {
  active: "ACTIVE",
  developing: "DEVELOPING",
  monitoring: "MONITORING",
};

// ─── Placeholder logo icon (circle with initial) ────────────────
const LogoPlaceholder = ({ size = 16, color, letter }: { size?: number; color: string; letter: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
    <rect x={0.5} y={0.5} width={15} height={15} rx={4} fill={`${color}20`} stroke={color} strokeWidth={0.8} />
    <text x={8} y={11.5} textAnchor="middle" fontSize={9} fontWeight={700} fill={color} fontFamily="inherit">{letter}</text>
  </svg>
);

// ─── RadiantHeader ───────────────────────────────────────────

export interface RadiantHeaderProps {
  theme: GraphTheme;
  maps?: MapItem[];
  projects?: ProjectItem[];
  activeMapId?: string;
  activeProjectId?: string;
  onNavigateMap?: (mapId: string) => void;
  onNavigateProject?: (projectId: string) => void;
  onSearch?: (query: string) => void;
}

export function RadiantHeader(props: RadiantHeaderProps) {
  const {
    theme, maps = [], projects = [],
    activeMapId, activeProjectId,
    onNavigateMap, onNavigateProject, onSearch,
  } = props;

  const [openFlyout, setOpenFlyout] = useState<"maps" | "projects" | "search" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const mapsRef = useRef<HTMLDivElement>(null);
  const projectsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const closeFlyout = useCallback(() => setOpenFlyout(null), []);
  useClickOutside(mapsRef, closeFlyout);
  useClickOutside(projectsRef, closeFlyout);
  useClickOutside(searchRef, closeFlyout);

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpenFlyout((prev) => prev === "search" ? null : "search");
      }
      if (e.key === "Escape") setOpenFlyout(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const navBtn = (active: boolean): React.CSSProperties => ({
    background: active ? `${theme.accent}18` : "transparent",
    border: "none",
    color: active ? theme.text : theme.textSecondary,
    fontSize: 14,
    fontWeight: active ? 600 : 400,
    padding: "4px 10px",
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: theme.fontFamily,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    transition: "background 0.2s ease",
    whiteSpace: "nowrap",
  });

  const flyoutStyle: React.CSSProperties = {
    position: "absolute",
    top: "100%",
    left: 0,
    marginTop: 4,
    width: 380,
    maxHeight: 460,
    overflowY: "auto",
    background: theme.bg,
    border: `1px solid ${theme.border}`,
    borderRadius: 10,
    padding: "8px 0",
    zIndex: 100,
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    fontFamily: theme.fontFamily,
  };

  // Group maps by status
  const mapsByStatus = maps.reduce<Record<MapStatus, MapItem[]>>((acc, m) => {
    (acc[m.status] = acc[m.status] || []).push(m);
    return acc;
  }, {} as Record<MapStatus, MapItem[]>);

  // Group projects by category
  const projectsByCategory = projects.reduce<Record<string, ProjectItem[]>>((acc, p) => {
    const cat = p.category || "Other";
    (acc[cat] = acc[cat] || []).push(p);
    return acc;
  }, {});

  // Search results
  const searchResults = searchQuery.trim()
    ? {
        maps: maps.filter((m) => m.title.toLowerCase().includes(searchQuery.toLowerCase())),
        projects: projects.filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase())),
      }
    : { maps: maps.slice(0, 3), projects: projects.slice(0, 3) };

  return (
    <div style={{
      height: 40,
      display: "flex",
      alignItems: "center",
      gap: 4,
      padding: "0 16px",
      borderBottom: `1px solid ${theme.border}`,
      background: theme.bg,
      fontFamily: theme.fontFamily,
      position: "relative",
      zIndex: 50,
    }}>
      {/* Logo */}
      <span style={{
        fontWeight: 800,
        fontSize: 13,
        letterSpacing: 2.5,
        color: theme.accent,
        fontFamily: theme.monoFontFamily,
        marginRight: 8,
        flexShrink: 0,
      }}>
        {"◈ RADIANT"}
      </span>

      {/* Prediction Map nav */}
      <div ref={mapsRef} style={{ position: "relative" }}>
        <button
          onClick={() => setOpenFlyout(openFlyout === "maps" ? null : "maps")}
          style={navBtn(openFlyout === "maps" || (!activeProjectId && !!activeMapId))}
        >
          <LogoPlaceholder size={14} color={theme.accent} letter="P" /> Prediction Map <span style={{ fontSize: 10, color: theme.muted }}>▾</span>
          {maps.length === 0 && <span style={{ fontSize: 9, color: theme.muted, fontStyle: "italic", marginLeft: 2 }}>soon</span>}
        </button>

        {openFlyout === "maps" && (
          <div style={flyoutStyle}>
            {/* Search inside flyout */}
            <div style={{ padding: "4px 12px 8px" }}>
              <input
                type="text"
                placeholder="Search maps..."
                autoFocus
                style={{
                  width: "100%",
                  background: theme.surface,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 6,
                  padding: "6px 10px",
                  color: theme.text,
                  fontSize: 12,
                  fontFamily: theme.fontFamily,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {maps.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: theme.muted, fontSize: 13 }}>Coming soon</div>
            ) : (["active", "developing", "monitoring"] as MapStatus[]).map((status) => {
              const group = mapsByStatus[status];
              if (!group || group.length === 0) return null;
              return (
                <React.Fragment key={status}>
                  <div style={{
                    padding: "8px 16px 4px",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    color: statusColor[status],
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: statusColor[status],
                      display: "inline-block",
                    }} />
                    {statusLabel[status]}
                  </div>
                  {group.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { onNavigateMap?.(m.id); setOpenFlyout(null); }}
                      style={{
                        display: "flex",
                        width: "100%",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 16px",
                        background: m.id === activeMapId ? `${theme.accent}12` : "transparent",
                        border: "none",
                        color: theme.text,
                        fontSize: 13,
                        fontFamily: theme.fontFamily,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <LogoPlaceholder size={18} color={theme.accent} letter={m.title.charAt(0)} />
                      <span style={{ flex: 1, fontWeight: m.id === activeMapId ? 600 : 400 }}>{m.title}</span>
                      <span style={{
                        fontSize: 10, color: theme.muted,
                        padding: "1px 5px", borderRadius: 4,
                        background: theme.surface,
                      }}>{m.nodeCount}</span>
                      {m.headlineProb != null && (
                        <span style={{
                          fontSize: 12, fontWeight: 600,
                          color: theme.accent,
                        }}>{m.headlineProb}%</span>
                      )}
                      {m.trend && m.trend !== "flat" && (
                        <span style={{
                          fontSize: 11,
                          color: m.trend === "up" ? theme.positive : theme.negative,
                        }}>{m.trend === "up" ? "↑" : "↓"}</span>
                      )}
                    </button>
                  ))}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* HistoryFi nav */}
      <div ref={projectsRef} style={{ position: "relative" }}>
        <button
          onClick={() => setOpenFlyout(openFlyout === "projects" ? null : "projects")}
          style={navBtn(openFlyout === "projects" || !!activeProjectId)}
        >
          <LogoPlaceholder size={14} color={theme.accent} letter="H" /> HistoryFi <span style={{ fontSize: 10, color: theme.muted }}>▾</span>
          {projects.length === 0 && <span style={{ fontSize: 9, color: theme.muted, fontStyle: "italic", marginLeft: 2 }}>soon</span>}
        </button>

        {openFlyout === "projects" && (
          <div style={flyoutStyle}>
            <div style={{ padding: "4px 12px 8px" }}>
              <input
                type="text"
                placeholder="Search projects..."
                autoFocus
                style={{
                  width: "100%",
                  background: theme.surface,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 6,
                  padding: "6px 10px",
                  color: theme.text,
                  fontSize: 12,
                  fontFamily: theme.fontFamily,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {projects.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: theme.muted, fontSize: 13 }}>Coming soon</div>
            ) : Object.entries(projectsByCategory).map(([cat, items]) => (
              <React.Fragment key={cat}>
                <div style={{
                  padding: "8px 16px 4px",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: theme.muted,
                }}>{cat}</div>
                {items.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { onNavigateProject?.(p.id); setOpenFlyout(null); }}
                    style={{
                      display: "flex",
                      width: "100%",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 16px",
                      background: p.id === activeProjectId ? `${theme.accent}12` : "transparent",
                      border: "none",
                      color: theme.text,
                      fontSize: 13,
                      fontFamily: theme.fontFamily,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <LogoPlaceholder size={18} color={theme.accent} letter={p.title.charAt(0)} />
                    <span style={{ flex: 1, fontWeight: p.id === activeProjectId ? 600 : 400 }}>{p.title}</span>
                    <span style={{ fontSize: 10, color: theme.muted }}>{p.eventCount} events</span>
                    {p.rating && (
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        color: theme.accent,
                        padding: "0 4px",
                        borderRadius: 3,
                        background: `${theme.accent}18`,
                      }}>{p.rating}</span>
                    )}
                    {p.price && (
                      <span style={{ fontSize: 12, color: theme.text, fontWeight: 500 }}>
                        {p.price}
                        {p.priceChange && (
                          <span style={{
                            fontSize: 10, marginLeft: 3,
                            color: p.priceChange.startsWith("+") ? theme.positive : theme.negative,
                          }}>{p.priceChange}</span>
                        )}
                      </span>
                    )}
                  </button>
                ))}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Command Palette trigger */}
      <div ref={searchRef} style={{ position: "relative" }}>
        <button
          onClick={() => setOpenFlyout(openFlyout === "search" ? null : "search")}
          style={{
            ...navBtn(openFlyout === "search"),
            gap: 4,
            padding: "4px 8px",
          }}
        >
          {"🔍"} <span style={{ fontSize: 10, color: theme.muted, fontFamily: theme.monoFontFamily }}>⌘K</span>
        </button>

        {openFlyout === "search" && (
          <div style={{ ...flyoutStyle, right: 0, left: "auto", width: 440 }}>
            <div style={{ padding: "4px 12px 8px" }}>
              <input
                type="text"
                placeholder="Search maps, projects, people..."
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    onSearch?.(searchQuery);
                  }
                }}
                style={{
                  width: "100%",
                  background: theme.surface,
                  border: `1px solid ${theme.accent}40`,
                  borderRadius: 6,
                  padding: "8px 12px",
                  color: theme.text,
                  fontSize: 13,
                  fontFamily: theme.fontFamily,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {searchResults.maps.length > 0 && (
              <>
                <div style={{
                  padding: "6px 16px 2px", fontSize: 10, fontWeight: 700,
                  letterSpacing: 1.5, textTransform: "uppercase", color: theme.muted,
                  display: "flex", alignItems: "center", gap: 5,
                }}><LogoPlaceholder size={12} color={theme.accent} letter="P" /> PREDICTION MAPS</div>
                {searchResults.maps.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { onNavigateMap?.(m.id); setOpenFlyout(null); setSearchQuery(""); }}
                    style={{
                      display: "flex", width: "100%", alignItems: "center", gap: 8,
                      padding: "6px 16px", background: "transparent", border: "none",
                      color: theme.text, fontSize: 13, fontFamily: theme.fontFamily,
                      cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <LogoPlaceholder size={16} color={theme.accent} letter={m.title.charAt(0)} />
                    <span style={{ flex: 1 }}>{m.title}</span>
                    <span style={{ fontSize: 10, color: theme.muted }}>{m.nodeCount} nodes</span>
                    <span style={{
                      fontSize: 9, padding: "1px 5px", borderRadius: 44,
                      background: `${statusColor[m.status]}18`,
                      color: statusColor[m.status],
                    }}>● {m.status}</span>
                  </button>
                ))}
              </>
            )}

            {searchResults.projects.length > 0 && (
              <>
                <div style={{
                  padding: "6px 16px 2px", fontSize: 10, fontWeight: 700,
                  letterSpacing: 1.5, textTransform: "uppercase", color: theme.muted,
                  marginTop: 4, display: "flex", alignItems: "center", gap: 5,
                }}><LogoPlaceholder size={12} color={theme.accent} letter="H" /> HISTORYFI</div>
                {searchResults.projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { onNavigateProject?.(p.id); setOpenFlyout(null); setSearchQuery(""); }}
                    style={{
                      display: "flex", width: "100%", alignItems: "center", gap: 8,
                      padding: "6px 16px", background: "transparent", border: "none",
                      color: theme.text, fontSize: 13, fontFamily: theme.fontFamily,
                      cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <LogoPlaceholder size={16} color={theme.accent} letter={p.title.charAt(0)} />
                    <span style={{ flex: 1 }}>{p.title}</span>
                    <span style={{ fontSize: 10, color: theme.muted }}>{p.eventCount} events</span>
                    {p.rating && <span style={{ fontSize: 10, color: theme.accent, fontWeight: 600 }}>{p.rating}</span>}
                  </button>
                ))}
              </>
            )}

            {searchResults.maps.length === 0 && searchResults.projects.length === 0 && searchQuery.trim() && (
              <div style={{ padding: "16px", textAlign: "center", color: theme.muted, fontSize: 12 }}>
                No results for "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Avatar placeholder */}
      <div style={{
        width: 26, height: 26, borderRadius: "50%",
        background: theme.surface, border: `1px solid ${theme.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, color: theme.muted, cursor: "pointer", flexShrink: 0,
        marginLeft: 4,
      }}>
        {"👤"}
      </div>
    </div>
  );
}
