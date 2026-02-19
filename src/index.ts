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
  EventNode, EventEdge, EventFlowData, TimeSlot,
  KolNode, KolPost, KolFlowData, KolAggregateStats,
  ProjectInfo, Point2D, NodePosition, LayoutConfig,
  FilterState, BrandingConfig, GraphTheme,
  EventFlowRequest, EventFlowResponse, KolFlowRequest, KolFlowResponse, ApiResponse,
} from "./types";

// API Client
export { EventGraphApiClient, getApiClient, clearCache, ApiError } from "./api/client";
export type { ApiConfig } from "./api/client";

// Theme
export {
  DEFAULT_THEME, mergeTheme,
  getEventTypeStyle, getKolTierStyle, getSentimentColor, getSentimentDimColor,
  EVENT_TYPE_META, KOL_TIER_META, PLATFORM_META,
} from "./styles/theme";

// Utilities
export {
  DEFAULT_LAYOUT, mergeLayout,
  computeEventPositions, computeKolPositions,
  deriveEventEdges, deriveKolEdges,
  getEventChain, getKolChain, getEventChainList,
  computeKolStats, filterEvents, filterKols,
  streamPath, formatNumber, truncateLabel, sentimentLabel, sentimentArrow,
  nodeRadius, kolRadius, streamWidth, kolStreamWidth,
} from "./utils";

// Hooks
export {
  useAnimationTime, useContainerSize, usePanZoom,
  useGraphFilters, useGraphSelection,
  useEventFlowGraph, useKolFlowGraph,
  useEventGraphApi, useKolGraphApi,
} from "./hooks";
export type { PanZoomState } from "./hooks";

// Sub-Components (for custom composition)
export { EventNodeComponent } from "./components/EventFlow/EventNode";
export { KolNodeComponent } from "./components/KolFlow/KolNode";
export { DetailPanel, HoverTooltip } from "./components/Panel/DetailPanel";
export type { DetailPanelProps } from "./components/Panel/DetailPanel";
export {
  StreamPath, GridColumn, FlowArrow, SentimentRing, Sparkline,
  GlowRings, ImpactRing, TierBadge,
} from "./components/Shared/SvgPrimitives";
