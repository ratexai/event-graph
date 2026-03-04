/* ═══════════════════════════════════════════════════════════════
   AnchorModal — Full overlay for Polymarket anchor nodes
   Shows: question, probHistory sparkline, volume, causal factors
   table sorted by |influence|, YES/NO scenario branches
   ═══════════════════════════════════════════════════════════════ */

import React, { useMemo } from "react";
import type { NarrativeNode, GraphTheme, AnchorInfluenceLink, DualProbPoint, AnchorFactor } from "../../types";
import { Sparkline } from "../Shared/SvgPrimitives";

export interface AnchorModalProps {
  anchor: NarrativeNode;
  allNodes: NarrativeNode[];
  theme: GraphTheme;
  onClose: () => void;
  onNavigate: (id: string) => void;
}

const COMPLEMENT = "#901dea";

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
        fontFamily: theme.monoFontFamily,
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

/** Dual sparkline: two overlaid lines (PM purple, RX green) with date labels */
const DualSparkline: React.FC<{
  data: DualProbPoint[]; width: number; height: number;
}> = ({ data, width, height }) => {
  if (data.length < 2) return null;
  const allVals = data.flatMap((d) => [d.polymarket, d.rateX]);
  const max = Math.max(...allVals, 100);
  const min = Math.min(...allVals, 0);
  const range = max - min || 1;
  const xStep = width / Math.max(data.length - 1, 1);

  const toY = (v: number) => height - ((v - min) / range) * height;
  const pmPts = data.map((d, i) => `${i * xStep},${toY(d.polymarket)}`).join(" ");
  const rxPts = data.map((d, i) => `${i * xStep},${toY(d.rateX)}`).join(" ");

  // Find divergence point: where |pm - rx| first exceeds 3pp
  const divIdx = data.findIndex((d) => Math.abs(d.rateX - d.polymarket) > 3);

  return (
    <svg width={width} height={height + 16} style={{ overflow: "visible" }}>
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].filter((v) => v >= min && v <= max).map((v) => (
        <g key={v}>
          <line x1={0} y1={toY(v)} x2={width} y2={toY(v)} stroke="#ffffff08" strokeWidth={0.5} />
          <text x={-4} y={toY(v) + 3} textAnchor="end" fill="#ffffff30" fontSize={6}
            fontFamily="'JetBrains Mono','SF Mono',monospace">{v}%</text>
        </g>
      ))}
      {/* PM line */}
      <polyline points={pmPts} fill="none" stroke={COMPLEMENT} strokeWidth={1.5}
        strokeLinecap="round" opacity={0.7} />
      {/* RX line */}
      <polyline points={rxPts} fill="none" stroke="#30fd82" strokeWidth={2}
        strokeLinecap="round" opacity={0.9} />
      {/* Divergence annotation */}
      {divIdx > 0 && (
        <g transform={`translate(${divIdx * xStep},${toY(data[divIdx].rateX)})`}>
          <circle r={3} fill="#30fd82" opacity={0.8} />
          <text x={6} y={-4} fill="#30fd82" fontSize={6.5} fontWeight={700}
            fontFamily="'JetBrains Mono','SF Mono',monospace">divergence</text>
        </g>
      )}
      {/* Endpoint dots */}
      <circle cx={width} cy={toY(data[data.length - 1].polymarket)} r={3} fill={COMPLEMENT} />
      <circle cx={width} cy={toY(data[data.length - 1].rateX)} r={3} fill="#30fd82" />
      {/* Endpoint labels */}
      <text x={width + 6} y={toY(data[data.length - 1].polymarket) + 3} fill={COMPLEMENT}
        fontSize={7} fontWeight={700} fontFamily="'JetBrains Mono','SF Mono',monospace">
        PM {data[data.length - 1].polymarket}%
      </text>
      <text x={width + 6} y={toY(data[data.length - 1].rateX) + 3} fill="#30fd82"
        fontSize={7} fontWeight={700} fontFamily="'JetBrains Mono','SF Mono',monospace">
        RX {data[data.length - 1].rateX}%
      </text>
      {/* Date labels */}
      {data.filter((_, i) => i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2)).map((d, _, arr) => {
        const idx = data.indexOf(d);
        const label = d.date.replace(/^\d{4}-/, "").replace("-", "/");
        return (
          <text key={idx} x={idx * xStep} y={height + 12} textAnchor="middle"
            fill="#ffffff40" fontSize={6} fontFamily="'JetBrains Mono','SF Mono',monospace">
            {label}
          </text>
        );
      })}
    </svg>
  );
};

/** Waterfall chart showing factor decomposition */
const WaterfallChart: React.FC<{
  factors: AnchorFactor[];
  nodeMap: Map<string, NarrativeNode>;
  startProb: number;
  endProb: number;
  theme: GraphTheme;
}> = ({ factors, nodeMap, startProb, endProb, theme }) => {
  const barWidth = 520;
  const rowHeight = 22;
  const labelWidth = 180;

  // Sort factors: negative (biggest impact first), then positive
  const sorted = useMemo(() => {
    return [...factors].sort((a, b) => a.influence - b.influence);
  }, [factors]);

  // Build waterfall positions
  const rows = useMemo(() => {
    let running = startProb;
    const result: Array<{
      label: string; influence: number; from: number; to: number; color: string;
    }> = [];
    for (const f of sorted) {
      const next = running + f.influence;
      const node = nodeMap.get(f.nodeId);
      result.push({
        label: node?.label || f.nodeId,
        influence: f.influence,
        from: running,
        to: next,
        color: f.influence > 0 ? theme.positive : theme.negative,
      });
      running = next;
    }
    return result;
  }, [sorted, startProb, nodeMap, theme]);

  const allValues = [startProb, endProb, ...rows.flatMap((r) => [r.from, r.to])];
  const minVal = Math.min(...allValues) - 5;
  const maxVal = Math.max(...allValues) + 5;
  const range = maxVal - minVal || 1;
  const toX = (v: number) => ((v - minVal) / range) * barWidth;
  const totalHeight = (rows.length + 2) * rowHeight + 8;

  return (
    <svg width={barWidth + labelWidth + 60} height={totalHeight} style={{ overflow: "visible", fontSize: 8 }}>
      {/* Start bar */}
      <text x={0} y={12} fill={theme.muted} fontSize={8} fontWeight={700}
        fontFamily="'JetBrains Mono','SF Mono',monospace">Base probability</text>
      <rect x={labelWidth} y={2} width={toX(startProb)} height={14} rx={3} fill={COMPLEMENT} opacity={0.5} />
      <text x={labelWidth + toX(startProb) + 6} y={12} fill={theme.text} fontSize={8} fontWeight={700}
        fontFamily="'JetBrains Mono','SF Mono',monospace">{startProb}%</text>

      {/* Factor bars */}
      {rows.map((row, i) => {
        const y = (i + 1) * rowHeight + 2;
        const barFrom = toX(Math.min(row.from, row.to));
        const barTo = toX(Math.max(row.from, row.to));
        const barW = Math.max(barTo - barFrom, 1);
        const sign = row.influence > 0 ? "+" : "";
        return (
          <g key={i}>
            {/* Connector line from previous */}
            <line x1={labelWidth + toX(row.from)} y1={y - 4} x2={labelWidth + toX(row.from)} y2={y + 2}
              stroke={theme.border} strokeWidth={0.5} strokeDasharray="2 2" />
            {/* Label */}
            <text x={0} y={y + 10} fill={theme.textSecondary} fontSize={7.5}
              fontFamily="'JetBrains Mono','SF Mono',monospace" style={{ overflow: "hidden" }}>
              {row.label.length > 30 ? row.label.slice(0, 28) + "…" : row.label}
            </text>
            {/* Bar */}
            <rect x={labelWidth + barFrom} y={y} width={barW} height={14} rx={3}
              fill={row.color} opacity={0.6} />
            {/* Delta label */}
            <text x={labelWidth + barTo + 6} y={y + 10} fill={row.color} fontSize={8} fontWeight={800}
              fontFamily="'JetBrains Mono','SF Mono',monospace">
              {sign}{row.influence}pp → {row.to.toFixed(0)}%
            </text>
          </g>
        );
      })}

      {/* End bars: PM and RX */}
      {(() => {
        const lastY = (rows.length + 1) * rowHeight + 2;
        const pmProb = rows.length > 0 ? rows[rows.length - 1].to : startProb;
        return (
          <g>
            <line x1={labelWidth + toX(pmProb)} y1={lastY - 4} x2={labelWidth + toX(pmProb)} y2={lastY + 2}
              stroke={theme.border} strokeWidth={0.5} strokeDasharray="2 2" />
            <text x={0} y={lastY + 10} fill="#30fd82" fontSize={8} fontWeight={800}
              fontFamily="'JetBrains Mono','SF Mono',monospace">RateXAI estimate</text>
            <rect x={labelWidth} y={lastY} width={toX(endProb)} height={14} rx={3}
              fill="#30fd82" opacity={0.5} />
            <text x={labelWidth + toX(endProb) + 6} y={lastY + 10} fill="#30fd82" fontSize={9} fontWeight={800}
              fontFamily="'JetBrains Mono','SF Mono',monospace">{endProb}%</text>
          </g>
        );
      })()}
    </svg>
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

  const pmProb = anchor.marketProb;
  const rxProb = anchor.rateXProb;
  const alpha = anchor.alpha ?? (rxProb != null && pmProb != null ? rxProb - pmProb : undefined);
  const probText = pmProb != null ? `${pmProb}%` : "—";
  const rxText = rxProb != null ? `${rxProb}%` : null;
  const expiryLabel = anchor.resolvesAt
    ? new Date(anchor.resolvesAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "";

  // Alpha styling
  const alphaInfo = useMemo(() => {
    if (alpha == null) return null;
    const abs = Math.abs(alpha);
    let color = "#888"; let signal = "≈ in line"; let icon = "≈";
    if (abs > 10) { color = alpha > 0 ? "#30fd82" : "#ff495f"; signal = alpha > 0 ? "▲▲ major opportunity" : "▼▼ major overpriced"; icon = alpha > 0 ? "▲▲" : "▼▼"; }
    else if (abs > 5) { color = alpha > 0 ? "#30fd82" : "#ff495f"; signal = alpha > 0 ? "▲ underpriced" : "▼ overpriced"; icon = alpha > 0 ? "▲" : "▼"; }
    else if (abs > 2) { color = "#ff9f44"; signal = alpha > 0 ? "△ mild divergence" : "▽ mild divergence"; icon = alpha > 0 ? "△" : "▽"; }
    return { color, signal, icon, text: `${alpha > 0 ? "+" : ""}${alpha}pp` };
  }, [alpha]);

  // Aggregated influence
  let posTotal = 0;
  let negTotal = 0;
  for (const link of anchor.influenceLinks || []) {
    if (link.influence > 0) posTotal += link.influence;
    else negTotal += Math.abs(link.influence);
  }

  // Factors for waterfall chart (use anchor.factors if present, else derive from influenceLinks)
  const factors = useMemo<AnchorFactor[]>(() => {
    if (anchor.factors?.length) return anchor.factors;
    if (!anchor.influenceLinks?.length) return [];
    return anchor.influenceLinks.map((l) => ({
      nodeId: l.id,
      direction: l.influence > 0 ? "up" as const : "down" as const,
      influence: l.influence,
      mechanism: l.mechanism,
    }));
  }, [anchor.factors, anchor.influenceLinks]);

  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {/* Backdrop */}
      <div style={{
        position: "absolute", inset: 0, background: "#080a10e0",
        backdropFilter: "blur(8px)",
      }} onClick={onClose} />

      {/* Modal content */}
      <div style={{
        position: "relative", zIndex: 51, width: "min(680px, 90vw)",
        maxHeight: "85vh", overflowY: "auto",
        background: "#1d2732", border: `1px solid ${COMPLEMENT}40`,
        borderRadius: 12, padding: 28,
      }}>
        {/* Close button */}
        <button onClick={onClose} style={{
          position: "absolute", top: 12, right: 12, background: "none",
          border: "none", color: theme.muted, fontSize: 18, cursor: "pointer",
          fontFamily: "inherit", transition: "background-color 0.3s ease",
        }}>✕</button>

        {/* Header */}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "#1e1230", border: `2px solid ${COMPLEMENT}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, fontWeight: 800, color: COMPLEMENT,
            fontFamily: theme.monoFontFamily, flexShrink: 0,
          }}>
            📊
          </div>
          <div>
            <div style={{ fontSize: 9, color: COMPLEMENT, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>
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

        {/* Key metrics row — dual probability display */}
        <div style={{ display: "grid", gridTemplateColumns: rxText ? "2fr 1fr 1fr 1fr" : "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
          {/* Dual probability card */}
          <div style={{ padding: 12, borderRadius: 10, background: theme.card, border: `1px solid ${alphaInfo?.color ?? theme.border}30`, textAlign: "center" }}>
            <div style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Probability</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, alignItems: "baseline" }}>
              <div>
                <div style={{ fontSize: 8, color: theme.muted, marginBottom: 2 }}>PM</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: COMPLEMENT }}>{probText}</div>
              </div>
              {rxText && (
                <>
                  <div style={{ fontSize: 12, color: theme.muted }}>vs</div>
                  <div>
                    <div style={{ fontSize: 8, color: "#30fd82", marginBottom: 2, fontWeight: 700 }}>RateXAI</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#30fd82" }}>{rxText}</div>
                  </div>
                </>
              )}
            </div>
            {/* Alpha badge */}
            {alphaInfo && (
              <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 6, alignItems: "center" }}>
                <span style={{
                  fontSize: 11, fontWeight: 800, color: alphaInfo.color,
                  padding: "2px 10px", borderRadius: 6,
                  background: alphaInfo.color === "#30fd82" ? theme.positiveDim : alphaInfo.color === "#ff495f" ? theme.negativeDim : alphaInfo.color === "#ff9f44" ? theme.warningDim : theme.neutralDim,
                  fontFamily: theme.monoFontFamily,
                }}>
                  α {alphaInfo.text} {alphaInfo.icon}
                </span>
                <span style={{ fontSize: 8, color: alphaInfo.color }}>{alphaInfo.signal}</span>
              </div>
            )}
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
            <div style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>
              {anchor.rateXConfidence != null ? "Confidence" : "Liquidity"}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: theme.text }}>
              {anchor.rateXConfidence != null ? `${(anchor.rateXConfidence * 100).toFixed(0)}%` : anchor.liquidity || "—"}
            </div>
          </div>
        </div>

        {/* Dual Probability History Sparkline (PM vs RX) */}
        {anchor.dualProbHistory && anchor.dualProbHistory.length > 2 ? (
          <div style={{
            padding: 16, borderRadius: 12, background: theme.card,
            border: `1px solid ${theme.border}`, marginBottom: 24,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, textTransform: "uppercase" }}>
                Probability History
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 8 }}>
                <span style={{ color: COMPLEMENT }}>━ Polymarket</span>
                <span style={{ color: "#30fd82" }}>━ RateXAI</span>
              </div>
            </div>
            <DualSparkline data={anchor.dualProbHistory} width={580} height={60} />
          </div>
        ) : anchor.probHistory && anchor.probHistory.length > 2 ? (
          <div style={{
            padding: 16, borderRadius: 12, background: theme.card,
            border: `1px solid ${theme.border}`, marginBottom: 24,
          }}>
            <div style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
              Probability History
            </div>
            <Sparkline data={anchor.probHistory} color={COMPLEMENT} width={580} height={50} />
          </div>
        ) : null}

        {/* RateXAI Reasoning */}
        {anchor.rateXReasoning && (
          <div style={{
            padding: 14, borderRadius: 10, background: theme.card,
            border: `1px solid #30fd8230`, marginBottom: 24,
          }}>
            <div style={{ fontSize: 8, color: "#30fd82", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, fontWeight: 700 }}>
              RateXAI Analysis
            </div>
            <div style={{ fontSize: 10, color: theme.textSecondary, lineHeight: 1.6, fontStyle: "italic" }}>
              "{anchor.rateXReasoning}"
            </div>
          </div>
        )}

        {/* Factor Decomposition Waterfall */}
        {factors.length > 0 && (
          <div style={{
            padding: 16, borderRadius: 12, background: theme.card,
            border: `1px solid ${theme.border}`, marginBottom: 24,
          }}>
            <div style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
              Factor Decomposition (Waterfall)
            </div>
            <WaterfallChart factors={factors} nodeMap={nodeMap} startProb={45} endProb={rxProb ?? pmProb ?? 0} theme={theme} />
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
                background: "#1e1230", border: `1px solid ${COMPLEMENT}40`,
                color: COMPLEMENT, fontSize: 11, fontWeight: 700, textDecoration: "none",
                fontFamily: theme.monoFontFamily,
              }}>
              📊 View on Polymarket →
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
