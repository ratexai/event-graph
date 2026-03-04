/* ═══════════════════════════════════════════════════════════════
   useGraphFilters hook
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback } from "react";
import type {
  FilterState, EventType, KolTier, Platform, SortField,
  NarrativeCategory, NarrativeSignal,
} from "../types";

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

  const toggleHasMarket = useCallback(() => {
    setFilters((prev) => ({ ...prev, hasMarket: !prev.hasMarket }));
  }, []);

  return {
    filters, setFilters,
    toggleEventType, toggleTier, togglePlatform, toggleCategory, toggleSignal,
    resetEventTypes, resetCategories, setSortField, setSearchQuery, toggleHasMarket,
  };
}
