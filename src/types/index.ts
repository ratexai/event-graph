/* ═══════════════════════════════════════════════════════════════
   @ratexai/event-graph — Core Type Definitions
   All data contracts between backend and frontend
   ═══════════════════════════════════════════════════════════════ */

// ─── Enums & Literals ───────────────────────────────────────────

export type Sentiment = "pos" | "neg" | "neu";

export type EventType =
  | "blogger"
  | "media"
  | "metric"
  | "partnership"
  | "listing"
  | "launch"
  | "fud"
  | "security"
  | "event"
  | "onchain"
  | "resolution"
  | "milestone"
  | "community"
  | "governance"
  | "airdrop";

export type KolTier = "mega" | "macro" | "mid" | "micro" | "nano";

export type Platform = "youtube" | "twitter" | "telegram" | "tiktok" | "instagram" | "medium" | "other";

export type ViewMode = "events" | "kols" | "narratives";

export type SortField = "followers" | "engRate" | "reach" | "mentions" | "impact" | "date";

export type NarrativeCategory =
  | "ai"
  | "war"
  | "elections"
  | "regulation"
  | "defi"
  | "memecoin"
  | "macro"
  | "tech"
  | "scandal"
  | "climate"
  | "sports"
  | "other";

/** Significance level: how much this event shifts the narrative */
export type NarrativeSignal = "catalyst" | "escalation" | "resolution" | "reversal" | "noise";

export type SortOrder = "asc" | "desc";

// ─── Event Flow Types ───────────────────────────────────────────

/** Single event node in the flow graph */
export interface EventNode {
  id: string;
  col: number;
  label: string;
  type: EventType;
  sentiment: Sentiment;
  /** Normalized weight 0..1 */
  weight: number;
  desc: string;
  /** Impact score 0..100 */
  impact: number;
  mentions: number;
  /** Parent event IDs this event flows from */
  from?: string[];
  /** Optional badge text (e.g., "580K views") */
  extra?: string;
  timestamp?: string;
  sourceUrl?: string;
  projectId?: string;
  /** Circular avatar image — company logo, person photo, etc. */
  imageUrl?: string;
  meta?: Record<string, unknown>;
}

/** Time column descriptor */
export interface TimeSlot {
  index: number;
  label: string;
  startDate: string;
  endDate: string;
  /** Visual type — controls column appearance */
  type?: "past" | "present" | "near_future" | "anchor_date";
  /** For anchor_date columns: the anchor node ID placed here */
  anchorId?: string;
}

/** Directed edge between two event nodes */
export interface EventEdge {
  from: string;
  to: string;
  weight?: number;
  type?: "causal" | "temporal" | "reference" | "influence";
  /** For influence edges to anchor nodes: how much this event shifted probability (in pp) */
  influence?: number;
  /** Short explanation of the causal mechanism */
  mechanism?: string;
}

/** Complete event flow dataset returned by API */
export interface EventFlowData {
  nodes: EventNode[];
  /** Edges — auto-derived from node.from[] if omitted */
  edges?: EventEdge[];
  timeSlots: TimeSlot[];
  project?: ProjectInfo;
}

// ─── KOL Flow Types ─────────────────────────────────────────────

export interface KolPost {
  id?: string;
  day: number;
  type: "video" | "short" | "stream" | "tweet" | "thread" | "article" | "tutorial" | "reel" | "post";
  title: string;
  views: number;
  likes: number;
  sentiment: Sentiment;
  timestamp?: string;
  url?: string;
  comments?: number;
  shares?: number;
}

export interface KolNode {
  id: string;
  name: string;
  handle: string;
  /** 2-char avatar initials */
  avatar: string;
  tier: KolTier;
  followers: number;
  platform: Platform;
  sentiment: Sentiment;
  /** Column position (mention wave index) */
  col: number;
  mentions: number;
  /** Engagement rate % */
  engRate: number;
  reach: number;
  views: number;
  posts: KolPost[];
  triggerEvent?: string;
  /** KOL IDs that influenced this one */
  from?: string[];
  /** KOL IDs this one influenced */
  influence?: string[];
  avatarUrl?: string;
  /** Circular avatar image (alias for avatarUrl, used by renderer) */
  imageUrl?: string;
  profileUrl?: string;
  /** Trust/reliability score 0..100 */
  trustScore?: number;
  /** Historical engagement data for sparkline */
  engHistory?: number[];
  meta?: Record<string, unknown>;
}

export interface KolFlowData {
  nodes: KolNode[];
  timeSlots: TimeSlot[];
  project?: ProjectInfo;
  stats?: KolAggregateStats;
}

export interface KolAggregateStats {
  totalKols: number;
  totalReach: number;
  totalMentions: number;
  avgEngRate: number;
  /** Percentage 0..100 */
  positiveRatio: number;
  tierBreakdown: Record<KolTier, number>;
  platformBreakdown: Record<Platform, number>;
  topKolByReach?: string;
  topKolByEngagement?: string;
}

// ─── Narrative Flow Types ───────────────────────────────────

/** Single event node in a narrative timeline */
export interface NarrativeNode {
  id: string;
  /** Time column (timeline position) */
  col: number;
  /** Short headline */
  label: string;
  /** Narrative category */
  category: NarrativeCategory;
  /** How this event shifts the narrative */
  signal: NarrativeSignal;
  sentiment: Sentiment;
  /** Full description */
  desc: string;
  /** Parent event IDs this flows from */
  from?: string[];

  // ─── Scoring (core for prediction markets) ─────────
  /** Composite event weight 0..1 (normalized importance) */
  weight: number;
  /** How much this event changed prediction market odds (e.g., +12.5 means +12.5pp) */
  oddsDelta: number;
  /** Current market probability after this event, 0..100 (null if no reading) */
  marketProb: number | null;
  /** Source credibility score 0..100 */
  sourceAuthority: number;
  /** Narrative momentum: positive = accelerating, negative = decelerating */
  momentum: number;
  /** Volume of mentions/discussion */
  volume: number;

  // ─── Prediction market link ────────────────────────
  /** Linked prediction market (e.g., "polymarket") */
  marketPlatform?: string;
  /** Market question / bet title */
  marketQuestion?: string;
  /** Direct URL to the prediction market */
  marketUrl?: string;
  /** Market slug/ID for API lookups */
  marketSlug?: string;

  // ─── Metadata ──────────────────────────────────────
  /** Primary source URL */
  sourceUrl?: string;
  /** Source name (e.g., "Reuters", "CoinDesk") */
  sourceName?: string;
  /** ISO timestamp */
  timestamp?: string;
  /** Optional badge (e.g., "Breaking", "+15pp") */
  extra?: string;
  /** Tags for cross-referencing */
  tags?: string[];
  /** Circular avatar image — leader photo, company logo, flag, etc. */
  imageUrl?: string;
  /** Extensible metadata */
  meta?: Record<string, unknown>;

  /** Temporal status: past (confirmed), present (unfolding now), future (prediction/scenario) */
  temporal?: "past" | "present" | "future";
  /** ISO date when this prediction market question resolves/expires */
  resolvesAt?: string;

  // ─── Anchor node fields (Polymarket future endpoints) ───
  /** Node role: "fact" (default), "anchor" (PM future endpoint), "scenario" (YES/NO branch) */
  nodeType?: "fact" | "anchor" | "scenario";
  /** For anchors: influence links from fact nodes (richer than simple from[]) */
  influenceLinks?: AnchorInfluenceLink[];
  /** For anchors: probability history for sparkline */
  probHistory?: number[];
  /** For anchors: trading volume (human-readable, e.g., "$2.4M") */
  tradingVolume?: string;
  /** For anchors: market liquidity (human-readable) */
  liquidity?: string;
  /** For anchors: child scenario IDs (YES/NO branches) */
  scenarios?: string[];

  // ─── RateXAI Probability Engine fields ──────────────────
  /** RateXAI computed probability (0..100) */
  rateXProb?: number;
  /** Alpha = rateXProb − marketProb (positive = market underprices) */
  alpha?: number;
  /** Alpha signal level */
  alphaSignal?: "underpriced" | "overpriced" | "in_line";
  /** RateXAI confidence score (0..1) */
  rateXConfidence?: number;
  /** Human-readable reasoning for the RateXAI estimate */
  rateXReasoning?: string;
  /** Structured outcomes with per-outcome PM vs RX probs */
  outcomes?: AnchorOutcome[];
  /** Detailed factors driving RateXAI's probability estimate */
  factors?: AnchorFactor[];
  /** Dual probability history: PM vs RateXAI over time */
  dualProbHistory?: DualProbPoint[];

  // ─── Scenario node fields (YES/NO branches from anchors) ───
  /** For scenarios: parent anchor node ID */
  parentAnchor?: string;
  /** For scenarios: which outcome this represents */
  outcome?: "YES" | "NO" | "PARTIAL";
  /** For scenarios: probability of this outcome (0..100) */
  outcomeProbability?: number;
  /** For scenarios: conditions that must be met */
  conditions?: string[];
  /** For scenarios: what happens next if this scenario plays out */
  nextEvents?: string[];

  /** Cui Bono — who benefits / who loses from this event */
  cuiBono?: CuiBono;
}

/** Influence link from a fact node to an anchor node */
export interface AnchorInfluenceLink {
  /** Source fact node ID */
  id: string;
  /** How much this fact shifted the anchor's probability (in pp, e.g., -25) */
  influence: number;
  /** Short explanation of the causal mechanism */
  mechanism: string;
}

/** Structured outcome for an anchor node (e.g., YES/NO) */
export interface AnchorOutcome {
  label: "YES" | "NO" | "PARTIAL";
  polymarketProb: number;
  rateXProb: number;
  alpha: number;
  alphaSignal: "underpriced" | "overpriced" | "in_line";
  scenarioId?: string;
}

/** A causal factor contributing to RateXAI's probability estimate */
export interface AnchorFactor {
  nodeId: string;
  direction: "up" | "down";
  influence: number;
  /** Node weight (0..1) used in the calculation */
  weight?: number;
  mechanism: string;
  /** Extended reasoning for this factor's influence */
  reasoning?: string;
}

/** A single point in dual probability history (PM vs RateXAI) */
export interface DualProbPoint {
  date: string;
  polymarket: number;
  rateX: number;
}

// ─── Cui Bono Types ─────────────────────────────────────────

/** Single entity affected by an event (state, company, or index) */
export interface CuiBonoEntry {
  /** Entity name (e.g., "Israel", "Lockheed Martin", "Brent Crude") */
  name: string;
  /** Country ISO code or ticker symbol */
  code?: string;
  /** Delta value (e.g., +2.5 for sentiment, +3.1% for stock price) */
  delta: number;
  /** Brief reason */
  reason?: string;
}

/** Who benefits / who loses from a specific event */
export interface CuiBono {
  winners: CuiBonoEntry[];
  losers: CuiBonoEntry[];
  /** Market indices affected */
  indices?: CuiBonoEntry[];
  /** Hidden motives — "who really gains behind the scenes" */
  hiddenMotives?: string[];
}

/** Aggregated Cui Bono scoreboard for an entire narrative */
export interface NarrativeCuiBono {
  /** Country → cumulative score (positive = benefits, negative = loses) */
  countryScores: Record<string, number>;
  /** Company winners across the narrative */
  companyWinners: CuiBonoEntry[];
  /** Company losers across the narrative */
  companyLosers: CuiBonoEntry[];
  /** Index changes from start → now */
  indexChanges: CuiBonoEntry[];
}

/** A narrative is a tracked story that evolves over time */
export interface Narrative {
  id: string;
  title: string;
  category: NarrativeCategory;
  /** Current status */
  status: "active" | "resolved" | "stale";
  /** Overall sentiment trend */
  sentimentTrend: Sentiment;
  /** Current consensus market probability */
  currentProb: number;
  /** Probability when narrative started tracking */
  startProb: number;
  /** Momentum history for sparkline */
  momentumHistory?: number[];
  /** Probability history for sparkline */
  probHistory?: number[];
  /** Related prediction market URLs */
  markets?: Array<{ platform: string; question: string; url: string; prob: number }>;
  /** Named branches / sub-storylines within this narrative */
  branches?: string[];
  /** Aggregated cui bono scoreboard for the whole narrative */
  cuiBono?: NarrativeCuiBono;
}

/** Complete narrative flow dataset */
export interface NarrativeFlowData {
  nodes: NarrativeNode[];
  edges?: EventEdge[];
  timeSlots: TimeSlot[];
  /** The narrative this graph represents */
  narrative?: Narrative;
  /** All available narratives for switching */
  narratives?: Narrative[];
  project?: ProjectInfo;
  stats?: NarrativeAggregateStats;
}

export interface NarrativeAggregateStats {
  totalEvents: number;
  totalVolume: number;
  avgMomentum: number;
  /** Current market probability */
  currentProb: number;
  /** Total odds delta (net shift) */
  netOddsDelta: number;
  /** Count of catalysts vs noise */
  signalBreakdown: Record<NarrativeSignal, number>;
  categoryBreakdown: Record<NarrativeCategory, number>;
  /** Highest-impact event ID */
  topEventByImpact?: string;
  /** Biggest market mover event ID */
  topEventByOddsDelta?: string;
  sentimentBreakdown: Record<Sentiment, number>;
}

// ─── Project ────────────────────────────────────────────────────

export interface ProjectInfo {
  id: string;
  name: string;
  ticker: string;
  logoUrl?: string;
  chain?: string;
  externalId?: string;
}

// ─── Layout & Positioning ───────────────────────────────────────

export interface Point2D {
  x: number;
  y: number;
}

export interface NodePosition extends Point2D {
  id: string;
}

export interface LayoutConfig {
  padding: { top: number; right: number; bottom: number; left: number };
  minNodeSpacing: number;
  maxNodeSpacing: number;
  nodeBaseRadius: number;
  nodeWeightScale: number;
  streamWidthScale: number;
  streamMinWidth: number;
}

// ─── Component Props ────────────────────────────────────────────

export interface EventGraphProps {
  defaultMode?: ViewMode;
  eventData?: EventFlowData;
  kolData?: KolFlowData;
  narrativeData?: NarrativeFlowData;
  theme?: Partial<GraphTheme>;
  layout?: Partial<LayoutConfig>;
  showModeSwitcher?: boolean;
  showFilters?: boolean;
  showDetailPanel?: boolean;
  showZoomControls?: boolean;
  showKolStats?: boolean;
  showNarrativeStats?: boolean;
  branding?: BrandingConfig;
  onNodeSelect?: (nodeId: string, mode: ViewMode) => void;
  onNodeHover?: (nodeId: string | null, mode: ViewMode) => void;
  onModeChange?: (mode: ViewMode) => void;
  onFilterChange?: (filters: FilterState) => void;
  loading?: boolean;
  error?: string | null;
  className?: string;
  style?: React.CSSProperties;
  width?: string | number;
  height?: string | number;
}

export interface FilterState {
  activeEventTypes: Set<EventType>;
  activeTiers: Set<KolTier>;
  activePlatforms: Set<Platform>;
  activeCategories: Set<NarrativeCategory>;
  activeSignals: Set<NarrativeSignal>;
  sortField: SortField;
  sortOrder: SortOrder;
  searchQuery: string;
  timeRange?: { start: string; end: string };
  minWeight?: number;
  minImpact?: number;
  /** If true, only show narrative nodes that have a market probability reading */
  hasMarket?: boolean;
}

export interface BrandingConfig {
  name: string;
  logo?: string | React.ReactNode;
  accentColor?: string;
}

// ─── Theme ──────────────────────────────────────────────────────

export interface GraphTheme {
  bg: string;
  bgAlt: string;
  surface: string;
  card: string;
  border: string;
  borderLight: string;
  text: string;
  textSecondary: string;
  muted: string;
  /** Disabled-level text */
  disabled: string;
  accent: string;
  accentDim: string;
  /** Accent hover state */
  accentHover: string;
  positive: string;
  positiveDim: string;
  /** Darker positive for borders/down states */
  positiveDown: string;
  negative: string;
  negativeDim: string;
  /** Darker negative for borders/down states */
  negativeDown: string;
  neutral: string;
  neutralDim: string;
  /** Warning / catalyst color */
  warning: string;
  warningDim: string;
  /** Polymarket / complement color */
  complement: string;
  complementUp: string;
  complementDim: string;
  /** Font families */
  fontFamily: string;
  monoFontFamily: string;
  eventTypeColors: Record<EventType, { color: string; bg: string }>;
  kolTierColors: Record<KolTier, { color: string; bg: string }>;
  narrativeCategoryColors: Record<NarrativeCategory, { color: string; bg: string }>;
  narrativeSignalColors: Record<NarrativeSignal, { color: string; bg: string }>;
}

// ─── API Request/Response ───────────────────────────────────────

export interface EventFlowRequest {
  projectId: string;
  dateFrom: string;
  dateTo: string;
  granularity: "hour" | "day" | "week" | "month";
  types?: EventType[];
  minWeight?: number;
  minImpact?: number;
  limit?: number;
  includeEdges?: boolean;
  sentiment?: Sentiment[];
}

export interface KolFlowRequest {
  projectId: string;
  dateFrom: string;
  dateTo: string;
  tiers?: KolTier[];
  platforms?: Platform[];
  sortBy?: SortField;
  sortOrder?: SortOrder;
  limit?: number;
  minFollowers?: number;
  includePosts?: boolean;
  includeInfluence?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta: {
    total: number;
    page: number;
    limit: number;
    generatedAt: string;
    cacheHit: boolean;
    queryTimeMs: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface NarrativeFlowRequest {
  narrativeId?: string;
  dateFrom: string;
  dateTo: string;
  categories?: NarrativeCategory[];
  signals?: NarrativeSignal[];
  minWeight?: number;
  minOddsDelta?: number;
  marketPlatform?: string;
  limit?: number;
  includeEdges?: boolean;
  sentiment?: Sentiment[];
}

export type EventFlowResponse = ApiResponse<EventFlowData>;
export type KolFlowResponse = ApiResponse<KolFlowData>;
export type NarrativeFlowResponse = ApiResponse<NarrativeFlowData>;
