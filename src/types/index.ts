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

export type ViewMode = "events" | "kols";

export type SortField = "followers" | "engRate" | "reach" | "mentions" | "impact" | "date";

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
  meta?: Record<string, unknown>;
}

/** Time column descriptor */
export interface TimeSlot {
  index: number;
  label: string;
  startDate: string;
  endDate: string;
}

/** Directed edge between two event nodes */
export interface EventEdge {
  from: string;
  to: string;
  weight?: number;
  type?: "causal" | "temporal" | "reference" | "influence";
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
  theme?: Partial<GraphTheme>;
  layout?: Partial<LayoutConfig>;
  showModeSwitcher?: boolean;
  showFilters?: boolean;
  showDetailPanel?: boolean;
  showZoomControls?: boolean;
  showKolStats?: boolean;
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
  sortField: SortField;
  sortOrder: SortOrder;
  searchQuery: string;
  timeRange?: { start: string; end: string };
  minWeight?: number;
  minImpact?: number;
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
  accent: string;
  accentDim: string;
  positive: string;
  positiveDim: string;
  negative: string;
  negativeDim: string;
  neutral: string;
  neutralDim: string;
  eventTypeColors: Record<EventType, { color: string; bg: string }>;
  kolTierColors: Record<KolTier, { color: string; bg: string }>;
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

export type EventFlowResponse = ApiResponse<EventFlowData>;
export type KolFlowResponse = ApiResponse<KolFlowData>;
