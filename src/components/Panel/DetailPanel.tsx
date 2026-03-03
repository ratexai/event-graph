/* ═══════════════════════════════════════════════════════════════
   DetailPanel — Right-side panel for event/KOL node details
   ═══════════════════════════════════════════════════════════════ */

import React, { useMemo } from "react";
import type { EventNode, KolNode, NarrativeNode, GraphTheme, Sentiment, CuiBono } from "../../types";
import { getEventTypeStyle, getKolTierStyle, getNarrativeCategoryStyle, getNarrativeSignalStyle, EVENT_TYPE_META, KOL_TIER_META, PLATFORM_META, NARRATIVE_CATEGORY_META, NARRATIVE_SIGNAL_META } from "../../styles/theme";
import { formatNumber, sentimentLabel, sentimentArrow } from "../../utils";
import { Sparkline } from "../Shared/SvgPrimitives";

// ─── Helpers ────────────────────────────────────────────────────

/** Generate deterministic sparkline placeholder from a seed value.
 *  Replace with real engHistory / mention trend from API when available. */
function mockSparkData(base: number, len = 14): number[] {
  let seed = Math.abs(base * 1000) | 0;
  return Array.from({ length: len }, (_, i) => {
    seed = (seed * 16807 + 7) % 2147483647; // LCG PRNG
    const pseudo = (seed % 1000) / 1000;
    return Math.max(5, base * (0.2 + pseudo * 0.8) + (i / len) * base * 0.3);
  });
}

// ─── Metric Card ────────────────────────────────────────────────

const MetricCard: React.FC<{
  label: string; value: string | number; color: string;
  maxVal?: number; currentVal?: number; theme: GraphTheme;
}> = ({ label, value, color, maxVal, currentVal, theme }) => (
  <div style={{ padding: 12, borderRadius: 10, background: theme.card, border: `1px solid ${theme.border}` }}>
    <div style={{ fontSize: 7.5, color: theme.muted, letterSpacing: 1.5, marginBottom: 5, textTransform: "uppercase" }}>{label}</div>
    <div style={{ fontSize: 16, fontWeight: 800, color }}>{typeof value === "number" && value > 999 ? formatNumber(value) : value}</div>
    {maxVal != null && currentVal != null && (
      <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: theme.border }}>
        <div style={{ height: 3, borderRadius: 2, background: color, width: `${(currentVal / maxVal) * 100}%` }} />
      </div>
    )}
  </div>
);

// ─── Sentiment Badge ────────────────────────────────────────────

const SentimentBadge: React.FC<{ sentiment: Sentiment; theme: GraphTheme; full?: boolean }> = ({ sentiment, theme, full = false }) => {
  const color = sentiment === "pos" ? theme.positive : sentiment === "neg" ? theme.negative : theme.neutral;
  const bg = sentiment === "pos" ? theme.positiveDim : sentiment === "neg" ? theme.negativeDim : theme.neutralDim;
  return (
    <div style={{ padding: "4px 12px", borderRadius: 20, background: bg, fontSize: 10, fontWeight: 700, color }}>
      {sentimentArrow(sentiment)} {full ? sentimentLabel(sentiment) : sentiment === "pos" ? "Pos" : sentiment === "neg" ? "Neg" : "Neu"}
    </div>
  );
};

// ─── KOL/Event Link Item ────────────────────────────────────────

const LinkItem: React.FC<{
  avatar: string; name: string; subtitle: string;
  badgeLabel?: string; badgeColor?: string; badgeBg?: string;
  theme: GraphTheme; onClick?: () => void;
}> = ({ avatar, name, subtitle, badgeLabel, badgeColor, badgeBg, theme, onClick }) => (
  <div style={{
    display: "flex", gap: 10, alignItems: "center", padding: "8px 0",
    borderBottom: `1px solid ${theme.border}`, cursor: onClick ? "pointer" : "default",
  }} onClick={onClick}>
    <div style={{
      width: 24, height: 24, borderRadius: 8, background: badgeBg || theme.bgAlt,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 9, fontWeight: 800, color: badgeColor || theme.muted, fontFamily: "'JetBrains Mono',monospace",
    }}>{avatar}</div>
    <div>
      <div style={{ fontSize: 10, fontWeight: 600 }}>{name}</div>
      <div style={{ fontSize: 8, color: theme.muted }}>{subtitle}</div>
    </div>
    {badgeLabel && (
      <div style={{
        marginLeft: "auto", padding: "1px 6px", borderRadius: 8,
        background: badgeBg || theme.bgAlt, fontSize: 8, fontWeight: 700, color: badgeColor || theme.muted,
      }}>{badgeLabel}</div>
    )}
  </div>
);

// ─── Event Detail ───────────────────────────────────────────────

interface EventDetailProps {
  event: EventNode;
  allEvents: EventNode[];
  timeSlotLabels: string[];
  theme: GraphTheme;
  onNavigate: (id: string) => void;
}

const EventDetail: React.FC<EventDetailProps> = ({ event, allEvents, timeSlotLabels, theme, onNavigate }) => {
  const style = getEventTypeStyle(theme, event.type);
  const meta = EVENT_TYPE_META[event.type];
  const dayLabel = timeSlotLabels[event.col] || `Col ${event.col}`;

  // Build lookup map for O(1) access
  const eventMap = useMemo(() => new Map(allEvents.map((e) => [e.id, e])), [allEvents]);

  // Upstream chain
  const upstream: EventNode[] = [];
  const visited = new Set<string>();
  const trace = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    const ev = eventMap.get(id);
    if (!ev) return;
    for (const fid of ev.from || []) trace(fid);
    if (ev.id !== event.id) upstream.push(ev);
  };
  trace(event.id);

  // Downstream
  const downstream = allEvents.filter((e) => e.from?.includes(event.id));

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 20 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, background: style.bg,
          border: `1px solid ${style.color}30`, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 24, flexShrink: 0,
        }}>{meta?.icon || "●"}</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{event.label}</div>
          <div style={{ fontSize: 10, color: style.color, fontWeight: 600, marginTop: 2 }}>{meta?.label} · {dayLabel}</div>
        </div>
      </div>

      {/* Description */}
      <p style={{ fontSize: 11, color: theme.textSecondary, lineHeight: 1.6, margin: "0 0 20px" }}>{event.desc}</p>

      {/* Badges */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        <SentimentBadge sentiment={event.sentiment} theme={theme} full />
        {event.extra && (
          <div style={{ padding: "4px 12px", borderRadius: 20, background: style.bg, fontSize: 10, fontWeight: 600, color: style.color }}>{event.extra}</div>
        )}
      </div>

      {/* Metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        <MetricCard label="Impact" value={event.impact} color={style.color} maxVal={100} currentVal={event.impact} theme={theme} />
        <MetricCard label="Mentions" value={event.mentions} color={theme.accent} theme={theme} />
        <MetricCard label="Weight" value={`${(event.weight * 100).toFixed(0)}%`} color={theme.text} theme={theme} />
        <MetricCard label="Timeline" value={dayLabel} color={theme.muted} theme={theme} />
      </div>

      {/* Sparkline */}
      <div style={{ padding: 14, borderRadius: 10, background: theme.card, border: `1px solid ${theme.border}`, marginBottom: 24 }}>
        <div style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, marginBottom: 8, textTransform: "uppercase" }}>Mention Trend</div>
        <Sparkline data={mockSparkData(event.impact)} color={style.color} width={280} height={40} />
      </div>

      {/* Upstream chain */}
      {upstream.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, marginBottom: 10, textTransform: "uppercase" }}>Event Chain (upstream)</div>
          {upstream.map((ev) => {
            const evStyle = getEventTypeStyle(theme, ev.type);
            const evMeta = EVENT_TYPE_META[ev.type];
            return (
              <LinkItem key={ev.id} avatar={evMeta?.icon || "●"} name={ev.label}
                subtitle={`${evMeta?.label} · Impact ${ev.impact}`}
                badgeColor={evStyle.color} badgeBg={evStyle.bg}
                theme={theme} onClick={() => onNavigate(ev.id)} />
            );
          })}
        </div>
      )}

      {/* Downstream */}
      {downstream.length > 0 && (
        <div>
          <div style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, marginBottom: 10, textTransform: "uppercase" }}>Led to →</div>
          {downstream.map((ev) => {
            const evStyle = getEventTypeStyle(theme, ev.type);
            const evMeta = EVENT_TYPE_META[ev.type];
            return (
              <LinkItem key={ev.id} avatar={evMeta?.icon || "●"} name={ev.label}
                subtitle={`${evMeta?.label} · Impact ${ev.impact}`}
                badgeColor={evStyle.color} badgeBg={evStyle.bg}
                theme={theme} onClick={() => onNavigate(ev.id)} />
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── KOL Detail ─────────────────────────────────────────────────

interface KolDetailProps {
  kol: KolNode;
  allKols: KolNode[];
  timeSlotLabels: string[];
  theme: GraphTheme;
  onNavigate: (id: string) => void;
}

const KolDetail: React.FC<KolDetailProps> = ({ kol, allKols, timeSlotLabels, theme, onNavigate }) => {
  const tierStyle = getKolTierStyle(theme, kol.tier);
  const tierMeta = KOL_TIER_META[kol.tier];
  const platMeta = PLATFORM_META[kol.platform] || PLATFORM_META.other;

  const kolMap = useMemo(() => new Map(allKols.map((k) => [k.id, k])), [allKols]);
  const influencedKols = (kol.influence || []).map((id) => kolMap.get(id)).filter(Boolean) as KolNode[];
  const influencedBy = (kol.from || []).map((id) => kolMap.get(id)).filter(Boolean) as KolNode[];

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 20 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, background: tierStyle.bg,
          border: `2px solid ${tierStyle.color}40`, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 20, fontWeight: 800, color: tierStyle.color,
          fontFamily: "'JetBrains Mono',monospace", flexShrink: 0,
        }}>{kol.avatar}</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{kol.name}</div>
          <div style={{ fontSize: 10, color: theme.textSecondary, marginTop: 2 }}>{kol.handle}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <div style={{ padding: "2px 8px", borderRadius: 10, background: tierStyle.bg, fontSize: 9, fontWeight: 700, color: tierStyle.color }}>{tierMeta.label}</div>
            <div style={{ padding: "2px 8px", borderRadius: 10, background: theme.accentDim, fontSize: 9, color: theme.accent }}>{platMeta.icon} {platMeta.label}</div>
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <MetricCard label="Followers" value={formatNumber(kol.followers)} color={tierStyle.color} theme={theme} />
        <MetricCard label="Eng. Rate" value={kol.engRate.toFixed(1) + "%"} color={theme.accent} theme={theme} />
        <MetricCard label="Reach" value={formatNumber(kol.reach)} color={getKolTierStyle(theme, "mega").color} theme={theme} />
        <MetricCard label="Mentions" value={kol.mentions} color={getKolTierStyle(theme, "macro").color} theme={theme} />
        <MetricCard label="Total Views" value={kol.views > 0 ? formatNumber(kol.views) : "N/A"} color={getKolTierStyle(theme, "mid").color} theme={theme} />
        <MetricCard label="Sentiment" value={sentimentLabel(kol.sentiment)} color={kol.sentiment === "pos" ? theme.positive : kol.sentiment === "neg" ? theme.negative : theme.neutral} theme={theme} />
      </div>

      {/* Engagement sparkline */}
      <div style={{ padding: 14, borderRadius: 10, background: theme.card, border: `1px solid ${theme.border}`, marginBottom: 20 }}>
        <div style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, marginBottom: 8, textTransform: "uppercase" }}>Engagement Trend</div>
        <Sparkline data={kol.engHistory || mockSparkData(kol.engRate * 10)} color={tierStyle.color} width={280} height={40} />
      </div>

      {/* Posts timeline */}
      {kol.posts.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, marginBottom: 10, textTransform: "uppercase" }}>Posts Timeline</div>
          {kol.posts.map((p, i) => (
            <div key={i} style={{ padding: 12, borderRadius: 10, background: theme.card, border: `1px solid ${theme.border}`, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 9, color: theme.muted }}>{timeSlotLabels[p.day] || `Day ${p.day + 1}`} · {p.type}</span>
                <SentimentBadge sentiment={p.sentiment} theme={theme} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>{p.title}</div>
              <div style={{ display: "flex", gap: 12, fontSize: 9, color: theme.textSecondary }}>
                {p.views > 0 && <span>▶ {formatNumber(p.views)} views</span>}
                <span>♥ {formatNumber(p.likes)} likes</span>
                {p.comments != null && <span>💬 {formatNumber(p.comments)}</span>}
                {p.shares != null && <span>↗ {formatNumber(p.shares)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Influenced KOLs */}
      {influencedKols.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, marginBottom: 10, textTransform: "uppercase" }}>Influenced KOLs →</div>
          {influencedKols.map((ik) => {
            const ikStyle = getKolTierStyle(theme, ik.tier);
            return (
              <LinkItem key={ik.id} avatar={ik.avatar} name={ik.name}
                subtitle={`${formatNumber(ik.followers)} · ${ik.platform}`}
                badgeLabel={KOL_TIER_META[ik.tier].label} badgeColor={ikStyle.color} badgeBg={ikStyle.bg}
                theme={theme} onClick={() => onNavigate(ik.id)} />
            );
          })}
        </div>
      )}

      {/* Influenced by */}
      {influencedBy.length > 0 && (
        <div>
          <div style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, marginBottom: 10, textTransform: "uppercase" }}>← Influenced By</div>
          {influencedBy.map((fk) => {
            const fkStyle = getKolTierStyle(theme, fk.tier);
            return (
              <LinkItem key={fk.id} avatar={fk.avatar} name={fk.name}
                subtitle={`${formatNumber(fk.followers)} · ${fk.platform}`}
                badgeLabel={KOL_TIER_META[fk.tier].label} badgeColor={fkStyle.color} badgeBg={fkStyle.bg}
                theme={theme} onClick={() => onNavigate(fk.id)} />
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Cui Bono Section (per-event) ────────────────────────────────

const CuiBonoSection: React.FC<{ cuiBono: CuiBono; theme: GraphTheme }> = ({ cuiBono, theme }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, marginBottom: 10, textTransform: "uppercase" }}>
      {"\uD83D\uDD75\uFE0F"} Cui Bono
    </div>
    {cuiBono.winners.length > 0 && (
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: theme.positive, fontWeight: 700, marginBottom: 6 }}>Winners</div>
        {cuiBono.winners.map((e, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px", borderRadius: 6, background: theme.positiveDim, marginBottom: 3 }}>
            <span style={{ fontSize: 10, color: theme.text }}>{e.name}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: theme.positive }}>+{e.delta}</span>
          </div>
        ))}
      </div>
    )}
    {cuiBono.losers.length > 0 && (
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: theme.negative, fontWeight: 700, marginBottom: 6 }}>Losers</div>
        {cuiBono.losers.map((e, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px", borderRadius: 6, background: theme.negativeDim, marginBottom: 3 }}>
            <span style={{ fontSize: 10, color: theme.text }}>{e.name}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: theme.negative }}>{e.delta}</span>
          </div>
        ))}
      </div>
    )}
    {cuiBono.indices && cuiBono.indices.length > 0 && (
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: theme.accent, fontWeight: 700, marginBottom: 6 }}>Indices</div>
        {cuiBono.indices.map((e, i) => {
          const color = e.delta >= 0 ? theme.positive : theme.negative;
          return (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px", borderRadius: 6, background: theme.card, border: `1px solid ${theme.border}`, marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: theme.text }}>{e.name} <span style={{ color: theme.muted, fontSize: 8 }}>{e.code}</span></span>
              <span style={{ fontSize: 10, fontWeight: 700, color }}>{e.delta > 0 ? "+" : ""}{e.delta}%</span>
            </div>
          );
        })}
      </div>
    )}
    {cuiBono.hiddenMotives && cuiBono.hiddenMotives.length > 0 && (
      <div style={{ padding: 10, borderRadius: 8, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
        <div style={{ fontSize: 9, color: "#fbbf24", fontWeight: 700, marginBottom: 4 }}>{"\uD83D\uDD75\uFE0F"} Hidden Motives</div>
        {cuiBono.hiddenMotives.map((m, i) => (
          <div key={i} style={{ fontSize: 9, color: theme.textSecondary, lineHeight: 1.5, marginBottom: 2 }}>• {m}</div>
        ))}
      </div>
    )}
  </div>
);

// ─── Narrative Detail ────────────────────────────────────────────

interface NarrativeDetailProps {
  node: NarrativeNode;
  allNodes: NarrativeNode[];
  timeSlotLabels: string[];
  theme: GraphTheme;
  onNavigate: (id: string) => void;
}

const NarrativeDetail: React.FC<NarrativeDetailProps> = ({ node, allNodes, timeSlotLabels, theme, onNavigate }) => {
  const catStyle = getNarrativeCategoryStyle(theme, node.category);
  const sigStyle = getNarrativeSignalStyle(theme, node.signal);
  const catMeta = NARRATIVE_CATEGORY_META[node.category];
  const sigMeta = NARRATIVE_SIGNAL_META[node.signal];
  const dayLabel = timeSlotLabels[node.col] || `Col ${node.col}`;
  const deltaColor = node.oddsDelta > 0 ? theme.positive : node.oddsDelta < 0 ? theme.negative : theme.neutral;
  const deltaText = node.oddsDelta > 0 ? `+${node.oddsDelta.toFixed(1)}pp` : `${node.oddsDelta.toFixed(1)}pp`;

  const nodeMap = useMemo(() => new Map(allNodes.map((n) => [n.id, n])), [allNodes]);

  // Upstream chain
  const upstream: NarrativeNode[] = [];
  const visited = new Set<string>();
  const trace = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    const ev = nodeMap.get(id);
    if (!ev) return;
    for (const fid of ev.from || []) trace(fid);
    if (ev.id !== node.id) upstream.push(ev);
  };
  trace(node.id);

  const downstream = allNodes.filter((n) => n.from?.includes(node.id));

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 20 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, background: catStyle.bg,
          border: `1px solid ${catStyle.color}30`, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 24, flexShrink: 0,
        }}>{catMeta?.icon || "●"}</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{node.label}</div>
          <div style={{ fontSize: 10, color: catStyle.color, fontWeight: 600, marginTop: 2 }}>{catMeta?.label} · {dayLabel}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <div style={{ padding: "2px 8px", borderRadius: 10, background: sigStyle.bg, fontSize: 9, fontWeight: 700, color: sigStyle.color }}>
              {sigMeta?.icon} {sigMeta?.label}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <p style={{ fontSize: 11, color: theme.textSecondary, lineHeight: 1.6, margin: "0 0 20px" }}>{node.desc}</p>

      {/* Badges */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        <SentimentBadge sentiment={node.sentiment} theme={theme} full />
        <div style={{ padding: "4px 12px", borderRadius: 20, background: theme.bgAlt, fontSize: 10, fontWeight: 700, color: deltaColor }}>
          {deltaText}
        </div>
        {node.extra && (
          <div style={{ padding: "4px 12px", borderRadius: 20, background: catStyle.bg, fontSize: 10, fontWeight: 600, color: catStyle.color }}>{node.extra}</div>
        )}
      </div>

      {/* Market probability card */}
      <div style={{ padding: 16, borderRadius: 12, background: theme.card, border: `1px solid ${theme.border}`, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, textTransform: "uppercase" }}>Market Probability</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: theme.accent }}>{node.marketProb != null ? `${node.marketProb.toFixed(1)}%` : "\u2014"}</div>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: theme.border, overflow: "hidden" }}>
          <div style={{ height: 6, borderRadius: 3, background: theme.accent, width: `${node.marketProb ?? 0}%`, transition: "width 0.3s" }} />
        </div>
        {node.marketQuestion && (
          <div style={{ fontSize: 10, color: theme.textSecondary, marginTop: 10, fontStyle: "italic" }}>
            "{node.marketQuestion}"
          </div>
        )}
        {node.marketPlatform && (
          <div style={{ fontSize: 9, color: theme.muted, marginTop: 4 }}>
            via {node.marketPlatform}{node.marketUrl ? " · " : ""}
            {node.marketUrl && <a href={node.marketUrl} target="_blank" rel="noopener noreferrer" style={{ color: theme.accent, textDecoration: "none" }}>View Market →</a>}
          </div>
        )}
      </div>

      {/* Metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        <MetricCard label="Odds Delta" value={deltaText} color={deltaColor} theme={theme} />
        <MetricCard label="Weight" value={`${(node.weight * 100).toFixed(0)}%`} color={catStyle.color} maxVal={100} currentVal={node.weight * 100} theme={theme} />
        <MetricCard label="Momentum" value={node.momentum > 0 ? `+${node.momentum.toFixed(1)}` : node.momentum.toFixed(1)} color={node.momentum > 0 ? theme.positive : node.momentum < 0 ? theme.negative : theme.neutral} theme={theme} />
        <MetricCard label="Volume" value={formatNumber(node.volume)} color={theme.accent} theme={theme} />
        <MetricCard label="Source Authority" value={`${node.sourceAuthority}`} color={sigStyle.color} maxVal={100} currentVal={node.sourceAuthority} theme={theme} />
        <MetricCard label="Signal" value={sigMeta?.label || node.signal} color={sigStyle.color} theme={theme} />
      </div>

      {/* Source info */}
      {(node.sourceName || node.sourceUrl) && (
        <div style={{ padding: 12, borderRadius: 10, background: theme.card, border: `1px solid ${theme.border}`, marginBottom: 20 }}>
          <div style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, marginBottom: 6, textTransform: "uppercase" }}>Source</div>
          {node.sourceName && <div style={{ fontSize: 11, fontWeight: 600 }}>{node.sourceName}</div>}
          {node.sourceUrl && (
            <a href={node.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: theme.accent, textDecoration: "none" }}>
              {node.sourceUrl.length > 50 ? node.sourceUrl.slice(0, 50) + "..." : node.sourceUrl}
            </a>
          )}
        </div>
      )}

      {/* Sparkline placeholder (volume trend) */}
      <div style={{ padding: 14, borderRadius: 10, background: theme.card, border: `1px solid ${theme.border}`, marginBottom: 24 }}>
        <div style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, marginBottom: 8, textTransform: "uppercase" }}>Volume Trend</div>
        <Sparkline data={mockSparkData(node.volume > 0 ? node.volume : 50)} color={catStyle.color} width={280} height={40} />
      </div>

      {/* Tags */}
      {node.tags && node.tags.length > 0 && (
        <div style={{ marginBottom: 20, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {node.tags.map((tag) => (
            <span key={tag} style={{ padding: "3px 10px", borderRadius: 10, background: theme.bgAlt, border: `1px solid ${theme.border}`, fontSize: 9, color: theme.textSecondary }}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Cui Bono (per-event) */}
      {node.cuiBono && <CuiBonoSection cuiBono={node.cuiBono} theme={theme} />}

      {/* Upstream chain */}
      {upstream.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, marginBottom: 10, textTransform: "uppercase" }}>Narrative Chain (upstream)</div>
          {upstream.map((n) => {
            const nStyle = getNarrativeCategoryStyle(theme, n.category);
            const nMeta = NARRATIVE_CATEGORY_META[n.category];
            return (
              <LinkItem key={n.id} avatar={nMeta?.icon || "●"} name={n.label}
                subtitle={`${nMeta?.label} · ${n.oddsDelta > 0 ? "+" : ""}${n.oddsDelta.toFixed(1)}pp`}
                badgeColor={nStyle.color} badgeBg={nStyle.bg}
                theme={theme} onClick={() => onNavigate(n.id)} />
            );
          })}
        </div>
      )}

      {/* Downstream */}
      {downstream.length > 0 && (
        <div>
          <div style={{ fontSize: 8, color: theme.muted, letterSpacing: 1.5, marginBottom: 10, textTransform: "uppercase" }}>Led to →</div>
          {downstream.map((n) => {
            const nStyle = getNarrativeCategoryStyle(theme, n.category);
            const nMeta = NARRATIVE_CATEGORY_META[n.category];
            return (
              <LinkItem key={n.id} avatar={nMeta?.icon || "●"} name={n.label}
                subtitle={`${nMeta?.label} · ${n.oddsDelta > 0 ? "+" : ""}${n.oddsDelta.toFixed(1)}pp`}
                badgeColor={nStyle.color} badgeBg={nStyle.bg}
                theme={theme} onClick={() => onNavigate(n.id)} />
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── HoverTooltip ───────────────────────────────────────────────

interface TooltipProps {
  event?: EventNode | null;
  kol?: KolNode | null;
  narrative?: NarrativeNode | null;
  theme: GraphTheme;
}

const HoverTooltip: React.FC<TooltipProps> = ({ event, kol, narrative, theme }) => {
  if (event) {
    const style = getEventTypeStyle(theme, event.type);
    return (
      <div style={{
        position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
        background: theme.surface, border: `1px solid ${style.color}25`, borderRadius: 12,
        padding: "12px 22px", display: "flex", gap: 16, alignItems: "center",
        backdropFilter: "blur(20px)", zIndex: 30, boxShadow: "0 12px 48px rgba(0,0,0,.7)", maxWidth: "92%",
      }}>
        <span style={{ fontSize: 22 }}>{EVENT_TYPE_META[event.type]?.icon}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{event.label}</div>
          <div style={{ fontSize: 9.5, color: theme.textSecondary, marginTop: 2, maxWidth: 260 }}>{event.desc}</div>
        </div>
        <SentimentBadge sentiment={event.sentiment} theme={theme} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: style.color }}>{event.impact}</div>
          <div style={{ fontSize: 7, color: theme.muted }}>IMPACT</div>
        </div>
        <div style={{ fontSize: 9, color: theme.muted, padding: "3px 8px", background: theme.bgAlt, borderRadius: 8 }}>Click →</div>
      </div>
    );
  }

  if (kol) {
    const tierStyle = getKolTierStyle(theme, kol.tier);
    return (
      <div style={{
        position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
        background: theme.surface, border: `1px solid ${tierStyle.color}25`, borderRadius: 12,
        padding: "12px 22px", display: "flex", gap: 16, alignItems: "center",
        backdropFilter: "blur(20px)", zIndex: 30, boxShadow: "0 12px 48px rgba(0,0,0,.7)", maxWidth: "92%",
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, background: tierStyle.bg,
          border: `1px solid ${tierStyle.color}30`, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 16, fontWeight: 800, color: tierStyle.color,
          fontFamily: "'JetBrains Mono',monospace",
        }}>{kol.avatar}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{kol.name}</div>
          <div style={{ fontSize: 9.5, color: theme.textSecondary, marginTop: 1 }}>{kol.handle} · {kol.platform}</div>
        </div>
        <div style={{ padding: "2px 8px", borderRadius: 10, background: tierStyle.bg, fontSize: 9, fontWeight: 700, color: tierStyle.color }}>
          {KOL_TIER_META[kol.tier].label}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 800, color: theme.text }}>{formatNumber(kol.followers)}</div><div style={{ fontSize: 7, color: theme.muted }}>FOLLOWERS</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 800, color: theme.accent }}>{kol.engRate.toFixed(1)}%</div><div style={{ fontSize: 7, color: theme.muted }}>ENG RATE</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 800, color: tierStyle.color }}>{formatNumber(kol.reach)}</div><div style={{ fontSize: 7, color: theme.muted }}>REACH</div></div>
        </div>
        <SentimentBadge sentiment={kol.sentiment} theme={theme} />
        <div style={{ fontSize: 9, color: theme.muted, padding: "3px 8px", background: theme.bgAlt, borderRadius: 8 }}>Click →</div>
      </div>
    );
  }

  if (narrative) {
    const catStyle = getNarrativeCategoryStyle(theme, narrative.category);
    const sigStyle = getNarrativeSignalStyle(theme, narrative.signal);
    const catMeta = NARRATIVE_CATEGORY_META[narrative.category];
    const sigMeta = NARRATIVE_SIGNAL_META[narrative.signal];
    const deltaColor = narrative.oddsDelta > 0 ? theme.positive : narrative.oddsDelta < 0 ? theme.negative : theme.neutral;
    const deltaText = narrative.oddsDelta > 0 ? `+${narrative.oddsDelta.toFixed(1)}pp` : `${narrative.oddsDelta.toFixed(1)}pp`;
    return (
      <div style={{
        position: "absolute", bottom: 42, left: "50%", transform: "translateX(-50%)",
        background: theme.surface, border: `1px solid ${catStyle.color}25`, borderRadius: 12,
        padding: "12px 22px", display: "flex", gap: 16, alignItems: "center",
        backdropFilter: "blur(20px)", zIndex: 35, boxShadow: "0 12px 48px rgba(0,0,0,.7)", maxWidth: "85%",
        pointerEvents: "none",
      }}>
        <span style={{ fontSize: 22 }}>{catMeta?.icon}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{narrative.label}</div>
          <div style={{ fontSize: 9.5, color: theme.textSecondary, marginTop: 2, maxWidth: 260 }}>{narrative.desc}</div>
        </div>
        <div style={{ padding: "2px 8px", borderRadius: 10, background: sigStyle.bg, fontSize: 9, fontWeight: 700, color: sigStyle.color }}>
          {sigMeta?.icon} {sigMeta?.label}
        </div>
        <SentimentBadge sentiment={narrative.sentiment} theme={theme} />
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 800, color: deltaColor }}>{deltaText}</div><div style={{ fontSize: 7, color: theme.muted }}>ODDS</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 800, color: theme.accent }}>{narrative.marketProb != null ? `${narrative.marketProb.toFixed(0)}%` : "\u2014"}</div><div style={{ fontSize: 7, color: theme.muted }}>PROB</div></div>
        </div>
        <div style={{ fontSize: 9, color: theme.muted, padding: "3px 8px", background: theme.bgAlt, borderRadius: 8 }}>Click →</div>
      </div>
    );
  }

  return null;
};

// ─── Main DetailPanel ───────────────────────────────────────────

export interface DetailPanelProps {
  isOpen: boolean;
  selectedEvent: EventNode | null;
  selectedKol: KolNode | null;
  selectedNarrative?: NarrativeNode | null;
  allEvents: EventNode[];
  allKols: KolNode[];
  allNarratives?: NarrativeNode[];
  timeSlotLabels: string[];
  theme: GraphTheme;
  onClose: () => void;
  onNavigate: (id: string) => void;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({
  isOpen, selectedEvent, selectedKol, selectedNarrative,
  allEvents, allKols, allNarratives = [], timeSlotLabels,
  theme, onClose, onNavigate,
}) => (
  <div style={{
    position: "absolute", top: 48, right: 0, width: 340, bottom: 0,
    background: "rgba(8,10,16,0.97)", borderLeft: `1px solid ${theme.border}`,
    backdropFilter: "blur(20px)", zIndex: 25,
    transform: isOpen ? "translateX(0)" : "translateX(340px)",
    transition: "transform 0.3s cubic-bezier(.4,0,.2,1)",
    overflowY: "auto", overflowX: "hidden",
  }}>
    <button onClick={onClose} style={{
      position: "sticky", top: 0, zIndex: 5, width: "100%", padding: "10px 16px",
      background: "rgba(8,10,16,0.95)", borderBottom: `1px solid ${theme.border}`,
      border: "none", color: theme.muted, fontSize: 10, cursor: "pointer",
      fontFamily: "inherit", textAlign: "left", backdropFilter: "blur(8px)",
    }}>← Close</button>

    {selectedEvent && (
      <EventDetail event={selectedEvent} allEvents={allEvents}
        timeSlotLabels={timeSlotLabels} theme={theme} onNavigate={onNavigate} />
    )}

    {selectedKol && (
      <KolDetail kol={selectedKol} allKols={allKols}
        timeSlotLabels={timeSlotLabels} theme={theme} onNavigate={onNavigate} />
    )}

    {selectedNarrative && (
      <NarrativeDetail node={selectedNarrative} allNodes={allNarratives}
        timeSlotLabels={timeSlotLabels} theme={theme} onNavigate={onNavigate} />
    )}
  </div>
);

export { HoverTooltip };
