# Project Audit — @ratexai/event-graph

**Date:** 2026-03-02
**Auditor:** Claude (automated)
**Branch:** claude/project-audit-gmJ4x

---

## 1. Project Overview

| Parameter | Value |
|---|---|
| **Purpose** | React visualization library for Event Flow Graph & KOL Influence Graph for RateXAI SocialFi dashboard |
| **Version** | 1.0.0 |
| **Stack** | React 18+, TypeScript 5.3+, tsup (bundler) |
| **Runtime dependencies** | 0 (peer deps only: react, react-dom) |
| **Dev dependencies** | 5 |
| **Source files** | 16 |
| **Lines of code** | ~1,800 |
| **Components** | 12 (7 exported) |
| **Hooks** | 10 |
| **Types/Interfaces** | 25+ |
| **Tests** | 0 |
| **License** | UNLICENSED (private: true) |

## 2. Architecture

```
src/
├── index.ts                     — Barrel exports
├── types/index.ts               — All TypeScript types & data contracts
├── api/client.ts                — API client with cache, retry, timeout
├── hooks/index.ts               — 10 React hooks
├── utils/index.ts               — Layout, graph traversal, filtering, formatting
├── styles/theme.ts              — Theme, colors, icons, metadata
└── components/
    ├── EventGraph.tsx            — Main orchestrator
    ├── EventGraph/TopBars.tsx    — Header, FilterBar, KolStatsBar
    ├── EventGraph/GraphCanvas.tsx— SVG canvas with pan/zoom
    ├── EventGraph/Overlays.tsx   — ZoomControls, StatusOverlay
    ├── EventFlow/EventNode.tsx   — Event SVG node
    ├── KolFlow/KolNode.tsx       — KOL SVG node
    ├── Panel/DetailPanel.tsx     — Side detail panel + HoverTooltip
    └── Shared/SvgPrimitives.tsx  — StreamPath, GridColumn, FlowArrow, Sparkline, GlowRings, etc.
```

### Strengths

- Clean separation of concerns — types, API, hooks, utils, and components in separate modules
- Comprehensive TypeScript type coverage for all frontend/backend data contracts
- Sub-path exports in package.json (`/hooks`, `/utils`, `/api`, `/theme`)
- Custom SVG rendering with zero heavy dependencies (no D3, no chart libraries)
- React.memo on SVG primitives (StreamPath, GridColumn, EventNodeComponent, KolNodeComponent)
- Built-in API client with retry, caching, AbortController timeout, singleton factory
- Full theming system with deep-merge for 15 event types + 5 KOL tiers

## 3. Issues Found

### CRITICAL / Bugs

#### 3.1. `useAnimationTime` — Performance catastrophe
**File:** `src/hooks/index.ts:24-34`

Calls `setState` on every animation frame (~60fps), causing the entire EventGraph component tree to re-render 60 times per second. This is the hook used in `EventGraph.tsx:65` and `time` is passed down to `GraphCanvas` → every node.

**Fix:** Use `useRef` + CSS animations, or pass time only to active (hovered/selected) nodes.

#### 3.2. `useGraphFilters` doesn't sync with async data loading
**File:** `src/hooks/index.ts:116-163`

`useState` is initialized once with initial `allEventTypes`/`allTiers`/`allPlatforms`. When data loads async (typical usage), these arrays start empty and populate later — but filter Sets remain empty. **Filters will show nothing.**

**Fix:** Add `useEffect` to sync filter state when input arrays change.

#### 3.3. `onHoverEnd` creates new function every render, breaking memo
**File:** `src/components/EventGraph/GraphCanvas.tsx:169, 190`

`onHoverEnd={() => onHover(null)}` — inline arrow function passed to memoized components. New reference every render nullifies `React.memo`.

#### 3.4. Dead code — unused `stack` variable
**File:** `src/utils/index.ts:134`

`const stack: string[] = [nodeId];` is declared but never used in `getEventChain`.

#### 3.5. `onFilterChange` prop declared but never called
**File:** `src/types/index.ts:204`, `src/components/EventGraph.tsx`

`EventGraphProps.onFilterChange` exists in the interface but is never invoked.

#### 3.6. Unbounded cache (memory leak)
**File:** `src/api/client.ts:37`

The `cache` Map never removes old entries. `clearCache()` exists but is manual-only.

#### 3.7. Unstable singleton in `getApiClient`
**File:** `src/api/client.ts:173-178`

Calling `getApiClient(config)` repeatedly creates new clients, invalidating old references.

#### 3.8. No SSR safety
`performance.now()`, `ResizeObserver`, `requestAnimationFrame` used without `typeof window` checks. Will crash during server-side rendering.

### MEDIUM

#### 3.9. `DetailPanel` hardcodes `100vh`
**File:** `src/components/Panel/DetailPanel.tsx:385`

Panel height `calc(100vh - 48px)` breaks when component is not full-screen.

#### 3.10. `mockSparkData` in production code
**File:** `src/components/Panel/DetailPanel.tsx:14-18`

Uses `Math.random()` to generate sparkline data. Different on each re-render, causing flicker.

#### 3.11. O(n) lookup in recursive traversal
**File:** `src/components/Panel/DetailPanel.tsx:99`

`allEvents.find()` inside recursive `trace()` is O(n) per call. Should use Map.

#### 3.12. All styles are inline
Every `style={{}}` creates new object allocations each render. No hover/focus/active states, no media queries, no responsive design.

#### 3.13. Stale useCallback dependencies
**File:** `src/components/EventGraph.tsx:96-105`

`selection` object changes every render, making `useCallback` useless.

#### 3.14. No Error Boundary
If SVG node rendering fails — entire graph crashes without fallback UI.

#### 3.15. No touch/mobile support
`usePanZoom` only handles mouse events. No touch events for mobile devices.

#### 3.16. No accessibility (a11y)
No ARIA attributes, no keyboard navigation, no `role`, no `aria-label`, no focusable nodes.

### LOW / Code Quality

| # | Issue | File |
|---|---|---|
| 3.17 | `as any` type cast for sentiment | `DetailPanel.tsx:44` |
| 3.18 | Dual export (named + default) for EventGraph | `EventGraph.tsx:233` |
| 3.19 | No `.gitignore` | root |
| 3.20 | No `.eslintrc` / `eslint.config.js` despite `lint` script | root |
| 3.21 | Zero unit tests | — |
| 3.22 | Path alias `@/*` in tsconfig but not configured in tsup | `tsconfig.json:19` |
| 3.23 | `engRate` displayed without formatting | `DetailPanel.tsx:227` |

## 4. Project State Assessment

| Aspect | Score | Notes |
|---|---|---|
| **Typing** | 9/10 | Excellent, nearly all code is strictly typed |
| **Architecture** | 8/10 | Good modularity, clean exports |
| **Performance** | 4/10 | 60fps re-renders from useAnimationTime; inline styles; broken memo |
| **API client** | 7/10 | Functional, but cache leaks, unstable singleton |
| **UX components** | 7/10 | Rich visualization, but mocks in prod, hardcoded sizes |
| **Testability** | 1/10 | 0 tests, no lint config |
| **Accessibility** | 1/10 | Completely absent |
| **SSR compatibility** | 2/10 | Will crash during server rendering |
| **Mobile/Touch** | 2/10 | Mouse only |
| **Production readiness** | 4/10 | Critical fixes needed before production |

## 5. Fix Priorities

1. **P0** — `useAnimationTime`: remove 60fps setState, refactor to ref/CSS
2. **P0** — `useGraphFilters`: sync filters when data loads
3. **P0** — `GraphCanvas`: memoize `onHoverEnd` callback
4. **P1** — SSR safety: guards for browser APIs
5. **P1** — Unbounded cache: add LRU or TTL cleanup
6. **P1** — Error boundary for GraphCanvas
7. **P2** — Touch/mobile support in `usePanZoom`
8. **P2** — Accessibility (keyboard nav, ARIA)
9. **P2** — Remove `mockSparkData` or stabilize with useMemo
10. **P3** — Tests, lint config, .gitignore
