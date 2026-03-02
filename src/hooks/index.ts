/* ═══════════════════════════════════════════════════════════════
   @ratexai/event-graph — React Hooks
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type {
  EventNode, KolNode, NarrativeNode, EventFlowData, KolFlowData, NarrativeFlowData,
  ViewMode, FilterState, EventType, KolTier, Platform, SortField,
  NarrativeCategory, NarrativeSignal,
  LayoutConfig, EventFlowRequest, KolFlowRequest, NarrativeFlowRequest,
} from "../types";
import { EventGraphApiClient } from "../api/client";
import {
  computeEventPositions, computeKolPositions, computeNarrativePositions,
  deriveEventEdges, deriveKolEdges, deriveNarrativeEdges,
  getEventChain, getKolChain, getNarrativeChain,
  filterEvents, filterKols, filterNarratives,
  computeKolStats, computeNarrativeStats, mergeLayout,
  type ComputedPositions,
} from "../utils";

const isBrowser = typeof window !== "undefined";

// ─── useAnimationTime ───────────────────────────────────────────

/** Continuously incrementing time value in seconds (for SVG animations).
 *  Throttled to ~12fps to avoid re-rendering the entire tree at 60fps. */
export function useAnimationTime(): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!isBrowser) return;
    let af: number;
    const start = performance.now();
    let lastUpdate = 0;
    const THROTTLE_MS = 83; // ~12fps — sufficient for glow animations
    const tick = (now: number) => {
      if (now - lastUpdate >= THROTTLE_MS) {
        setT((now - start) / 1000);
        lastUpdate = now;
      }
      af = requestAnimationFrame(tick);
    };
    af = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(af);
  }, []);
  return t;
}

// ─── useContainerSize ───────────────────────────────────────────

export function useContainerSize(ref: React.RefObject<HTMLElement | null>) {
  const [dims, setDims] = useState({ w: 1200, h: 700 });
  useEffect(() => {
    if (!isBrowser) return;
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
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
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
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartZoom = useRef(1);

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

  // Touch: compute distance between two fingers
  const touchDist = (t: React.TouchList) => {
    if (t.length < 2) return 0;
    const dx = t[0].clientX - t[1].clientX;
    const dy = t[0].clientY - t[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch-to-zoom start
      pinchStartDist.current = touchDist(e.touches);
      pinchStartZoom.current = zoomRef.current;
    } else if (e.touches.length === 1) {
      if ((e.target as HTMLElement).closest(`.${nodeClassName}`)) return;
      isPanningRef.current = true;
      setIsPanning(true);
      dragStart.current = {
        x: e.touches[0].clientX - panRef.current.x,
        y: e.touches[0].clientY - panRef.current.y,
      };
    }
  }, [nodeClassName]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDist.current) {
      // Pinch-to-zoom
      const dist = touchDist(e.touches);
      const scale = dist / pinchStartDist.current;
      setZoom(Math.max(minZoom, Math.min(maxZoom, pinchStartZoom.current * scale)));
    } else if (e.touches.length === 1 && isPanningRef.current && dragStart.current) {
      // Pan
      setPan({
        x: e.touches[0].clientX - dragStart.current.x,
        y: e.touches[0].clientY - dragStart.current.y,
      });
    }
  }, [minZoom, maxZoom]);

  const onTouchEnd = useCallback(() => {
    isPanningRef.current = false;
    setIsPanning(false);
    dragStart.current = null;
    pinchStartDist.current = null;
  }, []);

  const handlers = useMemo(() => ({
    onWheel, onMouseDown, onMouseMove, onMouseUp, onMouseLeave: onMouseUp,
    onTouchStart, onTouchMove, onTouchEnd,
  }), [onWheel, onMouseDown, onMouseMove, onMouseUp, onTouchStart, onTouchMove, onTouchEnd]);

  return {
    zoom, pan, isPanning,
    handlers,
    zoomIn: useCallback(() => setZoom((z) => Math.min(maxZoom, z + zoomStep)), [maxZoom, zoomStep]),
    zoomOut: useCallback(() => setZoom((z) => Math.max(minZoom, z - zoomStep)), [minZoom, zoomStep]),
    reset: useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []),
  };
}

// ─── useGraphFilters ────────────────────────────────────────────

export function useGraphFilters(
  allEventTypes: EventType[], allTiers: KolTier[], allPlatforms: Platform[],
  allCategories: NarrativeCategory[] = [], allSignals: NarrativeSignal[] = [],
) {
  const [filters, setFilters] = useState<FilterState>({
    activeEventTypes: new Set(allEventTypes),
    activeTiers: new Set(allTiers),
    activePlatforms: new Set(allPlatforms),
    activeCategories: new Set(allCategories),
    activeSignals: new Set(allSignals),
    sortField: "followers",
    sortOrder: "desc",
    searchQuery: "",
  });

  // Sync filter sets when available data changes (e.g., async load)
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      activeEventTypes: new Set(allEventTypes),
      activeTiers: new Set(allTiers),
      activePlatforms: new Set(allPlatforms),
      activeCategories: new Set(allCategories),
      activeSignals: new Set(allSignals),
    }));
  }, [allEventTypes, allTiers, allPlatforms, allCategories, allSignals]);

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

  const toggleCategory = useCallback((category: NarrativeCategory) => {
    setFilters((prev) => {
      const next = new Set(prev.activeCategories);
      next.has(category) ? next.delete(category) : next.add(category);
      return { ...prev, activeCategories: next };
    });
  }, []);

  const toggleSignal = useCallback((signal: NarrativeSignal) => {
    setFilters((prev) => {
      const next = new Set(prev.activeSignals);
      next.has(signal) ? next.delete(signal) : next.add(signal);
      return { ...prev, activeSignals: next };
    });
  }, []);

  const resetEventTypes = useCallback(() => {
    setFilters((prev) => ({ ...prev, activeEventTypes: new Set(allEventTypes) }));
  }, [allEventTypes]);

  const resetCategories = useCallback(() => {
    setFilters((prev) => ({ ...prev, activeCategories: new Set(allCategories) }));
  }, [allCategories]);

  const setSortField = useCallback((field: SortField) => {
    setFilters((prev) => ({ ...prev, sortField: field }));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  return {
    filters, setFilters,
    toggleEventType, toggleTier, togglePlatform, toggleCategory, toggleSignal,
    resetEventTypes, resetCategories, setSortField, setSearchQuery,
  };
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
  }, [client, serialized]); 
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
  }, [client, serialized]);
  return { data, loading, error, setData };
}

// ─── useNarrativeFlowGraph ──────────────────────────────────────

export function useNarrativeFlowGraph(
  data: NarrativeFlowData | undefined,
  graphWidth: number,
  graphHeight: number,
  filters: FilterState,
  hoveredId: string | null,
  layoutConfig?: Partial<LayoutConfig>,
) {
  const layout = useMemo(() => mergeLayout(layoutConfig), [layoutConfig]);

  const filtered = useMemo(
    () => (data ? filterNarratives(data.nodes, filters) : []),
    [data, filters],
  );

  const edges = useMemo(
    () => data?.edges ?? deriveNarrativeEdges(filtered),
    [data?.edges, filtered],
  );

  const positions = useMemo(
    () => computeNarrativePositions(filtered, graphWidth, graphHeight, layout),
    [filtered, graphWidth, graphHeight, layout],
  );

  const activeChain = useMemo(
    () => (hoveredId && data ? getNarrativeChain(hoveredId, data.nodes) : new Set<string>()),
    [hoveredId, data],
  );

  const stats = useMemo(() => computeNarrativeStats(filtered), [filtered]);

  const maxCol = useMemo(
    () => Math.max(...(filtered.length ? filtered.map((n) => n.col) : [0]), 1),
    [filtered],
  );

  return { filtered, edges, positions, activeChain, stats, maxCol, layout };
}

// ─── useNarrativeGraphApi ───────────────────────────────────────

export function useNarrativeGraphApi(client: EventGraphApiClient, request: NarrativeFlowRequest | null) {
  const [data, setData] = useState<NarrativeFlowData | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const serialized = useStableRequest(request);

  useEffect(() => {
    if (!request || !serialized) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    client.getNarrativeFlow(request)
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [client, serialized]);
  return { data, loading, error, setData };
}
