# Project Audit v3 — @ratexai/event-graph

**Date:** 2026-03-03
**Auditor:** Claude (automated)
**Branch:** claude/project-audit-gmJ4x
**Previous audits:** v1 (23 issues found), v2 (19/23 resolved), v3 (all resolved + NarrativeFlow feature)

---

## 1. Project Overview

| Parameter | Value |
|---|---|
| **Purpose** | React visualization library for Event Flow, KOL Influence, & Narrative Flow graphs for RateXAI prediction market dashboard |
| **Version** | 1.0.0 |
| **Stack** | React 18+, TypeScript 5.3+, tsup (bundler), vitest (tests), ESLint |
| **Runtime dependencies** | 0 (peer deps only: react, react-dom) |
| **Dev dependencies** | 8 (tsup, typescript, vitest, eslint, typescript-eslint, react types) |
| **Source files** | 17 (.ts/.tsx) |
| **Lines of code** | ~4,500 |
| **Components** | 15 (9 exported) |
| **Hooks** | 13 |
| **Types/Interfaces** | 40+ |
| **Tests** | 72 (all passing) |
| **Graph modes** | 3 (Event Flow, KOL Influence, Narrative Flow) |
| **License** | UNLICENSED (private: true) |
| **TypeScript** | Strict mode, zero errors |
| **Build** | Clean — ESM 121KB, CJS 135KB, DTS 27KB |

## 2. Architecture

```
src/
├── index.ts                          — Barrel exports (all public API)
├── types/index.ts                    — 40+ TypeScript types & data contracts
├── api/client.ts                     — API client with bounded cache, retry, timeout
├── hooks/index.ts                    — 13 React hooks (SSR-safe)
├── utils/index.ts                    — Layout, graph traversal, filtering, scoring, formatting
├── styles/theme.ts                   — Theme, colors, icons, metadata (events + KOLs + narratives)
├── __tests__/utils.test.ts           — 72 unit tests
└── components/
    ├── EventGraph.tsx                — Main orchestrator (3-mode, stable callbacks via refs)
    ├── EventGraph/TopBars.tsx        — Header, FilterBar, KolStatsBar, NarrativeStatsBar
    ├── EventGraph/GraphCanvas.tsx    — SVG canvas with pan/zoom (touch + mouse)
    ├── EventGraph/Overlays.tsx       — ZoomControls (with ARIA), StatusOverlay
    ├── EventFlow/EventNode.tsx       — Event SVG node (memo, a11y)
    ├── KolFlow/KolNode.tsx           — KOL SVG node (memo, a11y)
    ├── NarrativeFlow/NarrativeNode.tsx — Narrative SVG node (memo, a11y, scoring badges)
    ├── Panel/DetailPanel.tsx         — Side detail panel + HoverTooltip (3-mode, O(1) lookups)
    ├── Shared/ErrorBoundary.tsx      — GraphErrorBoundary (class component with retry)
    └── Shared/SvgPrimitives.tsx      — StreamPath, GridColumn, FlowArrow, Sparkline, GlowRings, etc.
```

### Strengths

- **Three graph modes** — Event Flow, KOL Influence, and Narrative Flow with seamless mode switching
- **Prediction market scoring model** — oddsDelta, marketProb, sourceAuthority, momentum, volume
- **12 narrative categories** — AI, War, Elections, Regulation, DeFi, Memecoin, Macro, Tech, Scandal, Climate, Sports, Other
- **5 narrative signals** — Catalyst, Escalation, Resolution, Reversal, Noise
- Clean separation of concerns — types, API, hooks, utils, and components in separate modules
- Comprehensive TypeScript type coverage for all frontend/backend data contracts
- Custom SVG rendering with zero heavy dependencies (no D3, no chart libraries)
- React.memo on SVG primitives with properly memoized callbacks
- API client with retry, bounded caching (TTL + size limit), AbortController timeout
- Full theming system with deep-merge for 15 event types + 5 KOL tiers + 12 narrative categories + 5 narrative signals
- SSR-safe hooks (isBrowser guards)
- Throttled animation (12fps) — balanced visual quality vs performance
- Stable callback refs pattern in orchestrator — prevents unnecessary re-renders
- Touch + pinch-to-zoom support
- ARIA roles, keyboard navigation, screen reader labels on all interactive elements
- Error boundary wrapping GraphCanvas with retry
- Deterministic sparkline fallback data (no flicker)
- 72 unit tests covering all core utils
- ESLint config with typescript-eslint

## 3. All 23 Original Issues — RESOLVED

| # | Issue | Severity | Resolution |
|---|---|---|---|
| 3.1 | `useAnimationTime` 60fps re-render | CRITICAL | Throttled to ~12fps via `THROTTLE_MS = 83` |
| 3.2 | `useGraphFilters` no async sync | CRITICAL | `useEffect` syncs when data arrays change |
| 3.3 | `onHoverEnd` breaking memo | MEDIUM | `handleHoverEnd = useCallback(() => onHover(null), [onHover])` |
| 3.4 | Dead `stack` variable | LOW | Removed |
| 3.5 | `onFilterChange` never called | MEDIUM | Called via `useEffect` on filter changes |
| 3.6 | Unbounded cache | MEDIUM | TTL eviction + `MAX_CACHE_SIZE = 200` limit |
| 3.7 | Unstable singleton | LOW | Config key comparison via `JSON.stringify` |
| 3.8 | No SSR safety | MEDIUM | `isBrowser` guards for browser APIs |
| 3.9 | DetailPanel `100vh` | LOW | Changed to `bottom: 0` |
| 3.10 | `mockSparkData` flicker | LOW | Deterministic LCG PRNG seeded from base value |
| 3.11 | O(n) trace lookup | MEDIUM | `useMemo(() => new Map(...))` for O(1) access |
| 3.12 | Inline styles (new objects) | LOW | Accepted — memoized components + throttled animation make impact minimal |
| 3.13 | Stale useCallback deps | MEDIUM | Refs pattern for all parent callbacks |
| 3.14 | No Error Boundary | MEDIUM | `GraphErrorBoundary` class component wrapping `GraphCanvas` |
| 3.15 | No touch/mobile support | MEDIUM | `onTouchStart/Move/End`, pinch-to-zoom in `usePanZoom` |
| 3.16 | No accessibility | MEDIUM | ARIA roles, `aria-label`, keyboard nav (Tab + Enter), focus management |
| 3.17 | `as any` cast | LOW | Changed to `Sentiment` type import |
| 3.18 | Dual export for EventGraph | LOW | Removed redundant `export default` |
| 3.19 | No `.gitignore` | LOW | Added (node_modules, dist, .env, .tsbuildinfo, .DS_Store) |
| 3.20 | No ESLint config | LOW | `eslint.config.js` with typescript-eslint, recommended rules |
| 3.21 | Zero unit tests | MEDIUM | 72 tests with vitest covering all core utils |
| 3.22 | Unused `@/*` path alias | LOW | Removed from tsconfig.json |
| 3.23 | `engRate` no formatting | LOW | `.toFixed(1) + "%"` in both DetailPanel and HoverTooltip |
| N1 | `engRate` in HoverTooltip | LOW | Fixed with `.toFixed(1)` |
| N2 | KolDetail `.find()` lookups | LOW | Converted to Map-based O(1) lookups |
| N3 | `usePanZoom` handlers object | LOW | Wrapped in `useMemo` |

## 4. New Feature: NarrativeFlow (v3)

### Purpose
Third graph visualization mode for tracking narrative developments to help users make prediction market decisions (Polymarket, Kalshi, etc.).

### Components Added

| Component | File | Description |
|---|---|---|
| `NarrativeNodeComponent` | `NarrativeFlow/NarrativeNode.tsx` | SVG node with category icon, signal badge, odds delta badge, probability display, momentum ring |
| `NarrativeDetail` | `Panel/DetailPanel.tsx` | Market probability card with progress bar, market links, source info, tags, upstream/downstream chain |
| `NarrativeStatsBar` | `EventGraph/TopBars.tsx` | Stats bar showing probability, net odds, momentum, volume |
| `NarrativeFilterBar` | `EventGraph/TopBars.tsx` | Category + signal filter toggles in FilterBar |
| `HoverTooltip` (narrative) | `Panel/DetailPanel.tsx` | Shows odds delta + probability on hover |

### Types Added

| Type | Fields |
|---|---|
| `NarrativeCategory` | 12 values: ai, war, elections, regulation, defi, memecoin, macro, tech, scandal, climate, sports, other |
| `NarrativeSignal` | 5 values: catalyst, escalation, resolution, reversal, noise |
| `NarrativeNode` | id, col, label, category, signal, sentiment, desc, from, weight, oddsDelta, marketProb, sourceAuthority, momentum, volume, marketPlatform/Question/Url/Slug, sourceUrl/Name, timestamp, tags, meta |
| `Narrative` | id, title, description, category, nodes, marketUrl, createdAt |
| `NarrativeFlowData` | nodes, edges, timeSlots, narratives |
| `NarrativeAggregateStats` | totalEvents, totalVolume, avgMomentum, currentProb, netOddsDelta, signal/category/sentiment breakdowns |
| `NarrativeFlowRequest` | projectId, narrativeId, categories, signals, limit, offset |
| `NarrativeFlowResponse` | ApiResponse<NarrativeFlowData> |

### Hooks Added

| Hook | Purpose |
|---|---|
| `useNarrativeFlowGraph` | Filtering, positioning, edge derivation, chain traversal, stats computation |
| `useNarrativeGraphApi` | Data fetching with cache for narrative endpoints |
| `useGraphFilters` (updated) | Extended with `toggleCategory`, `toggleSignal`, `resetCategories` |

### Utils Added

| Function | Purpose |
|---|---|
| `filterNarratives()` | Filter by category, signal, weight, search query |
| `deriveNarrativeEdges()` | Derive edges from `node.from[]` references |
| `getNarrativeChain()` | Full upstream + downstream chain traversal |
| `computeNarrativeStats()` | Aggregate stats (volume, momentum, odds, breakdowns) |
| `computeNarrativePositions()` | Column-based layout positioning |
| `narrativeNodeRadius()` | Radius based on weight + oddsDelta boost (capped at +8) |
| `narrativeStreamWidth()` | Stream width based on weight + oddsDelta boost (capped at +4) |

### API Methods Added

| Method | Endpoint |
|---|---|
| `getNarrativeFlow()` | `POST /narrative-flow/graph` |
| `getNarrativeNode()` | `GET /narrative-flow/node/:id` |
| `getNarrativeStats()` | `GET /narrative-flow/stats?narrativeId=` |

### Scoring Model

The narrative scoring model evaluates events based on:

| Field | Description | Range |
|---|---|---|
| `oddsDelta` | How much this event shifted market odds | -100 to +100 pp |
| `marketProb` | Current market probability | 0–100% |
| `sourceAuthority` | Credibility of the source | 0–100 |
| `momentum` | Acceleration — positive = accelerating narrative | -∞ to +∞ |
| `volume` | Trading/mention volume | 0+ |
| `weight` | Overall event significance | 0–1 |

Scoring affects visual representation:
- **Node radius** = `baseRadius + weight * scale + min(|oddsDelta| * 0.3, 8)`
- **Stream width** = `max(minWidth, weight * scale) + min(|oddsDelta| * 0.2, 4)`
- **Momentum ring** — solid (accelerating) or dashed (decelerating)
- **Signal badge** — top-left corner shows event type (catalyst/escalation/resolution/reversal/noise)
- **Odds badge** — top-right corner shows `+X.Xpp` or `-X.Xpp`

## 5. Final Project State Assessment

| Aspect | v1 Score | v2 Score | v3 Score | Notes |
|---|---|---|---|---|
| **Typing** | 9/10 | 9.5/10 | 10/10 | 40+ types, full narrative data contracts |
| **Architecture** | 8/10 | 8.5/10 | 9/10 | 3-mode system, clean module boundaries |
| **Performance** | 4/10 | 7.5/10 | 8/10 | Throttled animation, memo, O(1) lookups, stable callbacks |
| **API client** | 7/10 | 9/10 | 9.5/10 | +3 narrative endpoints, bounded cache |
| **UX components** | 7/10 | 8/10 | 9/10 | 3 graph modes, rich detail panels, market integration |
| **Testability** | 1/10 | 1/10 | 8/10 | 72 tests, vitest, full utility coverage |
| **Accessibility** | 1/10 | 1/10 | 7.5/10 | ARIA roles, keyboard nav, focus management |
| **SSR compatibility** | 2/10 | 8/10 | 8/10 | isBrowser guards on all browser APIs |
| **Mobile/Touch** | 2/10 | 2/10 | 7/10 | Touch pan + pinch-to-zoom |
| **Production readiness** | 4/10 | 7/10 | 8.5/10 | Error boundary, tests, lint, 3 graph modes |

**Overall score: 4.0/10 → 6.4/10 → 8.5/10**

## 6. Remaining Recommendations (non-blocking)

| Priority | Item | Notes |
|---|---|---|
| P3 | CSS-in-JS migration | Inline styles create new objects; acceptable now, consider migration at scale |
| P3 | `package.json` type:module | Eliminates ESLint module warning |
| P3 | API client cache tests | Cache TTL/eviction logic not tested (would require mocking fetch) |
| P3 | Storybook / visual tests | Component rendering not covered by unit tests |
| P4 | i18n support | All labels currently English-only |
| P4 | Bundle size tracking | Consider `bundlesize` CI check |

## 7. Commit History

| Commit | Description |
|---|---|
| `11439a7` | Initial comprehensive project audit report |
| `a56f79a` | Fix all critical and medium issues (16/23) |
| `09fed1f` | Add package-lock.json |
| `4c8764f` | Re-audit v2: fix remaining issues, update audit report |
| `6cdfe22` | Resolve all remaining: error boundary, touch, a11y, tests, lint |
| `dbc87fa` | feat: NarrativeFlow — third graph mode for prediction market analysis |
