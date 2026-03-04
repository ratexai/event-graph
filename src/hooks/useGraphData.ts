/* ═══════════════════════════════════════════════════════════════
   useEventFlowGraph / useKolFlowGraph / useNarrativeFlowGraph hooks
   ═══════════════════════════════════════════════════════════════ */

import { useMemo } from "react";
import type {
  EventFlowData, KolFlowData, NarrativeFlowData,
  FilterState, LayoutConfig,
} from "../types";
import {
  computeEventPositions, computeKolPositions, computeNarrativePositions,
  deriveEventEdges, deriveKolEdges, deriveNarrativeEdges,
  getEventChain, getKolChain, getNarrativeChain,
  filterEvents, filterKols, filterNarratives,
  computeKolStats, computeNarrativeStats, mergeLayout,
} from "../utils";

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
