/* ═══════════════════════════════════════════════════════════════
   DetailPanel — Right-side panel + HoverTooltip
   Styled per BubbleMap design system (§6 Tooltip, §10 Metrics)
   ═══════════════════════════════════════════════════════════════ */

import React, { useMemo } from "react";
import type { EventNode, KolNode, NarrativeNode, GraphTheme, Sentiment, CuiBono } from "../../types";
import { getEventTypeStyle, getKolTierStyle, getNarrativeCategoryStyle, getNarrativeSignalStyle, EVENT_TYPE_META, KOL_TIER_META, PLATFORM_META, NARRATIVE_CATEGORY_META, NARRATIVE_SIGNAL_META } from "../../styles/theme";
import { formatNumber, sentimentLabel, sentimentArrow, isScenarioNode } from "../../utils";
import { Sparkline } from "../Shared/SvgPrimitives";

// ─── Helpers ────────────────────────────────────────────────────

function mockSparkData(base: number, len = 14): number[] {
  let seed = Math.abs(base * 1000) | 0;
  return Array.from({ length: len }, (_, i) => {
    seed = (seed * 16807 + 7) % 2147483647;
    const pseudo = (seed % 1000) / 1000;
    return Math.max(5, base * (0.2 + pseudo * 0.8) + (i / len) * base * 0.3);
  });
}

// ─── §10 Metric Card (BubbleMap MetricsGrid) ───────────────────

const MetricCard: React.FC<{
  label: string; value: string | number; color: string;
  maxVal?: number; currentVal?: number; theme: GraphTheme;
}> = ({ label, value, color, maxVal, currentVal, theme }) => (
  <div style={{
    padding: 10, borderRadius: 10,
    background: theme.bgAlt,              // §10: baseWeakBack #161d26
    display: "flex", flexDirection: "column", gap: 6,
  }}>
    <div style={{ fontSize: 12, fontWeight: 400, color: theme.textSecondary }}>{label}</div>
    <div style={{ fontSize: 14, fontWeight: 500, color }}>{typeof value === "number" && value > 999 ? formatNumber(value) : value}</div>
    {maxVal != null && currentVal != null && (
      <div style={{ height: 3, borderRadius: 2, background: theme.border }}>
        <div style={{ height: 3, borderRadius: 2, background: color, width: `${Math.min((currentVal / maxVal) * 100, 100)}%` }} />
      </div>
    )}
  </div>
);

// ─── §7 Sentiment Badge (tag style) ────────────────────────────

const SentimentBadge: React.FC<{ sentiment: Sentiment; theme: GraphTheme; full?: boolean }> = ({ sentiment, theme, full = false }) => {
  const color = sentiment === "pos" ? theme.positive : sentiment === "neg" ? theme.negative : theme.neutral;
  const bg = sentiment === "pos" ? theme.positiveDim : sentiment === "neg" ? theme.negativeDim : theme.neutralDim;
  return (
    <div style={{
      padding: "2px 8px", borderRadius: 44,      // §7 pill shape
      background: bg, fontSize: 12, fontWeight: 400, color,
    }}>
      {sentimentArrow(sentiment)} {full ? sentimentLabel(sentiment) : sentiment === "pos" ? "Pos" : sentiment === "neg" ? "Neg" : "Neu"}
    </div>
  );
};

// ─── §11 Connection Link Item ──────────────────────────────────

const LinkItem: React.FC<{
  avatar: string; name: string; subtitle: string;
  badgeLabel?: string; badgeColor?: string; badgeBg?: string;
  theme: GraphTheme; onClick?: () => void;
}> = ({ avatar, name, subtitle, badgeLabel, badgeColor, badgeBg, theme, onClick }) => (
  <div style={{
    display: "flex", gap: 8, alignItems: "center", padding: "6px 0",
    borderBottom: `1px solid ${theme.border}`, cursor: onClick ? "pointer" : "default",
  }} onClick={onClick}>
    <div style={{
      width: 24, height: 24, borderRadius: 6,
      background: badgeBg || theme.surface,    // §3 baseStrongDown
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, fontWeight: 600, color: badgeColor || theme.muted,
    }}>{avatar.slice(0, 2)}</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
      <div style={{ fontSize: 11, color: theme.muted }}>{subtitle}</div>
    </div>
    {badgeLabel && (
      <div style={{
        padding: "1px 6px", borderRadius: 44,
        background: `${badgeColor || theme.muted}18`,
        color: badgeColor || theme.muted,
        border: `1px solid ${badgeColor || theme.muted}33`,
        fontSize: 11, fontWeight: 400, flexShrink: 0,
      }}>{badgeLabel}</div>
    )}
  </div>
);

// ─── §11 Section Title ─────────────────────────────────────────

const SectionTitle: React.FC<{ children: React.ReactNode; theme: GraphTheme }> = ({ children, theme }) => (
  <div style={{
    fontSize: 11, fontWeight: 700, color: theme.muted,
    textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8,
  }}>{children}</div>
);

// ─── Event Detail ──────────────────────────────────────────────

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

  const eventMap = useMemo(() => new Map(allEvents.map((e) => [e.id, e])), [allEvents]);

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
  const downstream = allEvents.filter((e) => e.from?.includes(event.id));

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header — §6 avatar + name */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {event.imageUrl ? (
          <img src={event.imageUrl} alt="" style={{
            width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0,
          }} />
        ) : (
          <div style={{
            width: 40, height: 40, borderRadius: "50%", background: style.bg,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 600, color: style.color, flexShrink: 0,
          }}>{meta?.label?.slice(0, 2) || "EV"}</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{event.label}</div>
          <div style={{ fontSize: 11, color: theme.muted }}>{meta?.label} · {dayLabel}</div>
        </div>
      </div>

      {/* Description */}
      <p style={{ fontSize: 12, color: theme.textSecondary, lineHeight: "18px", margin: 0 }}>{event.desc}</p>

      {/* Badges */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <SentimentBadge sentiment={event.sentiment} theme={theme} full />
        {event.extra && (
          <div style={{ padding: "2px 8px", borderRadius: 44, background: `${style.color}18`, color: style.color, border: `1px solid ${style.color}33`, fontSize: 12 }}>{event.extra}</div>
        )}
      </div>

      {/* §10 Metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <MetricCard label="Impact" value={event.impact} color={style.color} maxVal={100} currentVal={event.impact} theme={theme} />
        <MetricCard label="Mentions" value={event.mentions} color={theme.accent} theme={theme} />
        <MetricCard label="Weight" value={`${(event.weight * 100).toFixed(0)}%`} color={theme.text} theme={theme} />
        <MetricCard label="Timeline" value={dayLabel} color={theme.muted} theme={theme} />
      </div>

      {/* Sparkline */}
      <div style={{ padding: 10, borderRadius: 10, background: theme.bgAlt }}>
        <div style={{ fontSize: 11, color: theme.muted, letterSpacing: 1.5, marginBottom: 6, textTransform: "uppercase", fontWeight: 700 }}>Mention Trend</div>
        <Sparkline data={mockSparkData(event.impact)} color={style.color} width={280} height={40} />
      </div>

      {/* §11 Connections */}
      {upstream.length > 0 && (
        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 8 }}>
          <SectionTitle theme={theme}>Event Chain (upstream)</SectionTitle>
          {upstream.map((ev) => {
            const evStyle = getEventTypeStyle(theme, ev.type);
            const evMeta = EVENT_TYPE_META[ev.type];
            return (
              <LinkItem key={ev.id} avatar={evMeta?.label || "EV"} name={ev.label}
                subtitle={`${evMeta?.label} · Impact ${ev.impact}`}
                badgeColor={evStyle.color} badgeBg={evStyle.bg}
                theme={theme} onClick={() => onNavigate(ev.id)} />
            );
          })}
        </div>
      )}

      {downstream.length > 0 && (
        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 8 }}>
          <SectionTitle theme={theme}>Led to</SectionTitle>
          {downstream.map((ev) => {
            const evStyle = getEventTypeStyle(theme, ev.type);
            const evMeta = EVENT_TYPE_META[ev.type];
            return (
              <LinkItem key={ev.id} avatar={evMeta?.label || "EV"} name={ev.label}
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

// ─── KOL Detail ────────────────────────────────────────────────

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
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header — §6 avatar + name + handle */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {(kol.imageUrl || kol.avatarUrl) ? (
          <img src={(kol.imageUrl || kol.avatarUrl)!} alt="" style={{
            width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0,
          }} />
        ) : (
          <div style={{
            width: 40, height: 40, borderRadius: "50%", background: tierStyle.bg,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, color: tierStyle.color, flexShrink: 0,
          }}>{kol.avatar}</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{kol.name}</div>
          <div style={{ fontSize: 11, color: theme.muted }}>{kol.handle}</div>
          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
            <span style={{ padding: "1px 6px", borderRadius: 44, background: `${tierStyle.color}18`, color: tierStyle.color, border: `1px solid ${tierStyle.color}33`, fontSize: 11, fontWeight: 400 }}>{tierMeta.label}</span>
            <span style={{ padding: "1px 6px", borderRadius: 44, background: `${theme.accent}18`, color: theme.accent, border: `1px solid ${theme.accent}33`, fontSize: 11, fontWeight: 400 }}>{platMeta.label}</span>
          </div>
        </div>
      </div>

      {/* §10 Metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <MetricCard label="Followers" value={formatNumber(kol.followers)} color={tierStyle.color} theme={theme} />
        <MetricCard label="Eng. Rate" value={kol.engRate.toFixed(1) + "%"} color={theme.accent} theme={theme} />
        <MetricCard label="Reach" value={formatNumber(kol.reach)} color={getKolTierStyle(theme, "mega").color} theme={theme} />
        <MetricCard label="Mentions" value={kol.mentions} color={getKolTierStyle(theme, "macro").color} theme={theme} />
        <MetricCard label="Views" value={kol.views > 0 ? formatNumber(kol.views) : "N/A"} color={getKolTierStyle(theme, "mid").color} theme={theme} />
        <MetricCard label="Sentiment" value={sentimentLabel(kol.sentiment)} color={kol.sentiment === "pos" ? theme.positive : kol.sentiment === "neg" ? theme.negative : theme.neutral} theme={theme} />
      </div>

      {/* Sparkline */}
      <div style={{ padding: 10, borderRadius: 10, background: theme.bgAlt }}>
        <div style={{ fontSize: 11, color: theme.muted, letterSpacing: 1.5, marginBottom: 6, textTransform: "uppercase", fontWeight: 700 }}>Engagement Trend</div>
        <Sparkline data={kol.engHistory || mockSparkData(kol.engRate * 10)} color={tierStyle.color} width={280} height={40} />
      </div>

      {/* Posts */}
      {kol.posts.length > 0 && (
        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 8 }}>
          <SectionTitle theme={theme}>Posts Timeline</SectionTitle>
          {kol.posts.map((p, i) => (
            <div key={i} style={{ padding: 10, borderRadius: 10, background: theme.bgAlt, marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: theme.muted }}>{timeSlotLabels[p.day] || `Day ${p.day + 1}`} · {p.type}</span>
                <SentimentBadge sentiment={p.sentiment} theme={theme} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{p.title}</div>
              <div style={{ display: "flex", gap: 10, fontSize: 11, color: theme.textSecondary }}>
                {p.views > 0 && <span>{formatNumber(p.views)} views</span>}
                <span>{formatNumber(p.likes)} likes</span>
                {p.comments != null && <span>{formatNumber(p.comments)} comments</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* §11 Connections */}
      {influencedKols.length > 0 && (
        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 8 }}>
          <SectionTitle theme={theme}>Influenced KOLs</SectionTitle>
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

      {influencedBy.length > 0 && (
        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 8 }}>
          <SectionTitle theme={theme}>Influenced By</SectionTitle>
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

// ─── Cui Bono Section ──────────────────────────────────────────

const CuiBonoSection: React.FC<{ cuiBono: CuiBono; theme: GraphTheme }> = ({ cuiBono, theme }) => (
  <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 8 }}>
    <SectionTitle theme={theme}>Cui Bono</SectionTitle>
    {cuiBono.winners.length > 0 && (
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: theme.positive, fontWeight: 600, marginBottom: 4 }}>Winners</div>
        {cuiBono.winners.map((e, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px", borderRadius: 6, background: theme.positiveDim, marginBottom: 2 }}>
            <span style={{ fontSize: 12, color: theme.text }}>{e.name}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: theme.positive }}>+{e.delta}</span>
          </div>
        ))}
      </div>
    )}
    {cuiBono.losers.length > 0 && (
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: theme.negative, fontWeight: 600, marginBottom: 4 }}>Losers</div>
        {cuiBono.losers.map((e, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px", borderRadius: 6, background: theme.negativeDim, marginBottom: 2 }}>
            <span style={{ fontSize: 12, color: theme.text }}>{e.name}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: theme.negative }}>{e.delta}</span>
          </div>
        ))}
      </div>
    )}
    {cuiBono.indices && cuiBono.indices.length > 0 && (
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: theme.accent, fontWeight: 600, marginBottom: 4 }}>Indices</div>
        {cuiBono.indices.map((e, i) => {
          const color = e.delta >= 0 ? theme.positive : theme.negative;
          return (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px", borderRadius: 6, background: theme.bgAlt, marginBottom: 2 }}>
              <span style={{ fontSize: 12, color: theme.text }}>{e.name} <span style={{ color: theme.muted, fontSize: 10 }}>{e.code}</span></span>
              <span style={{ fontSize: 12, fontWeight: 600, color }}>{e.delta > 0 ? "+" : ""}{e.delta}%</span>
            </div>
          );
        })}
      </div>
    )}
    {cuiBono.hiddenMotives && cuiBono.hiddenMotives.length > 0 && (
      <div style={{ padding: 10, borderRadius: 10, background: theme.warningDim, border: `1px solid ${theme.warning}30` }}>
        <div style={{ fontSize: 12, color: theme.warning, fontWeight: 600, marginBottom: 4 }}>Hidden Motives</div>
        {cuiBono.hiddenMotives.map((m, i) => (
          <div key={i} style={{ fontSize: 11, color: theme.textSecondary, lineHeight: "16px", marginBottom: 2 }}>• {m}</div>
        ))}
      </div>
    )}
  </div>
);

// ─── Narrative Detail ──────────────────────────────────────────

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
  const isScenario = isScenarioNode(node);

  const nodeMap = useMemo(() => new Map(allNodes.map((n) => [n.id, n])), [allNodes]);

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
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {node.imageUrl ? (
          <img src={node.imageUrl} alt="" style={{
            width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0,
          }} />
        ) : (
          <div style={{
            width: 40, height: 40, borderRadius: "50%", background: catStyle.bg,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 600, color: catStyle.color, flexShrink: 0,
          }}>{catMeta?.label?.slice(0, 2) || "NR"}</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{node.label}</div>
          <div style={{ fontSize: 11, color: theme.muted }}>{catMeta?.label} · {dayLabel}</div>
          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
            <span style={{ padding: "1px 6px", borderRadius: 44, background: `${sigStyle.color}18`, color: sigStyle.color, border: `1px solid ${sigStyle.color}33`, fontSize: 11, fontWeight: 400 }}>{sigMeta?.label}</span>
          </div>
        </div>
      </div>

      <p style={{ fontSize: 12, color: theme.textSecondary, lineHeight: "18px", margin: 0 }}>{node.desc}</p>

      {/* Badges */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <SentimentBadge sentiment={node.sentiment} theme={theme} full />
        <div style={{ padding: "2px 8px", borderRadius: 44, background: `${deltaColor}18`, color: deltaColor, border: `1px solid ${deltaColor}33`, fontSize: 12 }}>{deltaText}</div>
        {node.extra && (
          <div style={{ padding: "2px 8px", borderRadius: 44, background: `${catStyle.color}18`, color: catStyle.color, border: `1px solid ${catStyle.color}33`, fontSize: 12 }}>{node.extra}</div>
        )}
      </div>

      {/* Market probability card */}
      <div style={{ padding: 12, borderRadius: 10, background: theme.bgAlt }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: theme.muted, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700 }}>Prediction Probability</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.accent }}>{node.marketProb != null ? `${node.marketProb.toFixed(1)}%` : "\u2014"}</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <div style={{ height: 8, borderRadius: "16px 0 0 16px", background: theme.positive, flex: node.marketProb ?? 0, transition: "flex 0.5s ease" }} />
          <div style={{ height: 8, borderRadius: "0 16px 16px 0", background: theme.negative, flex: 100 - (node.marketProb ?? 0), transition: "flex 0.5s ease" }} />
        </div>
        {node.marketQuestion && (
          <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 8, fontStyle: "italic" }}>"{node.marketQuestion}"</div>
        )}
        {node.marketPlatform && (
          <div style={{ fontSize: 11, color: theme.muted, marginTop: 4 }}>
            via {node.marketPlatform}{node.marketUrl ? " · " : ""}
            {node.marketUrl && <a href={node.marketUrl} target="_blank" rel="noopener noreferrer" style={{ color: theme.accent, textDecoration: "none" }}>View</a>}
          </div>
        )}
      </div>

      {/* §10 Metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <MetricCard label="Odds Delta" value={deltaText} color={deltaColor} theme={theme} />
        <MetricCard label="Weight" value={`${(node.weight * 100).toFixed(0)}%`} color={catStyle.color} maxVal={100} currentVal={node.weight * 100} theme={theme} />
        <MetricCard label="Momentum" value={node.momentum > 0 ? `+${node.momentum.toFixed(1)}` : node.momentum.toFixed(1)} color={node.momentum > 0 ? theme.positive : node.momentum < 0 ? theme.negative : theme.neutral} theme={theme} />
        <MetricCard label="Volume" value={formatNumber(node.volume)} color={theme.accent} theme={theme} />
        <MetricCard label="Source Auth" value={`${node.sourceAuthority}`} color={sigStyle.color} maxVal={100} currentVal={node.sourceAuthority} theme={theme} />
        <MetricCard label="Signal" value={sigMeta?.label || node.signal} color={sigStyle.color} theme={theme} />
      </div>

      {/* Source */}
      {(node.sourceName || node.sourceUrl) && (
        <div style={{ padding: 10, borderRadius: 10, background: theme.bgAlt }}>
          <div style={{ fontSize: 11, color: theme.muted, letterSpacing: 1.5, marginBottom: 4, textTransform: "uppercase", fontWeight: 700 }}>Source</div>
          {node.sourceName && <div style={{ fontSize: 12, fontWeight: 600 }}>{node.sourceName}</div>}
          {node.sourceUrl && (
            <a href={node.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: theme.accent, textDecoration: "none" }}>
              {node.sourceUrl.length > 50 ? node.sourceUrl.slice(0, 50) + "..." : node.sourceUrl}
            </a>
          )}
        </div>
      )}

      {/* Tags — §7 pill badges */}
      {node.tags && node.tags.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {node.tags.map((tag) => (
            <span key={tag} style={{
              padding: "2px 8px", borderRadius: 44,
              background: theme.positiveDim, color: "#9cf3bf",
              fontSize: 12, fontWeight: 400,
            }}>#{tag}</span>
          ))}
        </div>
      )}

      {/* Scenario sections */}
      {isScenario && node.outcome && (
        <div style={{
          padding: 10, borderRadius: 10,
          background: node.outcome === "YES" ? theme.positiveDim : theme.negativeDim,
          border: `1px solid ${node.outcome === "YES" ? theme.positive : theme.negative}30`,
        }}>
          <div style={{ fontSize: 11, color: theme.muted, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 4 }}>Scenario Outcome</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: node.outcome === "YES" ? theme.positive : theme.negative }}>
            {node.outcome === "YES" ? "✓" : "✗"} {node.outcome} — {node.outcomeProbability ?? "?"}%
          </div>
          {node.parentAnchor && <div style={{ fontSize: 11, color: theme.muted, marginTop: 4 }}>Branch from: {node.parentAnchor}</div>}
        </div>
      )}

      {isScenario && node.conditions && node.conditions.length > 0 && (
        <div>
          <SectionTitle theme={theme}>Conditions Required</SectionTitle>
          {node.conditions.map((c, i) => (
            <div key={i} style={{ padding: "4px 8px", borderRadius: 6, background: theme.bgAlt, marginBottom: 3, fontSize: 12, color: theme.textSecondary }}>
              {i + 1}. {c}
            </div>
          ))}
        </div>
      )}

      {isScenario && node.nextEvents && node.nextEvents.length > 0 && (
        <div>
          <SectionTitle theme={theme}>Next Events (if realized)</SectionTitle>
          {node.nextEvents.map((ne, i) => (
            <div key={i} style={{ padding: "4px 8px", borderRadius: 6, background: theme.bgAlt, marginBottom: 3, fontSize: 12, color: theme.text }}>
              → {ne}
            </div>
          ))}
        </div>
      )}

      {node.cuiBono && <CuiBonoSection cuiBono={node.cuiBono} theme={theme} />}

      {/* §11 Connections */}
      {upstream.length > 0 && (
        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 8 }}>
          <SectionTitle theme={theme}>Narrative Chain (upstream)</SectionTitle>
          {upstream.map((n) => {
            const nStyle = getNarrativeCategoryStyle(theme, n.category);
            const nMeta = NARRATIVE_CATEGORY_META[n.category];
            return (
              <LinkItem key={n.id} avatar={nMeta?.label || "NR"} name={n.label}
                subtitle={`${nMeta?.label} · ${n.oddsDelta > 0 ? "+" : ""}${n.oddsDelta.toFixed(1)}pp`}
                badgeColor={nStyle.color} badgeBg={nStyle.bg}
                theme={theme} onClick={() => onNavigate(n.id)} />
            );
          })}
        </div>
      )}

      {downstream.length > 0 && (
        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 8 }}>
          <SectionTitle theme={theme}>Led to</SectionTitle>
          {downstream.map((n) => {
            const nStyle = getNarrativeCategoryStyle(theme, n.category);
            const nMeta = NARRATIVE_CATEGORY_META[n.category];
            return (
              <LinkItem key={n.id} avatar={nMeta?.label || "NR"} name={n.label}
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

// ─── §6 HoverTooltip (BubbleMap tooltip card) ──────────────────

interface TooltipProps {
  event?: EventNode | null;
  kol?: KolNode | null;
  narrative?: NarrativeNode | null;
  theme: GraphTheme;
}

const tooltipBase = (theme: GraphTheme, borderColor?: string): React.CSSProperties => ({
  position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
  display: "flex", gap: 12, alignItems: "center",
  width: "auto", maxWidth: 400, padding: 12,
  borderRadius: 12,
  border: `1px solid ${borderColor || theme.border}`,
  background: theme.bg,                       // §6: baseStrong
  pointerEvents: "none", zIndex: 35,
  fontFamily: theme.fontFamily,
});

const HoverTooltip: React.FC<TooltipProps> = ({ event, kol, narrative, theme }) => {
  if (event) {
    const style = getEventTypeStyle(theme, event.type);
    const meta = EVENT_TYPE_META[event.type];
    return (
      <div style={tooltipBase(theme, `${style.color}40`)}>
        {event.imageUrl ? (
          <img src={event.imageUrl} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: style.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: style.color, flexShrink: 0 }}>{meta?.label?.slice(0, 2)}</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{event.label}</div>
          <div style={{ fontSize: 11, color: theme.muted, marginTop: 2 }}>{meta?.label} · Impact {event.impact}</div>
        </div>
        <SentimentBadge sentiment={event.sentiment} theme={theme} />
      </div>
    );
  }

  if (kol) {
    const tierStyle = getKolTierStyle(theme, kol.tier);
    return (
      <div style={tooltipBase(theme, `${tierStyle.color}40`)}>
        {(kol.imageUrl || kol.avatarUrl) ? (
          <img src={(kol.imageUrl || kol.avatarUrl)!} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: tierStyle.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: tierStyle.color, flexShrink: 0 }}>{kol.avatar}</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{kol.name}</div>
          <div style={{ fontSize: 11, color: theme.muted, marginTop: 1 }}>{kol.handle}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{formatNumber(kol.followers)}</div><div style={{ fontSize: 11, color: theme.muted }}>Followers</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 600, color: theme.accent }}>{kol.engRate.toFixed(1)}%</div><div style={{ fontSize: 11, color: theme.muted }}>Eng</div></div>
        </div>
        <SentimentBadge sentiment={kol.sentiment} theme={theme} />
      </div>
    );
  }

  if (narrative) {
    const catStyle = getNarrativeCategoryStyle(theme, narrative.category);
    const sigStyle = getNarrativeSignalStyle(theme, narrative.signal);
    const sigMeta = NARRATIVE_SIGNAL_META[narrative.signal];
    const catMeta = NARRATIVE_CATEGORY_META[narrative.category];
    const deltaColor = narrative.oddsDelta > 0 ? theme.positive : narrative.oddsDelta < 0 ? theme.negative : theme.neutral;
    const deltaText = narrative.oddsDelta > 0 ? `+${narrative.oddsDelta.toFixed(1)}pp` : `${narrative.oddsDelta.toFixed(1)}pp`;
    const sentColor = narrative.sentiment === "pos" ? theme.positive : narrative.sentiment === "neg" ? theme.negative : theme.neutral;
    const momentumColor = (narrative.momentum ?? 0) > 0 ? theme.positive : (narrative.momentum ?? 0) < 0 ? theme.negative : theme.neutral;
    return (
      <div style={{ ...tooltipBase(theme, `${catStyle.color}40`), maxWidth: 520, flexDirection: "column", gap: 8 }}>
        {/* Row 1: avatar + title + signal badge */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", width: "100%" }}>
          {narrative.imageUrl ? (
            <img src={narrative.imageUrl} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: catStyle.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: catStyle.color, flexShrink: 0 }}>{catMeta?.label?.slice(0, 2)}</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{narrative.label}</div>
            <div style={{ fontSize: 11, color: theme.muted, marginTop: 1 }}>{catMeta?.label} · {sigMeta?.label}</div>
          </div>
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <SentimentBadge sentiment={narrative.sentiment} theme={theme} />
            <span style={{ padding: "2px 6px", borderRadius: 44, background: `${sigStyle.color}18`, color: sigStyle.color, border: `1px solid ${sigStyle.color}33`, fontSize: 11, whiteSpace: "nowrap" }}>{sigMeta?.label}</span>
          </div>
        </div>

        {/* Row 2: description */}
        <div style={{ fontSize: 11, color: theme.textSecondary, lineHeight: "15px" }}>
          {narrative.desc?.slice(0, 140)}{(narrative.desc?.length ?? 0) > 140 ? "..." : ""}
        </div>

        {/* Row 3: metrics grid */}
        <div style={{ display: "flex", gap: 12, width: "100%", flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: deltaColor }}>{deltaText}</div>
            <div style={{ fontSize: 9, color: theme.muted }}>Odds Δ</div>
          </div>
          {narrative.marketProb != null && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: theme.accent }}>{narrative.marketProb.toFixed(0)}%</div>
              <div style={{ fontSize: 9, color: theme.muted }}>Prob</div>
            </div>
          )}
          {narrative.momentum != null && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: momentumColor }}>{narrative.momentum > 0 ? "+" : ""}{narrative.momentum.toFixed(1)}</div>
              <div style={{ fontSize: 9, color: theme.muted }}>Mtm</div>
            </div>
          )}
          {narrative.volume != null && narrative.volume > 0 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{formatNumber(narrative.volume)}</div>
              <div style={{ fontSize: 9, color: theme.muted }}>Volume</div>
            </div>
          )}
          {narrative.sourceAuthority != null && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: sigStyle.color }}>{narrative.sourceAuthority}</div>
              <div style={{ fontSize: 9, color: theme.muted }}>Auth</div>
            </div>
          )}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: sentColor }}>{sentimentArrow(narrative.sentiment)} {narrative.sentiment === "pos" ? "Pos" : narrative.sentiment === "neg" ? "Neg" : "Neu"}</div>
            <div style={{ fontSize: 9, color: theme.muted }}>Sent</div>
          </div>
        </div>

        {/* Row 4: source */}
        {narrative.sourceName && (
          <div style={{ fontSize: 10, color: theme.muted }}>
            Source: <span style={{ color: theme.textSecondary }}>{narrative.sourceName}</span>
          </div>
        )}
      </div>
    );
  }

  return null;
};

// ─── Main DetailPanel ──────────────────────────────────────────

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
  panelWidth?: number;
  topOffset?: number;
  isMobile?: boolean;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({
  isOpen, selectedEvent, selectedKol, selectedNarrative,
  allEvents, allKols, allNarratives = [], timeSlotLabels,
  theme, onClose, onNavigate, panelWidth: pw, topOffset: tOff,
  isMobile = false,
}) => {
  const W = pw ?? 340;
  const T = tOff ?? 48;

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: "absolute", left: 0, right: 0, bottom: 0,
        height: "70vh", maxHeight: "70vh",
        background: theme.bg,
        borderTop: `1px solid ${theme.border}`,
        borderRadius: "16px 16px 0 0",
        zIndex: 35,
        transform: isOpen ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.3s cubic-bezier(.4,0,.2,1)",
        overflowY: "auto", overflowX: "hidden",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.4)",
      }
    : {
        position: "absolute", top: T, right: 0, width: W, bottom: 0,
        background: theme.bg,
        borderLeft: `1px solid ${theme.border}`,
        zIndex: 25,
        transform: isOpen ? "translateX(0)" : `translateX(${W}px)`,
        transition: "transform 0.3s cubic-bezier(.4,0,.2,1)",
        overflowY: "auto", overflowX: "hidden",
      };

  return (
  <div className={isMobile ? "event-graph-mobile-sheet" : undefined} style={panelStyle}>
    {/* Drag handle on mobile */}
    {isMobile && (
      <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: theme.border }} />
      </div>
    )}
    <button onClick={onClose} style={{
      position: "sticky", top: 0, right: 0, zIndex: 5,
      width: isMobile ? 44 : 30, height: isMobile ? 44 : 30,
      background: theme.surface, border: `1px solid ${theme.border}`,
      borderRadius: 8, color: theme.muted, fontSize: isMobile ? 18 : 15, cursor: "pointer",
      fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center",
      margin: "8px 8px 0 auto",
    }}>✕</button>

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
};

export { HoverTooltip };
