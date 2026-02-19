/* ═══════════════════════════════════════════════════════════════
   DetailPanel — Right-side panel for event/KOL node details
   ═══════════════════════════════════════════════════════════════ */

import React from "react";
import type { EventNode, KolNode, GraphTheme, KolTier } from "../../types";
import { getEventTypeStyle, getKolTierStyle, EVENT_TYPE_META, KOL_TIER_META, PLATFORM_META } from "../../styles/theme";
import { formatNumber, sentimentLabel, sentimentArrow } from "../../utils";
import { Sparkline } from "../Shared/SvgPrimitives";

// ─── Helpers ────────────────────────────────────────────────────

/** Generate mock sparkline data (replace with real engHistory / mention trend from API) */
function mockSparkData(base: number, len = 14): number[] {
  return Array.from({ length: len }, (_, i) =>
    Math.max(5, base * (0.2 + Math.random() * 0.8) + (i / len) * base * 0.3),
  );
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

const SentimentBadge: React.FC<{ sentiment: string; theme: GraphTheme; full?: boolean }> = ({ sentiment, theme, full = false }) => {
  const color = sentiment === "pos" ? theme.positive : sentiment === "neg" ? theme.negative : theme.neutral;
  const bg = sentiment === "pos" ? theme.positiveDim : sentiment === "neg" ? theme.negativeDim : theme.neutralDim;
  return (
    <div style={{ padding: "4px 12px", borderRadius: 20, background: bg, fontSize: 10, fontWeight: 700, color }}>
      {sentimentArrow(sentiment as any)} {full ? sentimentLabel(sentiment as any) : sentiment === "pos" ? "Pos" : sentiment === "neg" ? "Neg" : "Neu"}
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

  // Upstream chain
  const upstream: EventNode[] = [];
  const visited = new Set<string>();
  const trace = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    const ev = allEvents.find((e) => e.id === id);
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

  const influencedKols = (kol.influence || []).map((id) => allKols.find((k) => k.id === id)).filter(Boolean) as KolNode[];
  const influencedBy = (kol.from || []).map((id) => allKols.find((k) => k.id === id)).filter(Boolean) as KolNode[];

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
        <MetricCard label="Eng. Rate" value={kol.engRate + "%"} color={theme.accent} theme={theme} />
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

// ─── HoverTooltip ───────────────────────────────────────────────

interface TooltipProps {
  event?: EventNode | null;
  kol?: KolNode | null;
  theme: GraphTheme;
}

const HoverTooltip: React.FC<TooltipProps> = ({ event, kol, theme }) => {
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
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 800, color: theme.accent }}>{kol.engRate}%</div><div style={{ fontSize: 7, color: theme.muted }}>ENG RATE</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 800, color: tierStyle.color }}>{formatNumber(kol.reach)}</div><div style={{ fontSize: 7, color: theme.muted }}>REACH</div></div>
        </div>
        <SentimentBadge sentiment={kol.sentiment} theme={theme} />
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
  allEvents: EventNode[];
  allKols: KolNode[];
  timeSlotLabels: string[];
  theme: GraphTheme;
  onClose: () => void;
  onNavigate: (id: string) => void;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({
  isOpen, selectedEvent, selectedKol, allEvents, allKols, timeSlotLabels,
  theme, onClose, onNavigate,
}) => (
  <div style={{
    position: "absolute", top: 48, right: 0, width: 340, height: "calc(100vh - 48px)",
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
  </div>
);

export { HoverTooltip };
