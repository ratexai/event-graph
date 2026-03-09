# Full Project Audit v5 — @ratexai/event-graph

**Date:** 2026-03-09
**Branch:** `claude/project-audit-gmJ4x`
**Auditor:** Claude Code (Opus 4.6)
**Previous audits:** v1→v4 (see AUDIT.md)

---

## 1. Project Summary

| Parameter | Value |
|---|---|
| **Name** | `@ratexai/event-graph` |
| **Purpose** | React visualization library: Event Flow, KOL Influence, Narrative Prediction graphs |
| **Version** | 1.0.0 |
| **License** | UNLICENSED (private) |
| **Stack** | React 18+, TypeScript 5.3+, tsup (bundler), Vite (demo), vitest (tests), ESLint |
| **Runtime deps** | 0 (peer deps: react, react-dom) |
| **Source files** | 30+ TS/TSX modules |
| **Lines of code** | ~4,774 (src/) |
| **Demo data** | ~3,100 lines (Iran conflict narrative) |
| **Build output** | ESM 254KB, CJS 280KB, DTS 39KB |
| **Graph modes** | 3 (Event Flow, KOL Influence, Narrative Flow) |
| **Backend** | Radiant — Python (FastAPI) API + Claude-powered agent pipeline |

---

## 2. Repository Structure

```
@ratexai/event-graph/
├── .github/workflows/
│   ├── ci.yml                          # CI: lint→typecheck→test→build
│   └── update-maps.yml                 # Cron: 2x/day map updates via Claude agent
├── .claude/settings.json               # Claude Code permissions
├── src/
│   ├── index.ts                        # Public barrel export
│   ├── types/index.ts                  # 40+ TypeScript interfaces & types
│   ├── api/client.ts                   # API client (retry, cache, dedup)
│   ├── hooks/                          # 7 hook modules
│   │   ├── index.ts                    # Barrel re-exports
│   │   ├── useAnimation.ts             # Continuous animation + reduced-motion
│   │   ├── useApi.ts                   # Data fetching hooks (3 modes)
│   │   ├── useContainerSize.ts         # ResizeObserver wrapper
│   │   ├── useFilters.ts              # Filter state management
│   │   ├── useGraphData.ts            # Full graph computation pipelines
│   │   ├── useIsMobile.ts             # Mobile detection hook
│   │   ├── usePanZoom.ts             # Pan/zoom (mouse + touch + pinch)
│   │   └── useSelection.ts           # Hover + select state
│   ├── utils/                          # 6 utility modules
│   │   ├── index.ts                    # Barrel re-exports
│   │   ├── layout.ts                  # Position computation (3 modes)
│   │   ├── graph.ts                   # Edge derivation, chain traversal
│   │   ├── filter.ts                  # Filtering + statistics
│   │   ├── format.ts                  # Formatting, sizing, labels
│   │   ├── svg.ts                     # SVG path utilities
│   │   └── emoji.ts                   # Tag-based emoji mapping
│   ├── styles/theme.ts                 # Theme system (colors, icons, categories)
│   └── components/
│       ├── EventGraph.tsx              # Main orchestrator (3-mode, responsive)
│       ├── EventGraph/
│       │   ├── GraphCanvas.tsx         # SVG rendering canvas
│       │   ├── TopBars.tsx            # Unified top bar (branding+modes+filters)
│       │   ├── Overlays.tsx           # Status, zoom controls, legend
│       │   └── RadiantHeader.tsx      # Radiant flyout navigation header
│       ├── EventFlow/
│       │   └── EventNode.tsx           # Event SVG node (circle+label+badge)
│       ├── KolFlow/
│       │   └── KolNode.tsx             # KOL SVG node (avatar+tier badge)
│       ├── NarrativeFlow/
│       │   ├── NarrativeNode.tsx       # Fact node (shapes, flags, categories)
│       │   ├── AnchorNode.tsx         # Polymarket anchor (diamond, dual prob)
│       │   ├── ScenarioNode.tsx       # YES/NO outcome branches
│       │   └── AnchorModal.tsx        # Full-screen anchor detail overlay
│       ├── Panel/
│       │   └── DetailPanel.tsx         # Right sidebar + tooltip
│       ├── CuiBono/
│       │   └── CuiBonoPanel.tsx        # Cui bono scoreboard sidebar
│       └── Shared/
│           ├── SvgPrimitives.tsx       # StreamPath, Grid, Sparkline, etc.
│           └── ErrorBoundary.tsx       # Error boundary wrapper
├── demo/
│   ├── index.html
│   ├── main.tsx                        # Demo app with RadiantHeader
│   ├── vite.config.ts
│   └── data/
│       ├── index.ts                    # Sample data exports
│       └── iran-conflict.ts            # Full narrative dataset (~3100 lines)
├── radiant/                            # Python backend (Radiant Phase 0)
│   ├── __init__.py
│   ├── requirements.txt               # anthropic, fastapi, uvicorn
│   ├── api/
│   │   ├── __init__.py
│   │   └── server.py                  # FastAPI server (maps, search, health)
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── config.py                  # Model config (claude-sonnet-4-5)
│   │   ├── update_map.py             # Map update agent (Claude + web search)
│   │   └── prompts/
│   │       └── map_agent.txt          # Agent system prompt
│   ├── data/
│   │   ├── registry.json              # Map registry (5 maps)
│   │   └── maps/
│   │       ├── iran-war-2026.json     # 5270 lines, 74 nodes (populated)
│   │       ├── ai-revolution.json     # Placeholder (empty)
│   │       ├── web3-world.json        # Placeholder (empty)
│   │       ├── russia-ukraine.json    # Placeholder (empty)
│   │       └── global-crisis.json     # Placeholder (empty)
│   └── scripts/
│       └── export-iran.ts             # Export utility
├── Event database test/                # NEW: test events for product integration
│   ├── iran-2026-conflict-graph-expanded.json   # 63 nodes, full event graph
│   ├── ai-revolution-prediction-map.json        # 81 nodes, AI events timeline
│   └── polymarket-verified-anchors-iran-ai.md   # 42 Polymarket markets verified
├── package.json
├── package-lock.json
├── tsconfig.json
├── eslint.config.js
├── AUDIT.md                            # Previous audit (v4)
├── PLAN.md                             # Production audit plan
├── README.md                           # Full documentation
└── LICENSE
```

---

## 3. Commit History Summary

**Total commits:** 68 (Mar 1 – Mar 5, 2026)
**PRs merged:** 16
**Active contributors:** Team + Claude Code agent

### Timeline of Major Milestones

| Date | Key Commits |
|---|---|
| **Mar 1** | Initial commit, refactor into subcomponents, first PR |
| **Mar 2** | Full audit v1-v3, NarrativeFlow mode, error boundary, a11y, tests |
| **Mar 3** | Iran narrative (55→63 nodes), multi-narrative infra, CuiBono sidebar, Polymarket anchors, probability engine v2.2 |
| **Mar 4** | Dashboard v3, front-end review, opaque fills, BubbleMap design, expressive nodes, Polymarket URLs, category refactoring, production audit v4, Day 5 data, file splits |
| **Mar 5** | Mobile responsive, Radiant header with flyouts, auto-fit zoom, Radiant Phase 0 backend |

### Branch Summary

- `main` — stable production branch (37 files)
- `claude/project-audit-gmJ4x` — development branch (+20 new files, 10K+ lines added)

### Change Scope (branch vs main)

- **57 files changed**
- **+10,243 lines added / -2,664 lines removed**
- Net: **+7,579 lines**

---

## 4. Architecture Analysis

### 4.1 Frontend Library (`src/`)

**Strengths:**
- Zero runtime dependencies — only peer deps (react, react-dom)
- Clean barrel exports with proper ESM/CJS/DTS output
- Well-split modules (was 2 monolithic files → 13 focused modules)
- 3 graph modes sharing a common architecture
- Rich type system (40+ interfaces covering all data contracts)
- Responsive design with mobile detection hook
- Accessibility: `aria-pressed`, `prefers-reduced-motion` support
- Pan/zoom with mouse, touch, and pinch support

**Architecture Pattern:**
```
EventGraph (orchestrator)
  → useGraphData (computation pipeline per mode)
    → filter → layout → edges → chain
  → usePanZoom (interaction layer)
  → useFilters (state management)
  → TopBars / GraphCanvas / Overlays / DetailPanel / CuiBonoPanel
```

### 4.2 Radiant Backend (`radiant/`)

**Status:** Phase 0 — scaffolding
**Stack:** Python 3.12, FastAPI, Anthropic SDK
**Agent model:** claude-sonnet-4-5

**Components:**
1. **API Server** — 3 endpoints: `GET /api/v1/maps`, `GET /api/v1/maps/{id}`, `GET /api/v1/search`
2. **Map Agent** — Claude-powered updater with web search tool
3. **Data Pipeline** — JSON-file based storage, registry metadata
4. **CI/CD** — GitHub Actions cron job (2x/day automatic updates)

**Data State:**
| Map | Status | Nodes | Last Updated |
|---|---|---|---|
| iran-war-2026 | active | 74 | 2026-03-04 |
| ai-revolution | active | 0 | never |
| web3-world | active | 0 | never |
| russia-ukraine | active | 0 | never |
| global-crisis | developing | 0 | never |

### 4.3 Event Database Test (new)

Three test files added to GitHub for product integration testing:

| File | Content | Nodes |
|---|---|---|
| `iran-2026-conflict-graph-expanded.json` | Full event graph with 63 nodes (Feb 20 – Mar 5) |
| `ai-revolution-prediction-map.json` | AI timeline with 81 nodes (Jan 2025 – H2 2026) |
| `polymarket-verified-anchors-iran-ai.md` | 42 verified Polymarket markets (25 Iran, 17 AI) |

**Key findings in test data:**
- Iran markets: $529M total volume on top market (US strikes), 14 ACTIVE markets
- AI markets: $16M top market (best AI model), bubble risk at 18%
- Cross-map correlation identified (crude oil, NVDA, AI bubble)
- All Polymarket URLs verified with real odds as of Mar 5

---

## 5. Code Quality Audit

### 5.1 Build & Type Safety

| Check | Status | Notes |
|---|---|---|
| TypeScript compilation | ✅ Pass | `tsc --noEmit` — zero errors |
| ESM build | ✅ Pass | 254KB |
| CJS build | ✅ Pass | 280KB |
| DTS generation | ✅ Pass | 39KB |
| ESLint | ⚠️ 2 warnings | `panelOffset` unused in Overlays.tsx and TopBars.tsx |

### 5.2 Tests

| Check | Status | Notes |
|---|---|---|
| Total tests | 72 | |
| Passing | 70 | |
| Failing | **2** | `narrativeNodeRadius` — expects 13 but gets 15, expects 17 but gets 19 |
| Root cause | Tests use old XS tier base (13px), code now uses 15px | Tests need updating |

### 5.3 Lint Warnings

```
src/components/EventGraph/Overlays.tsx:98  — 'panelOffset' unused parameter
src/components/EventGraph/TopBars.tsx:430  — 'panelOffset' unused variable
```

### 5.4 Security Review

| Area | Status | Notes |
|---|---|---|
| API client URL encoding | ✅ | `encodeURIComponent` on path/query params |
| Radiant path traversal | ✅ | ID sanitized (alphanumeric + hyphens) |
| CORS | ⚠️ | `allow_origins=["*"]` in Radiant — acceptable for dev, restrict in prod |
| Secrets | ✅ | API keys via env vars only |
| XSS | ✅ | React auto-escapes, no `dangerouslySetInnerHTML` |
| Input validation | ✅ | Types enforce valid data |

### 5.5 Performance

| Metric | Status | Notes |
|---|---|---|
| Bundle size | ✅ | 254KB ESM — reasonable for graph library |
| Zero runtime deps | ✅ | No bloat |
| Request dedup | ✅ | Concurrent identical requests share one fetch |
| Cache | ✅ | Configurable cache with max size |
| Animation | ✅ | ~12fps, respects reduced-motion |
| Render | ⚠️ | Large graphs (100+ nodes) may need virtualization |

---

## 6. Issues Found

### Critical (P0) — None

### High (P1)

| # | Issue | Location | Impact |
|---|---|---|---|
| 1 | 2 failing tests (`narrativeNodeRadius`) | `src/__tests__/utils.test.ts` | CI fails, blocks merges |
| 2 | Agent config uses deprecated model ID `claude-sonnet-4-5-20250929` | `radiant/agents/config.py` | Should use latest `claude-sonnet-4-6` |

### Medium (P2)

| # | Issue | Location | Impact |
|---|---|---|---|
| 3 | 2 unused `panelOffset` variables | `Overlays.tsx:98`, `TopBars.tsx:430` | Lint warnings in CI |
| 4 | CORS `allow_origins=["*"]` in Radiant API | `radiant/api/server.py` | Security risk in prod |
| 5 | 4 of 5 Radiant maps have 0 nodes (empty) | `radiant/data/maps/` | Only iran-war-2026 populated |
| 6 | `Event database test/` folder not in git (only GitHub web) | GitHub web UI | Can't clone/build with this data |
| 7 | No `.gitignore` rules for Python artifacts | Project root | `__pycache__`, `.env` could leak |

### Low (P3)

| # | Issue | Location | Impact |
|---|---|---|---|
| 8 | No Radiant API tests | `radiant/` | Backend untested |
| 9 | No E2E tests for UI interactions | Project-wide | Pan/zoom/filter untested in browser |
| 10 | Registry `nodeCount: 74` but actual nodes in iran-war-2026.json not verified against demo data | Data sync | Possible data drift between demo/ and radiant/data/ |
| 11 | `PLAN.md` references completed tasks (stale) | Root | Confusing for new contributors |

---

## 7. Event Database Test — Detailed Analysis

### 7.1 iran-2026-conflict-graph-expanded.json

- **63 nodes** covering Feb 20 – Mar 5, 2026
- **Top-level structure:** `timeSlots`, `narrative`, `nodes`, `rightPanel`
- **Node fields:** id, col, label, category, signal, sentiment, desc, weight, oddsDelta, marketProb, sourceAuthority, momentum, volume, from, sourceName, sourceUrl, timestamp
- **Schema compatibility:** ✅ Matches `NarrativeNode` type in `src/types/index.ts`
- **Data quality:** All nodes have sources, timestamps, and causal links (`from[]`)

### 7.2 ai-revolution-prediction-map.json

- **81 nodes** covering Jan 2025 – H2 2026
- **17 time slots**, 6 branches (categories)
- **Top-level structure:** id, title, currentProb, probHistory, timeSlots, branches, nodes, cuiBono, rightPanel
- **Schema compatibility:** ✅ Full `NarrativeFlowData` structure with cuiBono and rightPanel
- **Unique additions:** `tags` field, `extra` metadata per node
- **Data quality:** Comprehensive with real sources (Reuters, Bloomberg, NYT, etc.)

### 7.3 polymarket-verified-anchors-iran-ai.md

- **25 Iran war markets** (sorted by volume, $529M top)
- **17 AI revolution markets** (sorted by volume, $16M top)
- **Cross-map correlations** identified (oil, NVDA, AI bubble)
- **Verified facts:** NVDA market cap $4.4T, WTI ~$74.56, Khamenei killed Feb 20
- **All Polymarket URLs verified** with real-time odds as of Mar 5

---

## 8. Documentation State

| Document | Status | Notes |
|---|---|---|
| `README.md` | ✅ Current | Full API spec, usage examples, all exports documented |
| `AUDIT.md` (v4) | ⚠️ Stale | Dated Mar 4, doesn't cover Radiant or test data |
| `PLAN.md` | ⚠️ Stale | All items completed, should be archived |
| `package.json` | ✅ Current | All scripts work, exports correct |
| Radiant docs | ❌ Missing | No README for Radiant backend |
| Event database test | ❌ No docs | Files uploaded via web without context |

---

## 9. Recommendations

### Immediate (this session)

1. **Fix 2 failing tests** — update expected values in `narrativeNodeRadius` tests (13→15, 17→19)
2. **Fix 2 lint warnings** — prefix unused `panelOffset` with `_`
3. **Update agent model** — `claude-sonnet-4-5-20250929` → `claude-sonnet-4-6`

### Short-term (next sprint)

4. Add Radiant backend documentation (README in `radiant/`)
5. Integrate `Event database test/` data into proper git-tracked location
6. Add Python `.gitignore` rules (`__pycache__`, `.env`, `*.pyc`)
7. Populate remaining 4 empty maps (ai-revolution using test data as seed)
8. Add Radiant API tests (pytest)
9. Restrict CORS in production Radiant deployment

### Medium-term

10. E2E tests (Playwright) for UI interactions
11. Storybook for component library
12. Bundle size tracking in CI
13. Virtualization for large graphs (100+ nodes)
14. Archive `PLAN.md` or remove

---

## 10. Score

| Aspect | v4 Score | v5 Score | Delta | Notes |
|---|---|---|---|---|
| **Typing** | 10/10 | 10/10 | — | Zero TS errors |
| **Architecture** | 9.5/10 | 9.5/10 | — | Clean split, good patterns |
| **Performance** | 8.5/10 | 8.5/10 | — | Good for current scale |
| **API client** | 10/10 | 10/10 | — | Retry, cache, dedup |
| **Accessibility** | 9/10 | 9/10 | — | aria-pressed, reduced motion |
| **Maintainability** | 9/10 | 9/10 | — | Split modules, clear naming |
| **CI/CD** | 8/10 | 8.5/10 | +0.5 | Added Radiant cron pipeline |
| **Backend (Radiant)** | N/A | 6/10 | NEW | Phase 0, no tests, 4 empty maps |
| **Data quality** | N/A | 8.5/10 | NEW | 218 nodes across all datasets, verified sources |
| **Documentation** | 9/10 | 8/10 | -1.0 | Radiant undocumented, stale PLAN.md |
| **Test coverage** | 8/10 | 7.5/10 | -0.5 | 2 failing tests, no backend tests |
| **Production readiness** | 9.5/10 | 8.5/10 | -1.0 | Failing tests block CI |

**Overall: 8.5/10** (frontend: 9.3, backend: 6.0, data: 8.5)
