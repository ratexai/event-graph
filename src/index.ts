/* ═══════════════════════════════════════════════════════════════
   @ratexai/event-graph
   Event Flow & KOL Influence Graph Visualization Library
   ═══════════════════════════════════════════════════════════════ */

// Main Component
export { EventGraph } from "./components/EventGraph";
export type { EventGraphProps } from "./types";

// Types (all data contracts)
export type {
  Sentiment, EventType, KolTier, Platform, ViewMode, SortField, SortOrder,
  NarrativeCategory, NarrativeSignal,
  EventNode, EventEdge, EventFlowData, TimeSlot,
  KolNode, KolPost, KolFlowData, KolAggregateStats,
  NarrativeNode, Narrative, NarrativeFlowData, NarrativeAggregateStats,
  ProjectInfo, Point2D, NodePosition, LayoutConfig,
  FilterState, BrandingConfig, GraphTheme,
  EventFlowRequest, EventFlowResponse,
  KolFlowRequest, KolFlowResponse,
  NarrativeFlowRequest, NarrativeFlowResponse,
  ApiResponse,
} from "./types";

// API Client
export { EventGraphApiClient, getApiClient, clearCache, ApiError } from "./api/client";
export type { ApiConfig } from "./api/client";

// Theme
export {
  DEFAULT_THEME, mergeTheme,
  getEventTypeStyle, getKolTierStyle, getNarrativeCategoryStyle, getNarrativeSignalStyle,
  getSentimentColor, getSentimentDimColor,
  EVENT_TYPE_META, KOL_TIER_META, PLATFORM_META,
  NARRATIVE_CATEGORY_META, NARRATIVE_SIGNAL_META,
} from "./styles/theme";

// Utilities
export {
  DEFAULT_LAYOUT, mergeLayout,
  computeEventPositions, computeKolPositions, computeNarrativePositions,
  deriveEventEdges, deriveKolEdges, deriveNarrativeEdges,
  getEventChain, getKolChain, getNarrativeChain, getEventChainList,
  computeKolStats, computeNarrativeStats,
  filterEvents, filterKols, filterNarratives,
  streamPath, formatNumber, truncateLabel, wrapLabel, sentimentLabel, sentimentArrow,
  nodeRadius, kolRadius, narrativeNodeRadius, narrativeSizeTier,
  streamWidth, kolStreamWidth, narrativeStreamWidth,
  getNodeEmojis, getSourceAbbr,
} from "./utils";

// Hooks
export {
  useAnimationTime, useContainerSize, usePanZoom,
  useGraphFilters, useGraphSelection,
  useEventFlowGraph, useKolFlowGraph, useNarrativeFlowGraph,
  useEventGraphApi, useKolGraphApi, useNarrativeGraphApi,
} from "./hooks";
export type { PanZoomState } from "./hooks";

// Sub-Components (for custom composition)
export { EventNodeComponent } from "./components/EventFlow/EventNode";
export { KolNodeComponent } from "./components/KolFlow/KolNode";
export { NarrativeNodeComponent } from "./components/NarrativeFlow/NarrativeNode";
export { DetailPanel, HoverTooltip } from "./components/Panel/DetailPanel";
export type { DetailPanelProps } from "./components/Panel/DetailPanel";
export {
  StreamPath, GridColumn, FlowArrow, SentimentRing, Sparkline,
  GlowRings, ImpactRing, TierBadge,
} from "./components/Shared/SvgPrimitives";
export { GraphErrorBoundary } from "./components/Shared/ErrorBoundary";
