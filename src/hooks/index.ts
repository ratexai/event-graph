/* ═══════════════════════════════════════════════════════════════
   @ratexai/event-graph — React Hooks
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type {
  EventNode, KolNode, EventFlowData, KolFlowData,
  ViewMode, FilterState, EventType, KolTier, Platform, SortField,
  LayoutConfig, EventFlowRequest, KolFlowRequest,
} from "../types";
import { EventGraphApiClient } from "../api/client";
import {
  computeEventPositions, computeKolPositions,
  deriveEventEdges, deriveKolEdges,
  getEventChain, getKolChain,
  filterEvents, filterKols,
  computeKolStats, mergeLayout,
  type ComputedPositions,
} from "../utils";

// ─── useAnimationTime ───────────────────────────────────────────

/** Continuously incrementing time value in seconds (for SVG animations) */
export function useAnimationTime(): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    let af: number;
    const start = performance.now();
    const tick = (now: number) => { setT((now - start) / 1000); af = requestAnimationFrame(tick); };
    af = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(af);
  }, []);
  return t;
}

// ─── useContainerSize ───────────────────────────────────────────

export function useContainerSize(ref: React.RefObject<HTMLElement | null>) {
  const [dims, setDims] = useState({ w: 1200, h: 700 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setDims({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return dims;
}

// ─── usePanZoom ─────────────────────────────────────────────────

export interface PanZoomState {
  zoom: number;
  pan: { x: number; y: number };
  isPanning: boolean;
  handlers: {
    onWheel: (e: React.WheelEvent) => void;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
  };
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
}

export function usePanZoom(opts?: {
  minZoom?: number; maxZoom?: number; zoomStep?: number; nodeClassName?: string;
}): PanZoomState {
  const { minZoom = 0.35, maxZoom = 2.5, zoomStep = 0.15, nodeClassName = "nd" } = opts || {};
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const [isPanning, setIsPanning] = useState(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const panRef = useRef(pan);
  panRef.current = pan;

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(minZoom, Math.min(maxZoom, z - e.deltaY * 0.001)));
  }, [minZoom, maxZoom]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(`.${nodeClassName}`)) return;
    isPanningRef.current = true;
    setIsPanning(true);
    dragStart.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
  }, [nodeClassName]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanningRef.current || !dragStart.current) return;
    setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  }, []);

  const onMouseUp = useCallback(() => {
    isPanningRef.current = false;
    setIsPanning(false);
    dragStart.current = null;
  }, []);

  return {
    zoom, pan, isPanning,
    handlers: { onWheel, onMouseDown, onMouseMove, onMouseUp, onMouseLeave: onMouseUp },
    zoomIn: useCallback(() => setZoom((z) => Math.min(maxZoom, z + zoomStep)), [maxZoom, zoomStep]),
    zoomOut: useCallback(() => setZoom((z) => Math.max(minZoom, z - zoomStep)), [minZoom, zoomStep]),
    reset: useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []),
  };
}

// ─── useGraphFilters ────────────────────────────────────────────

export function useGraphFilters(allEventTypes: EventType[], allTiers: KolTier[], allPlatforms: Platform[]) {
  const [filters, setFilters] = useState<FilterState>({
    activeEventTypes: new Set(allEventTypes),
    activeTiers: new Set(allTiers),
    activePlatforms: new Set(allPlatforms),
    sortField: "followers",
    sortOrder: "desc",
    searchQuery: "",
  });

  const toggleEventType = useCallback((type: EventType) => {
    setFilters((prev) => {
      const next = new Set(prev.activeEventTypes);
      next.has(type) ? next.delete(type) : next.add(type);
      return { ...prev, activeEventTypes: next };
    });
  }, []);

  const toggleTier = useCallback((tier: KolTier) => {
    setFilters((prev) => {
      const next = new Set(prev.activeTiers);
      next.has(tier) ? next.delete(tier) : next.add(tier);
      return { ...prev, activeTiers: next };
    });
  }, []);

  const togglePlatform = useCallback((platform: Platform) => {
    setFilters((prev) => {
      const next = new Set(prev.activePlatforms);
      next.has(platform) ? next.delete(platform) : next.add(platform);
      return { ...prev, activePlatforms: next };
    });
  }, []);

  const resetEventTypes = useCallback(() => {
    setFilters((prev) => ({ ...prev, activeEventTypes: new Set(allEventTypes) }));
  }, [allEventTypes]);

  const setSortField = useCallback((field: SortField) => {
    setFilters((prev) => ({ ...prev, sortField: field }));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  return { filters, setFilters, toggleEventType, toggleTier, togglePlatform, resetEventTypes, setSortField, setSearchQuery };
}

// ─── useGraphSelection ──────────────────────────────────────────

export function useGraphSelection() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const selectNode = useCallback((id: string) => { setSelected(id); setPanelOpen(true); }, []);
  const closePanel = useCallback(() => { setPanelOpen(false); setSelected(null); }, []);

  return { hovered, setHovered, selected, setSelected: selectNode, panelOpen, closePanel };
}

// ─── useEventFlowGraph ──────────────────────────────────────────

export function useEventFlowGraph(
  data: EventFlowData | undefined,
  graphWidth: number,
  graphHeight: number,
  filters: FilterState,
  hoveredId: string | null,
  layoutConfig?: Partial<LayoutConfig>,
) {
  const layout = useMemo(() => mergeLayout(layoutConfig), [layoutConfig]);

  const filtered = useMemo(
    () => (data ? filterEvents(data.nodes, filters) : []),
    [data, filters],
  );

  const edges = useMemo(
    () => data?.edges ?? deriveEventEdges(filtered),
    [data?.edges, filtered],
  );

  const positions = useMemo(
    () => computeEventPositions(filtered, graphWidth, graphHeight, layout),
    [filtered, graphWidth, graphHeight, layout],
  );

  const activeChain = useMemo(
    () => (hoveredId && data ? getEventChain(hoveredId, data.nodes) : new Set<string>()),
    [hoveredId, data],
  );

  const maxCol = useMemo(
    () => Math.max(...(filtered.length ? filtered.map((n) => n.col) : [0]), 1),
    [filtered],
  );

  return { filtered, edges, positions, activeChain, maxCol, layout };
}

// ─── useKolFlowGraph ────────────────────────────────────────────

export function useKolFlowGraph(
  data: KolFlowData | undefined,
  graphWidth: number,
  graphHeight: number,
  filters: FilterState,
  hoveredId: string | null,
  layoutConfig?: Partial<LayoutConfig>,
) {
  const layout = useMemo(() => mergeLayout(layoutConfig), [layoutConfig]);

  const filtered = useMemo(
    () => (data ? filterKols(data.nodes, filters) : []),
    [data, filters],
  );

  const edges = useMemo(() => deriveKolEdges(filtered), [filtered]);

  const positions = useMemo(
    () => computeKolPositions(filtered, graphWidth, graphHeight, layout),
    [filtered, graphWidth, graphHeight, layout],
  );

  const activeChain = useMemo(
    () => (hoveredId && data ? getKolChain(hoveredId, data.nodes) : new Set<string>()),
    [hoveredId, data],
  );

  const stats = useMemo(() => computeKolStats(filtered), [filtered]);

  const maxCol = useMemo(
    () => Math.max(...(filtered.length ? filtered.map((n) => n.col) : [0]), 1),
    [filtered],
  );

  return { filtered, edges, positions, activeChain, stats, maxCol, layout };
}

// ─── Data Fetching Hooks ────────────────────────────────────────

/** Stable serialization for request objects used as effect dependencies */
function useStableRequest<T>(request: T | null): string {
  return useMemo(() => (request ? JSON.stringify(request) : ""), [request]);
}

export function useEventGraphApi(client: EventGraphApiClient, request: EventFlowRequest | null) {
  const [data, setData] = useState<EventFlowData | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const serialized = useStableRequest(request);

  useEffect(() => {
    if (!request || !serialized) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    client.getEventFlow(request)
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [client, serialized]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, setData };
}

export function useKolGraphApi(client: EventGraphApiClient, request: KolFlowRequest | null) {
  const [data, setData] = useState<KolFlowData | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const serialized = useStableRequest(request);

  useEffect(() => {
    if (!request || !serialized) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    client.getKolFlow(request)
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [client, serialized]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, setData };
}
