/* ═══════════════════════════════════════════════════════════════
   AnchorModal — Full overlay for Polymarket anchor nodes
   Shows: question, probHistory sparkline, volume, causal factors
   table sorted by |influence|, YES/NO scenario branches
   ═══════════════════════════════════════════════════════════════ */

import React, { useMemo } from "react";
import type { NarrativeNode, GraphTheme, AnchorInfluenceLink } from "../../types";
import { Sparkline } from "../Shared/SvgPrimitives";

export interface AnchorModalProps {
  anchor: NarrativeNode;
  allNodes: NarrativeNode[];
  theme: GraphTheme;
  onClose: () => void;
  onNavigate: (id: string) => void;
}

const PURPLE = "#6366f1";

/** Causal factor row */
const InfluenceRow: React.FC<{
  link: AnchorInfluenceLink;
  factNode: NarrativeNode | undefined;
  theme: GraphTheme;
  onNavigate: (id: string) => void;
}> = ({ link, factNode, theme, onNavigate }) => {
  const color = link.influence > 0 ? theme.positive : theme.negative;
  const bg = link.influence > 0 ? theme.positiveDim : theme.negativeDim;
  return (
    <div
      style={{
        display: "flex", gap: 10, alignItems: "center", padding: "8px 10px",
        borderRadius: 8, background: bg, marginBottom: 4,
        cursor: factNode ? "pointer" : "default",
      }}
      onClick={factNode ? () => onNavigate(factNode.id) : undefined}
    >
      <div style={{
        minWidth: 44, textAlign: "right", fontSize: 13, fontWeight: 800, color,
        fontFamily: "'JetBrains Mono',monospace",
      }}>
        {link.influence > 0 ? "+" : ""}{link.influence}pp
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: theme.text }}>
          {factNode?.label || link.id}
        </div>
        <div style={{ fontSize: 8, color: theme.muted, marginTop: 1 }}>
          {link.mechanism}
        </div>
      </div>
      {/* Influence magnitude bar */}
      <div style={{ width: 40, height: 6, borderRadius: 3, background: theme.border, overflow: "hidden" }}>
        <div style={{
          width: `${Math.min(Math.abs(link.influence) / 30 * 100, 100)}%`,
          height: 6, borderRadius: 3, background: color,
        }} />
      </div>
    </div>
  );
};

/** Scenario branch card */
const ScenarioCard: React.FC<{
  scenario: NarrativeNode;
  theme: GraphTheme;
  onNavigate: (id: string) => void;
}> = ({ scenario, theme, onNavigate }) => {
  const isYes = scenario.outcome === "YES" || scenario.outcome === "PARTIAL";
  const color = isYes ? theme.positive : theme.negative;
  const bg = isYes ? theme.positiveDim : theme.negativeDim;
  const icon = isYes ? "✓" : "✗";

  return (
    <div
      style={{
        padding: 14, borderRadius: 10, background: bg,
        border: `1px solid ${color}30`, cursor: "pointer",
        flex: 1, minWidth: 140,
      }}
      onClick={() => onNavigate(scenario.id)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color }}>
          {icon} {scenario.outcome} ({scenario.outcomeProbability ?? "?"}%)
        </span>
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, color: theme.text, marginBottom: 6 }}>{scenario.label}</div>
      <div style={{ fontSize: 9, color: theme.textSecondary, lineHeight: 1.5, marginBottom: 8 }}>
        {scenario.desc && (scenario.desc.length > 120 ? scenario.desc.slice(0, 118) + "…" : scenario.desc)}
      </div>

      {/* Conditions */}
      {scenario.conditions && scenario.conditions.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 7.5, color: theme.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
            Conditions
          </div>
          {scenario.conditions.slice(0, 3).map((c, i) => (
            <div key={i} style={{ fontSize: 8, color: theme.textSecondary, marginBottom: 2 }}>• {c}</div>
          ))}
        </div>
      )}

      {/* Next events */}
      {scenario.nextEvents && scenario.nextEvents.length > 0 && (
        <div>
          <div style={{ fontSize: 7.5, color: theme.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
            Next Events
          </div>
          {scenario.nextEvents.slice(0, 3).map((ne, i) => (
            <div key={i} style={{ fontSize: 8, color: theme.textSecondary, marginBottom: 2 }}>→ {ne}</div>
          ))}
        </div>
      )}

      {/* Cui Bono mini */}
      {scenario.cuiBono && (
        <div style={{ marginTop: 8, borderTop: `1px solid ${theme.border}`, paddingTop: 6 }}>
          <div style={{ fontSize: 7.5, color: theme.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
            Cui Bono
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {scenario.cuiBono.winners.length > 0 && (
              <div>
                {scenario.cuiBono.winners.slice(0, 2).map((w, i) => (
                  <div key={i} style={{ fontSize: 8, color: theme.positive }}>+{w.name}</div>
                ))}
              </div>
            )}
            {scenario.cuiBono.losers.length > 0 && (
              <div>
                {scenario.cuiBono.losers.slice(0, 2).map((l, i) => (
                  <div key={i} style={{ fontSize: 8, color: theme.negative }}>−{l.name}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const AnchorModal: React.FC<AnchorModalProps> = ({
  anchor, allNodes, theme, onClose, onNavigate,
}) => {
  const nodeMap = useMemo(() => new Map(allNodes.map((n) => [n.id, n])), [allNodes]);

  // Sort influence links by |influence| descending
  const sortedInfluence = useMemo(() => {
    if (!anchor.influenceLinks) return [];
    return [...anchor.influenceLinks].sort((a, b) => Math.abs(b.influence) - Math.abs(a.influence));
  }, [anchor.influenceLinks]);

  // Find scenario nodes
  const scenarioNodes = useMemo(() => {
    if (!anchor.scenarios) return [];
    return anchor.scenarios.map((id) => nodeMap.get(id)).filter(Boolean) as NarrativeNode[];
  }, [anchor.scenarios, nodeMap]);

  const probText = anchor.marketProb != null ? `${anchor.marketProb}%` : "—";
  const expiryLabel = anchor.resolvesAt
    ? new Date(anchor.resolvesAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "";

  // Aggregated influence
  let posTotal = 0;
  let negTotal = 0;
  for (const link of anchor.influenceLinks || []) {
    if (link.influence > 0) posTotal += link.influence;
    else negTotal += Math.abs(link.influence);
  }

  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {/* Backdrop */}
      <div style={{
        position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
      }} onClick={onClose} />

      {/* Modal content */}
      <div style={{
        position: "relative", zIndex: 51, width: "min(680px, 90vw)",
        maxHeight: "85vh", overflowY: "auto",
        background: "rgba(8,10,16,0.97)", border: `1px solid ${PURPLE}40`,
        borderRadius: 16, padding: 28, boxShadow: "0 20px 80px rgba(99,102,241,0.2)",
      }}>
        {/* Close button */}
        <button onClick={onClose} style={{
          position: "absolute", top: 12, right: 12, background: "none",
          border: "none", color: theme.muted, fontSize: 18, cursor: "pointer",
          fontFamily: "inherit",
        }}>✕</button>

        {/* Header */}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "rgba(99,102,241,0.15)", border: `2px solid ${PURPLE}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, fontWeight: 800, color: PURPLE,
            fontFamily: "'JetBrains Mono',monospace", flexShrink: 0,
          }}>
            📊
          </div>
          <div>
            <div style={{ fontSize: 9, color: PURPLE, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>
              POLYMARKET ANCHOR
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: theme.text, marginBottom: 4 }}>
              {anchor.label}
            </div>
            {anchor.marketQuestion && (
              <div style={{ fontSize: 11, color: theme.textSecondary, fontStyle: "italic" }}>
                "{anchor.marketQuestion}"
              </div>
            )}
          </div>
        </div>

        {/* Key metrics row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
          <div style={{ padding: 12, borderRadius: 10, background: theme.card, border: `1px solid ${theme.border}`, textAlign: "center" }}>
            <div style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Current Prob</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: PURPLE }}>{probText}</div>
          </div>
          <div style={{ padding: 12, borderRadius: 10, background: theme.card, border: `1px solid ${theme.border}`, textAlign: "center" }}>
            <div style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Expiry</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: theme.text }}>{expiryLabel || "—"}</div>
          </div>
          <div style={{ padding: 12, borderRadius: 10, background: theme.card, border: `1px solid ${theme.border}`, textAlign: "center" }}>
            <div style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Volume</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: theme.text }}>{anchor.tradingVolume || "—"}</div>
          </div>
          <div style={{ padding: 12, borderRadius: 10, background: theme.card, border: `1px solid ${theme.border}`, textAlign: "center" }}>
            <div style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Liquidity</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: theme.text }}>{anchor.liquidity || "—"}</div>
          </div>
        </div>

        {/* Probability History Sparkline */}
        {anchor.probHistory && anchor.probHistory.length > 2 && (
          <div style={{
            padding: 16, borderRadius: 12, background: theme.card,
            border: `1px solid ${theme.border}`, marginBottom: 24,
          }}>
            <div style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
              Probability History
            </div>
            <Sparkline data={anchor.probHistory} color={PURPLE} width={580} height={50} />
          </div>
        )}

        {/* Aggregated influence bar */}
        {(posTotal > 0 || negTotal > 0) && (
          <div style={{
            padding: 14, borderRadius: 10, background: theme.card,
            border: `1px solid ${theme.border}`, marginBottom: 24,
          }}>
            <div style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
              Aggregated Pressure
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ height: 8, borderRadius: 4, background: theme.negativeDim, overflow: "hidden", marginBottom: 4 }}>
                  <div style={{ height: 8, borderRadius: 4, background: theme.negative, width: `${Math.min(negTotal / (posTotal + negTotal) * 100, 100)}%` }} />
                </div>
                <div style={{ fontSize: 9, color: theme.negative, fontWeight: 700 }}>−{negTotal.toFixed(0)}pp negative</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ height: 8, borderRadius: 4, background: theme.positiveDim, overflow: "hidden", marginBottom: 4 }}>
                  <div style={{ height: 8, borderRadius: 4, background: theme.positive, width: `${Math.min(posTotal / (posTotal + negTotal) * 100, 100)}%` }} />
                </div>
                <div style={{ fontSize: 9, color: theme.positive, fontWeight: 700 }}>+{posTotal.toFixed(0)}pp positive</div>
              </div>
            </div>
          </div>
        )}

        {/* Causal Factors Table */}
        {sortedInfluence.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
              Causal Factors ({sortedInfluence.length} events)
            </div>
            {sortedInfluence.map((link, i) => (
              <InfluenceRow
                key={link.id + i}
                link={link}
                factNode={nodeMap.get(link.id)}
                theme={theme}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}

        {/* Scenario Branches */}
        {scenarioNodes.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
              Scenario Branches
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {scenarioNodes.map((sc) => (
                <ScenarioCard key={sc.id} scenario={sc} theme={theme} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        )}

        {/* Polymarket link */}
        {anchor.marketUrl && (
          <div style={{ textAlign: "center", paddingTop: 8 }}>
            <a href={anchor.marketUrl} target="_blank" rel="noopener noreferrer"
              style={{
                display: "inline-flex", gap: 8, alignItems: "center",
                padding: "10px 24px", borderRadius: 10,
                background: "rgba(99,102,241,0.15)", border: `1px solid ${PURPLE}40`,
                color: PURPLE, fontSize: 11, fontWeight: 700, textDecoration: "none",
                fontFamily: "'JetBrains Mono',monospace",
              }}>
              📊 View on Polymarket →
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
