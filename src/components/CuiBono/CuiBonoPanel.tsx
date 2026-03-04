/* ═══════════════════════════════════════════════════════════════
   CuiBonoPanel — Right sidebar: "Who benefits / who loses"
   Shows aggregated state, corporate, and index impact analysis
   for narrative events.
   ═══════════════════════════════════════════════════════════════ */

import React, { useState, useMemo, useCallback } from "react";
import type { GraphTheme, NarrativeCuiBono, CuiBono, CuiBonoEntry, NarrativeNode } from "../../types";
import { isAnchorNode } from "../../utils";

// ─── Props ───────────────────────────────────────────────────────

export interface CuiBonoPanelProps {
  isOpen: boolean;
  narrativeCuiBono?: NarrativeCuiBono;
  selectedNodeCuiBono?: CuiBono;
  selectedNodeLabel?: string;
  theme: GraphTheme;
  topOffset: number;
  /** All narrative nodes — used to extract anchor nodes for Markets tab */
  narrativeNodes?: NarrativeNode[];
  /** Callback when user clicks a market card to highlight anchor on graph */
  onMarketSelect?: (anchorId: string) => void;
  /** Dynamic panel width — defaults to 300 */
  panelWidth?: number;
}

// ─── Tab Type ────────────────────────────────────────────────────

type TabKey = "states" | "corps" | "indices" | "markets";

interface TabDef {
  key: TabKey;
  label: string;
}

const TABS: TabDef[] = [
  { key: "states", label: "\u{1F30D} States" },
  { key: "corps", label: "\u{1F3E2} Corps" },
  { key: "indices", label: "\u{1F4CA} Indices" },
  { key: "markets", label: "\u{1F3AF} Prediction" },
];

// ─── Country Code to Flag Emoji ─────────────────────────────────

/** Convert a 2-letter ISO country code to a flag emoji.
 *  Works by shifting each letter into the Regional Indicator Symbol range. */
function countryFlag(code: string): string {
  const upper = code.toUpperCase();
  if (upper.length !== 2) return "\u{1F3F3}\u{FE0F}";
  const a = upper.charCodeAt(0) - 0x41 + 0x1f1e6;
  const b = upper.charCodeAt(1) - 0x41 + 0x1f1e6;
  return String.fromCodePoint(a, b);
}

/** Best-effort mapping of common country names to ISO 3166-1 alpha-2 codes. */
const COUNTRY_CODE_MAP: Record<string, string> = {
  "united states": "US", usa: "US", "us": "US", america: "US",
  "united kingdom": "GB", uk: "GB", britain: "GB", england: "GB",
  china: "CN", russia: "RU", germany: "DE", france: "FR",
  japan: "JP", india: "IN", brazil: "BR", canada: "CA",
  australia: "AU", italy: "IT", spain: "ES", mexico: "MX",
  "south korea": "KR", korea: "KR", indonesia: "ID",
  netherlands: "NL", turkey: "TR", "saudi arabia": "SA",
  switzerland: "CH", sweden: "SE", poland: "PL", belgium: "BE",
  norway: "NO", austria: "AT", israel: "IL", iran: "IR",
  "united arab emirates": "AE", uae: "AE", ukraine: "UA",
  taiwan: "TW", singapore: "SG", "hong kong": "HK",
  argentina: "AR", egypt: "EG", "south africa": "ZA",
  nigeria: "NG", pakistan: "PK", ireland: "IE", denmark: "DK",
  finland: "FI", portugal: "PT", greece: "GR", czech: "CZ",
  romania: "RO", vietnam: "VN", chile: "CL", colombia: "CO",
  thailand: "TH", malaysia: "MY", philippines: "PH", peru: "PE",
  "new zealand": "NZ", qatar: "QA", kuwait: "KW", iraq: "IQ",
  morocco: "MA", hungary: "HU", slovakia: "SK", croatia: "HR",
  "north korea": "KP", cuba: "CU", venezuela: "VE",
};

function getCountryCode(name: string): string {
  const lower = name.toLowerCase().trim();
  // Direct match
  if (COUNTRY_CODE_MAP[lower]) return COUNTRY_CODE_MAP[lower];
  // If the name itself looks like a 2-letter code, use it directly
  if (/^[A-Z]{2}$/i.test(name.trim())) return name.trim().toUpperCase();
  // Partial match
  for (const [key, code] of Object.entries(COUNTRY_CODE_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return code;
  }
  return "";
}

// ─── Sub-components ─────────────────────────────────────────────

/** Section header label (small caps muted text) */
const SectionLabel: React.FC<{ text: string; theme: GraphTheme }> = ({ text, theme }) => (
  <div style={{
    fontSize: 13, fontWeight: 700, color: theme.muted, letterSpacing: 2,
    textTransform: "uppercase", marginBottom: 10, marginTop: 18,
  }}>
    {text}
  </div>
);

/** Horizontal score bar used for country scores and index deltas */
const ScoreBar: React.FC<{
  value: number; maxAbsValue: number; theme: GraphTheme;
}> = ({ value, maxAbsValue, theme }) => {
  const pct = maxAbsValue > 0 ? (Math.abs(value) / maxAbsValue) * 100 : 0;
  const color = value >= 0 ? theme.positive : theme.negative;
  const bgColor = value >= 0 ? theme.positiveDim : theme.negativeDim;

  return (
    <div style={{
      flex: 1, height: 6, borderRadius: 3,
      background: bgColor, overflow: "hidden", minWidth: 40,
    }}>
      <div style={{
        height: 6, borderRadius: 3, background: color,
        width: `${Math.min(pct, 100)}%`,
        transition: "width 0.3s ease",
      }} />
    </div>
  );
};

/** Single country row in States tab */
const CountryRow: React.FC<{
  name: string; score: number; maxAbsScore: number; theme: GraphTheme;
}> = ({ name, score, maxAbsScore, theme }) => {
  const code = getCountryCode(name);
  const flag = code ? countryFlag(code) : "\u{1F3F3}\u{FE0F}";
  const color = score >= 0 ? theme.positive : theme.negative;
  const sign = score >= 0 ? "+" : "";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "6px 0",
      borderBottom: `1px solid ${theme.border}`,
    }}>
      <span style={{ fontSize: 18, width: 26, textAlign: "center", flexShrink: 0 }}>{flag}</span>
      <span style={{
        fontSize: 12, fontWeight: 600, color: theme.text,
        width: 80, flexShrink: 0, overflow: "hidden",
        textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {name}
      </span>
      <ScoreBar value={score} maxAbsValue={maxAbsScore} theme={theme} />
      <span style={{
        fontSize: 11, fontWeight: 700, color,
        fontFamily: theme.fontFamily,
        width: 48, textAlign: "right", flexShrink: 0,
      }}>
        {sign}{score.toFixed(1)}
      </span>
    </div>
  );
};

/** CuiBono entry row for per-event winners/losers */
const CuiBonoEntryRow: React.FC<{
  entry: CuiBonoEntry; variant: "winner" | "loser"; theme: GraphTheme;
}> = ({ entry, variant, theme }) => {
  const color = variant === "winner" ? theme.positive : theme.negative;
  const bgColor = variant === "winner" ? theme.positiveDim : theme.negativeDim;
  const sign = entry.delta >= 0 ? "+" : "";

  return (
    <div style={{
      padding: "8px 10px", borderRadius: 8,
      background: bgColor, marginBottom: 6,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: theme.text }}>{entry.name}</span>
        <span style={{
          fontSize: 11, fontWeight: 700, color,
          fontFamily: theme.fontFamily,
        }}>
          {sign}{entry.delta.toFixed(1)}
        </span>
      </div>
      {entry.code && (
        <span style={{ fontSize: 10, color: theme.muted }}>{entry.code}</span>
      )}
      {entry.reason && (
        <div style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4, lineHeight: 1.4 }}>
          {entry.reason}
        </div>
      )}
    </div>
  );
};

/** Company row for Corps tab */
const CompanyRow: React.FC<{
  entry: CuiBonoEntry; variant: "winner" | "loser"; theme: GraphTheme;
}> = ({ entry, variant, theme }) => {
  const color = variant === "winner" ? theme.positive : theme.negative;
  const sign = entry.delta >= 0 ? "+" : "";

  return (
    <div style={{
      padding: "8px 10px", borderRadius: 8,
      background: theme.card, border: `1px solid ${theme.border}`,
      marginBottom: 6,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
          <span style={{
            fontSize: 12, fontWeight: 700, color: theme.text,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {entry.name}
          </span>
          {entry.code && (
            <span style={{
              fontSize: 10, fontWeight: 600, color: theme.muted,
              padding: "1px 5px", borderRadius: 4,
              background: theme.bgAlt, flexShrink: 0,
            }}>
              {entry.code}
            </span>
          )}
        </div>
        <span style={{
          fontSize: 12, fontWeight: 800, color,
          fontFamily: theme.fontFamily, flexShrink: 0,
        }}>
          {sign}{entry.delta.toFixed(1)}%
        </span>
      </div>
      {entry.reason && (
        <div style={{ fontSize: 11, color: theme.textSecondary, lineHeight: 1.4, marginTop: 4 }}>
          {entry.reason}
        </div>
      )}
    </div>
  );
};

/** Index row with before/after bar */
const IndexRow: React.FC<{
  entry: CuiBonoEntry; maxAbsDelta: number; theme: GraphTheme;
}> = ({ entry, maxAbsDelta, theme }) => {
  const color = entry.delta >= 0 ? theme.positive : theme.negative;
  const bgColor = entry.delta >= 0 ? theme.positiveDim : theme.negativeDim;
  const sign = entry.delta >= 0 ? "+" : "";
  const pct = maxAbsDelta > 0 ? (Math.abs(entry.delta) / maxAbsDelta) * 100 : 0;

  return (
    <div style={{
      padding: "10px 10px", borderRadius: 8,
      background: theme.card, border: `1px solid ${theme.border}`,
      marginBottom: 6,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div>
          <span style={{ fontSize: 12, fontWeight: 700, color: theme.text }}>{entry.name}</span>
          {entry.code && (
            <span style={{
              fontSize: 10, color: theme.muted, marginLeft: 6,
              fontFamily: theme.fontFamily,
            }}>
              {entry.code}
            </span>
          )}
        </div>
        <span style={{
          fontSize: 12, fontWeight: 800, color,
          fontFamily: theme.fontFamily,
        }}>
          {sign}{entry.delta.toFixed(2)}%
        </span>
      </div>
      {/* Before/after bar */}
      <div style={{
        height: 8, borderRadius: 4, background: theme.bgAlt,
        overflow: "hidden", position: "relative",
      }}>
        {/* Base fill (before) — show 50% as baseline */}
        <div style={{
          position: "absolute", top: 0, left: 0,
          height: 8, borderRadius: 4,
          background: theme.border,
          width: "50%",
        }} />
        {/* Delta overlay */}
        <div style={{
          position: "absolute", top: 0,
          left: entry.delta >= 0 ? "50%" : `${50 - pct * 0.5}%`,
          height: 8,
          borderRadius: entry.delta >= 0 ? "0 4px 4px 0" : "4px 0 0 4px",
          background: color,
          width: `${Math.min(pct * 0.5, 50)}%`,
          transition: "width 0.3s ease, left 0.3s ease",
        }} />
      </div>
      {entry.reason && (
        <div style={{ fontSize: 11, color: theme.textSecondary, lineHeight: 1.4, marginTop: 6 }}>
          {entry.reason}
        </div>
      )}
    </div>
  );
};

// ─── Tab Content Components ─────────────────────────────────────

const StatesTab: React.FC<{
  narrativeCuiBono?: NarrativeCuiBono;
  selectedNodeCuiBono?: CuiBono;
  selectedNodeLabel?: string;
  theme: GraphTheme;
}> = ({ narrativeCuiBono, selectedNodeCuiBono, selectedNodeLabel, theme }) => {
  // Per-event section (when a node is selected)
  const perEventEntries = useMemo(() => {
    if (!selectedNodeCuiBono) return null;
    const winners = selectedNodeCuiBono.winners || [];
    const losers = selectedNodeCuiBono.losers || [];
    return { winners, losers };
  }, [selectedNodeCuiBono]);

  // Sorted country scores: winners (descending) then losers (ascending by magnitude)
  const { winners: countryWinners, losers: countryLosers } = useMemo(() => {
    if (!narrativeCuiBono?.countryScores) return { winners: [] as [string, number][], losers: [] as [string, number][] };
    const entries = Object.entries(narrativeCuiBono.countryScores);
    const w = entries.filter(([, s]) => s > 0).sort(([, a], [, b]) => b - a);
    const l = entries.filter(([, s]) => s < 0).sort(([, a], [, b]) => a - b); // most negative first
    return { winners: w, losers: l };
  }, [narrativeCuiBono]);

  const allCountries = useMemo(() => [...countryWinners, ...countryLosers], [countryWinners, countryLosers]);

  const maxAbsScore = useMemo(() => {
    if (allCountries.length === 0) return 1;
    return Math.max(...allCountries.map(([, s]) => Math.abs(s)), 0.1);
  }, [allCountries]);

  return (
    <div>
      {/* Per-event section */}
      {perEventEntries && (perEventEntries.winners.length > 0 || perEventEntries.losers.length > 0) && (
        <div style={{
          padding: 10, borderRadius: 8,
          background: theme.bgAlt, border: `1px solid ${theme.border}`,
          marginBottom: 14,
        }}>
          <div style={{
            fontSize: 9, fontWeight: 700, color: theme.accent,
            marginBottom: 8, fontFamily: theme.fontFamily,
          }}>
            Per-event: {selectedNodeLabel || "Selected Event"}
          </div>
          {perEventEntries.winners.length > 0 && (
            <>
              <div style={{ fontSize: 8, color: theme.positive, letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" }}>Winners</div>
              {perEventEntries.winners.map((e, i) => (
                <CuiBonoEntryRow key={`w-${i}`} entry={e} variant="winner" theme={theme} />
              ))}
            </>
          )}
          {perEventEntries.losers.length > 0 && (
            <>
              <div style={{ fontSize: 8, color: theme.negative, letterSpacing: 1, marginBottom: 4, marginTop: 8, textTransform: "uppercase" }}>Losers</div>
              {perEventEntries.losers.map((e, i) => (
                <CuiBonoEntryRow key={`l-${i}`} entry={e} variant="loser" theme={theme} />
              ))}
            </>
          )}
        </div>
      )}

      {/* Narrative-wide country scores — winners then losers */}
      {countryWinners.length > 0 && (
        <>
          <SectionLabel text="Benefiting Countries" theme={theme} />
          {countryWinners.map(([name, score]) => (
            <CountryRow key={name} name={name} score={score} maxAbsScore={maxAbsScore} theme={theme} />
          ))}
        </>
      )}
      {countryLosers.length > 0 && (
        <>
          <SectionLabel text="Losing Countries" theme={theme} />
          {countryLosers.map(([name, score]) => (
            <CountryRow key={name} name={name} score={score} maxAbsScore={maxAbsScore} theme={theme} />
          ))}
        </>
      )}
      {allCountries.length === 0 && (
        <div style={{ fontSize: 10, color: theme.muted, padding: "20px 0", textAlign: "center" }}>
          No country data available
        </div>
      )}
    </div>
  );
};

const CorpsTab: React.FC<{
  narrativeCuiBono?: NarrativeCuiBono;
  theme: GraphTheme;
}> = ({ narrativeCuiBono, theme }) => {
  const winners = narrativeCuiBono?.companyWinners || [];
  const losers = narrativeCuiBono?.companyLosers || [];

  return (
    <div>
      {/* Winners section */}
      <SectionLabel text="Winners" theme={theme} />
      {winners.length > 0 ? (
        winners.map((entry, i) => (
          <CompanyRow key={`w-${i}`} entry={entry} variant="winner" theme={theme} />
        ))
      ) : (
        <div style={{ fontSize: 10, color: theme.muted, padding: "12px 0", textAlign: "center" }}>
          No winners identified
        </div>
      )}

      {/* Losers section */}
      <SectionLabel text="Losers" theme={theme} />
      {losers.length > 0 ? (
        losers.map((entry, i) => (
          <CompanyRow key={`l-${i}`} entry={entry} variant="loser" theme={theme} />
        ))
      ) : (
        <div style={{ fontSize: 10, color: theme.muted, padding: "12px 0", textAlign: "center" }}>
          No losers identified
        </div>
      )}
    </div>
  );
};

const IndicesTab: React.FC<{
  narrativeCuiBono?: NarrativeCuiBono;
  theme: GraphTheme;
}> = ({ narrativeCuiBono, theme }) => {
  const rawIndices = narrativeCuiBono?.indexChanges || [];
  // Sort: positive (descending) then negative (ascending)
  const indices = useMemo(() => {
    const pos = rawIndices.filter((e) => e.delta >= 0).sort((a, b) => b.delta - a.delta);
    const neg = rawIndices.filter((e) => e.delta < 0).sort((a, b) => a.delta - b.delta);
    return [...pos, ...neg];
  }, [rawIndices]);
  const maxAbsDelta = useMemo(() => {
    if (indices.length === 0) return 1;
    return Math.max(...indices.map((e) => Math.abs(e.delta)), 0.1);
  }, [indices]);

  return (
    <div>
      <SectionLabel text="Index Changes" theme={theme} />
      {indices.length > 0 ? (
        indices.map((entry, i) => (
          <IndexRow key={i} entry={entry} maxAbsDelta={maxAbsDelta} theme={theme} />
        ))
      ) : (
        <div style={{ fontSize: 10, color: theme.muted, padding: "20px 0", textAlign: "center" }}>
          No index data available
        </div>
      )}
    </div>
  );
};

// ─── Alpha Helpers ──────────────────────────────────────────────

function alphaLevel(alpha: number): { signal: string; color: string; icon: string } {
  const abs = Math.abs(alpha);
  if (abs <= 2) return { signal: "≈ in line", color: "#848798", icon: "≈" };
  if (abs <= 5) return { signal: alpha > 0 ? "△ mild" : "▽ mild", color: "#ff9f44", icon: alpha > 0 ? "△" : "▽" };
  if (abs <= 10) return { signal: alpha > 0 ? "▲ underpriced" : "▼ overpriced", color: alpha > 0 ? "#30fd82" : "#ff495f", icon: alpha > 0 ? "▲" : "▼" };
  return { signal: alpha > 0 ? "▲▲ major opportunity" : "▼▼ major overpriced", color: alpha > 0 ? "#30fd82" : "#ff495f", icon: alpha > 0 ? "▲▲" : "▼▼" };
}

/** Dual probability bar (Polymarket vs RateXAI) */
const DualProbBar: React.FC<{
  label: string; pmProb: number; rxProb: number; alpha: number; theme: GraphTheme;
}> = ({ label, pmProb, rxProb, alpha, theme }) => {
  const al = alphaLevel(alpha);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: theme.text, marginBottom: 4 }}>{label}</div>
      {/* Polymarket bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
        <span style={{ fontSize: 9, color: theme.muted, width: 28, flexShrink: 0 }}>PM</span>
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: theme.bgAlt, overflow: "hidden" }}>
          <div style={{ height: 6, borderRadius: 3, background: "#901dea", width: `${pmProb}%`, transition: "width 0.3s" }} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: theme.muted, width: 32, textAlign: "right", fontFamily: theme.monoFontFamily }}>{pmProb}%</span>
      </div>
      {/* RateXAI bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
        <span style={{ fontSize: 9, color: "#30fd82", width: 28, flexShrink: 0, fontWeight: 700 }}>RX</span>
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: theme.bgAlt, overflow: "hidden" }}>
          <div style={{ height: 6, borderRadius: 3, background: "#30fd82", width: `${rxProb}%`, transition: "width 0.3s" }} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, color: "#30fd82", width: 32, textAlign: "right", fontFamily: theme.monoFontFamily }}>{rxProb}%</span>
      </div>
      {/* Alpha badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
        <span style={{ fontSize: 9, color: theme.muted, width: 28, flexShrink: 0 }}>Alpha</span>
        <span style={{
          fontSize: 10, fontWeight: 800, color: al.color,
          fontFamily: theme.monoFontFamily,
          padding: "1px 6px", borderRadius: 4,
          background: `${al.color}18`,
        }}>
          {alpha > 0 ? "+" : ""}{alpha}pp {al.icon}
        </span>
        <span style={{ fontSize: 9, color: al.color }}>{al.signal}</span>
      </div>
    </div>
  );
};

/** Single market card in the Markets tab */
const MarketCard: React.FC<{
  anchor: NarrativeNode; theme: GraphTheme; onClick: () => void;
}> = ({ anchor, theme, onClick }) => {
  const pmProb = anchor.marketProb ?? 0;
  const rxProb = anchor.rateXProb ?? pmProb;
  const alpha = anchor.alpha ?? (rxProb - pmProb);
  const al = alphaLevel(alpha);
  const expiryLabel = anchor.resolvesAt
    ? new Date(anchor.resolvesAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";
  const confidence = anchor.rateXConfidence ?? 0;
  const causalCount = anchor.influenceLinks?.length ?? 0;

  return (
    <div
      onClick={onClick}
      style={{
        padding: 12, borderRadius: 10,
        background: theme.card,
        marginBottom: 8, cursor: "pointer",
        transition: "background 0.2s",
      }}
    >
      {/* Question header */}
      <div style={{
        fontSize: 12, fontWeight: 700, color: theme.text,
        marginBottom: 10, lineHeight: 1.4,
        display: "flex", gap: 6, alignItems: "flex-start",
      }}>
        <span style={{ flexShrink: 0, fontSize: 15 }}>📊</span>
        <span>{anchor.marketQuestion || anchor.label}</span>
      </div>

      {/* YES outcome */}
      {anchor.outcomes ? (
        anchor.outcomes.map((oc) => (
          <DualProbBar
            key={oc.label}
            label={oc.label}
            pmProb={oc.polymarketProb}
            rxProb={oc.rateXProb}
            alpha={oc.alpha}
            theme={theme}
          />
        ))
      ) : (
        <DualProbBar label="YES" pmProb={pmProb} rxProb={rxProb} alpha={alpha} theme={theme} />
      )}

      {/* Footer: expiry, volume, confidence */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginTop: 8, paddingTop: 8, borderTop: `1px solid ${theme.border}`,
      }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {expiryLabel && (
            <span style={{ fontSize: 9, color: theme.muted }}>⏰ {expiryLabel}</span>
          )}
          {anchor.tradingVolume && (
            <span style={{ fontSize: 9, color: theme.muted }}>Vol: {anchor.tradingVolume}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{
            fontSize: 9, color: theme.muted,
            fontFamily: theme.monoFontFamily,
          }}>
            conf: {(confidence * 100).toFixed(0)}%
          </span>
          <span style={{ fontSize: 9, color: theme.muted }}>
            {causalCount} nodes
          </span>
        </div>
      </div>
    </div>
  );
};

/** Aggregated Alpha Signals section */
const AlphaSignals: React.FC<{
  anchors: NarrativeNode[]; theme: GraphTheme;
}> = ({ anchors, theme }) => {
  const sorted = useMemo(() => {
    return [...anchors]
      .map((a) => ({
        id: a.id,
        label: a.marketQuestion || a.label,
        pm: a.marketProb ?? 0,
        rx: a.rateXProb ?? (a.marketProb ?? 0),
        alpha: a.alpha ?? ((a.rateXProb ?? (a.marketProb ?? 0)) - (a.marketProb ?? 0)),
      }))
      .filter((a) => Math.abs(a.alpha) > 2)
      .sort((a, b) => Math.abs(b.alpha) - Math.abs(a.alpha));
  }, [anchors]);

  if (sorted.length === 0) return null;

  return (
    <div style={{
      padding: 10, borderRadius: 8, background: theme.bgAlt,
      border: `1px solid ${theme.border}`, marginBottom: 12,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: theme.accent,
        letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8,
        fontFamily: theme.monoFontFamily,
      }}>
        🎯 Alpha Signals
      </div>
      {sorted.map((s) => {
        const al = alphaLevel(s.alpha);
        return (
          <div key={s.id} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "4px 0",
            borderBottom: `1px solid ${theme.border}`,
            fontSize: 10, fontFamily: theme.monoFontFamily,
          }}>
            <span style={{ color: al.color, fontWeight: 800, width: 16 }}>{al.icon}</span>
            <span style={{ flex: 1, color: theme.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10 }}>
              {s.label.replace(/^PM:\s*/, "").slice(0, 35)}
            </span>
            <span style={{ color: theme.muted, flexShrink: 0 }}>PM {s.pm}%</span>
            <span style={{ color: "#30fd82", fontWeight: 700, flexShrink: 0 }}>RX {s.rx}%</span>
            <span style={{ color: al.color, fontWeight: 800, flexShrink: 0 }}>
              {s.alpha > 0 ? "+" : ""}{s.alpha}pp
            </span>
          </div>
        );
      })}
    </div>
  );
};

const MarketsTab: React.FC<{
  narrativeNodes?: NarrativeNode[];
  theme: GraphTheme;
  onMarketSelect?: (anchorId: string) => void;
}> = ({ narrativeNodes, theme, onMarketSelect }) => {
  const anchors = useMemo(() => {
    if (!narrativeNodes) return [];
    return narrativeNodes.filter(isAnchorNode);
  }, [narrativeNodes]);

  if (anchors.length === 0) {
    return (
      <div style={{ fontSize: 10, color: theme.muted, padding: "20px 0", textAlign: "center" }}>
        No predictions available
      </div>
    );
  }

  return (
    <div>
      <AlphaSignals anchors={anchors} theme={theme} />
      <SectionLabel text={`Active Predictions (${anchors.length})`} theme={theme} />
      {anchors.map((anchor) => (
        <MarketCard
          key={anchor.id}
          anchor={anchor}
          theme={theme}
          onClick={() => onMarketSelect?.(anchor.id)}
        />
      ))}
    </div>
  );
};

// ─── Main Panel ─────────────────────────────────────────────────

const PANEL_WIDTH = 300;

const CuiBonoPanel: React.FC<CuiBonoPanelProps> = ({
  isOpen,
  narrativeCuiBono,
  selectedNodeCuiBono,
  selectedNodeLabel,
  theme,
  topOffset,
  narrativeNodes,
  onMarketSelect,
  panelWidth: externalWidth,
}) => {
  const PANEL_W = externalWidth ?? PANEL_WIDTH;
  const [activeTab, setActiveTab] = useState<TabKey>("markets");

  const handleTabClick = useCallback((key: TabKey) => {
    setActiveTab(key);
  }, []);

  return (
    <div style={{
      position: "absolute",
      top: topOffset,
      right: 0,
      width: PANEL_W,
      bottom: 0,
      background: "rgba(29,39,50,0.97)",
      borderLeft: `1px solid ${theme.border}`,
      backdropFilter: "blur(20px)",
      zIndex: 24,
      transform: isOpen ? "translateX(0)" : `translateX(${PANEL_W}px)`,
      transition: "transform 0.3s cubic-bezier(.4,0,.2,1)",
      display: "flex",
      flexDirection: "column",
      fontFamily: theme.fontFamily,
      color: theme.text,
      overflow: "hidden",
    }}>
      {/* ── Tab bar ──────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        borderBottom: `1px solid ${theme.border}`,
        background: theme.surface,
        flexShrink: 0,
      }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab.key)}
              style={{
                flex: 1,
                padding: "10px 4px",
                background: isActive ? theme.bgAlt : "transparent",
                border: "none",
                borderBottom: isActive ? `2px solid ${theme.accent}` : "2px solid transparent",
                color: isActive ? theme.text : theme.muted,
                fontSize: 12,
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                fontFamily: theme.fontFamily,
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Panel header ─────────────────────────────────────── */}
      <div style={{
        padding: "10px 14px 6px",
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 13, fontWeight: 800, color: theme.text,
          letterSpacing: 0.5,
        }}>
          Cui Bono
        </div>
        <div style={{
          fontSize: 10, color: theme.muted, marginTop: 2,
        }}>
          Who benefits / who loses
        </div>
      </div>

      {/* ── Scrollable content area ──────────────────────────── */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        padding: "0 14px 20px",
      }}>
        {activeTab === "states" && (
          <StatesTab
            narrativeCuiBono={narrativeCuiBono}
            selectedNodeCuiBono={selectedNodeCuiBono}
            selectedNodeLabel={selectedNodeLabel}
            theme={theme}
          />
        )}
        {activeTab === "corps" && (
          <CorpsTab
            narrativeCuiBono={narrativeCuiBono}
            theme={theme}
          />
        )}
        {activeTab === "indices" && (
          <IndicesTab
            narrativeCuiBono={narrativeCuiBono}
            theme={theme}
          />
        )}
        {activeTab === "markets" && (
          <MarketsTab
            narrativeNodes={narrativeNodes}
            theme={theme}
            onMarketSelect={onMarketSelect}
          />
        )}
      </div>
    </div>
  );
};

export default React.memo(CuiBonoPanel);
export { CuiBonoPanel };
