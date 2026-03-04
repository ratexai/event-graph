# @ratexai/event-graph

Standardized **Event Flow Graph**, **KOL Influence Graph**, and **Narrative Prediction Graph** visualization library for the RateXAI SocialFi / InfoFi dashboard.

## Architecture

```
@ratexai/event-graph/
├── src/
│   ├── index.ts                              # Barrel export
│   ├── types/index.ts                        # All TypeScript types & data contracts
│   ├── api/client.ts                         # API client with caching & retry
│   ├── hooks/
│   │   ├── index.ts                          # Barrel exports
│   │   ├── useAnimation.ts                   # Continuous animation time
│   │   ├── useApi.ts                         # Data fetching hooks
│   │   ├── useContainerSize.ts               # ResizeObserver container tracking
│   │   ├── useFilters.ts                     # Filter state management
│   │   ├── useGraphData.ts                   # Full graph pipelines
│   │   ├── usePanZoom.ts                     # Zoom + pan state
│   │   └── useSelection.ts                   # Hover + select state
│   ├── utils/
│   │   ├── index.ts                          # Barrel exports
│   │   ├── layout.ts                         # Position computation
│   │   ├── graph.ts                          # Edge derivation, traversal
│   │   ├── filter.ts                         # Filtering logic
│   │   ├── format.ts                         # Formatting, sizing
│   │   ├── svg.ts                            # SVG path utilities
│   │   └── emoji.ts                          # Emoji helpers
│   ├── styles/theme.ts                       # Theme, colors, icons, labels
│   └── components/
│       ├── EventGraph.tsx                    # Main orchestrator component
│       ├── EventGraph/
│       │   ├── GraphCanvas.tsx               # SVG rendering canvas
│       │   ├── TopBars.tsx                   # TopBar (branding+modes+filters), stats bars
│       │   └── Overlays.tsx                  # Status, zoom controls, legend
│       ├── EventFlow/
│       │   └── EventNode.tsx                 # Event SVG node
│       ├── KolFlow/
│       │   └── KolNode.tsx                   # KOL SVG node
│       ├── NarrativeFlow/
│       │   ├── NarrativeNode.tsx             # Narrative fact node
│       │   ├── AnchorNode.tsx                # Polymarket anchor node
│       │   ├── ScenarioNode.tsx              # YES/NO outcome scenario node
│       │   └── AnchorModal.tsx               # Full-screen anchor detail overlay
│       ├── Panel/
│       │   └── DetailPanel.tsx               # Right sidebar detail view + tooltip
│       ├── CuiBono/
│       │   └── CuiBonoPanel.tsx              # Cui bono scoreboard sidebar
│       └── Shared/
│           ├── SvgPrimitives.tsx             # StreamPath, Grid, Sparkline, etc.
│           └── ErrorBoundary.tsx             # Error boundary wrapper
├── demo/
│   ├── index.html
│   ├── main.tsx                              # Demo app
│   ├── vite.config.ts
│   └── data/
│       ├── index.ts                          # Sample data exports
│       └── iran-conflict.ts                  # Narrative dataset (~2800 lines)
├── package.json
└── tsconfig.json
```

---

## Quick Start

### 1. Install

```bash
# Copy into your project as a local package
cp -r ratexai-event-graph/ packages/event-graph/

# Or add as workspace in monorepo root package.json:
# "workspaces": ["packages/*"]
```

### 2. Basic Usage

```tsx
import { EventGraph } from "@ratexai/event-graph";
import type { NarrativeFlowData } from "@ratexai/event-graph";

export default function SocialFiPage() {
  const [narrativeData, setNarrativeData] = useState<NarrativeFlowData>();

  useEffect(() => {
    fetch("/api/v1/narrative-flow/graph", {
      method: "POST",
      body: JSON.stringify({
        narrativeId: "iran-conflict-2025",
        dateFrom: "2025-02-01",
        dateTo: "2025-04-01",
      }),
    })
      .then(r => r.json())
      .then(res => setNarrativeData(res.data));
  }, []);

  return (
    <EventGraph
      narrativeData={narrativeData}
      defaultMode="narratives"
      branding={{ name: "RateXAI", accentColor: "#00e5a0" }}
      onNodeSelect={(id, mode) => console.log(`Selected ${mode} node:`, id)}
    />
  );
}
```

### 3. All Three Modes

```tsx
import { EventGraph } from "@ratexai/event-graph";
import type { EventFlowData, KolFlowData, NarrativeFlowData } from "@ratexai/event-graph";

function Dashboard() {
  const [eventData, setEventData] = useState<EventFlowData>();
  const [kolData, setKolData] = useState<KolFlowData>();
  const [narrativeData, setNarrativeData] = useState<NarrativeFlowData>();

  // ... fetch data

  return (
    <EventGraph
      eventData={eventData}
      kolData={kolData}
      narrativeData={narrativeData}
      defaultMode="narratives"
      showModeSwitcher
      showFilters
      showDetailPanel
    />
  );
}
```

### 4. Using the API Client

```tsx
import { EventGraph, EventGraphApiClient, useNarrativeGraphApi } from "@ratexai/event-graph";

const apiClient = new EventGraphApiClient({
  baseUrl: "https://api.ratexai.com/v1",
  token: "your-bearer-token",
});

function NarrativeDashboard({ narrativeId }: { narrativeId: string }) {
  const narrativeApi = useNarrativeGraphApi(apiClient, {
    narrativeId,
    dateFrom: "2025-02-01",
    dateTo: "2025-04-01",
  });

  return (
    <EventGraph
      narrativeData={narrativeApi.data}
      loading={narrativeApi.loading}
      error={narrativeApi.error}
    />
  );
}
```

### 5. Custom Composition (without main component)

```tsx
import {
  useNarrativeFlowGraph, useAnimationTime, usePanZoom,
  useGraphFilters, useGraphSelection,
  NarrativeNodeComponent, AnchorNodeComponent, ScenarioNodeComponent,
  StreamPath, AnchorModal, CuiBonoPanel,
  computeNarrativePositions, computeNarrativeStats,
} from "@ratexai/event-graph";

// Use individual hooks and components for full control
// over layout and behavior
```

---

## Component Props

```typescript
interface EventGraphProps {
  defaultMode?: "events" | "kols" | "narratives";  // Initial view (default: "narratives")
  eventData?: EventFlowData;              // Event flow data
  kolData?: KolFlowData;                  // KOL flow data
  narrativeData?: NarrativeFlowData;      // Narrative flow data
  theme?: Partial<GraphTheme>;            // Theme overrides
  layout?: Partial<LayoutConfig>;         // Layout overrides
  showModeSwitcher?: boolean;             // Show mode toggle (default: true)
  showFilters?: boolean;                  // Show filter bar (default: true)
  showDetailPanel?: boolean;              // Show detail panel (default: true)
  showZoomControls?: boolean;             // Show zoom buttons (default: true)
  showKolStats?: boolean;                 // Show KOL stats bar (default: true)
  showNarrativeStats?: boolean;           // Show narrative stats bar (default: true)
  branding?: BrandingConfig;              // Logo and name
  onNodeSelect?: (id, mode) => void;      // Node selection callback
  onNodeHover?: (id, mode) => void;       // Node hover callback
  onModeChange?: (mode) => void;          // Mode change callback
  onFilterChange?: (filters) => void;     // Filter change callback
  loading?: boolean;                      // Loading state
  error?: string | null;                  // Error message
  className?: string;                     // CSS class
  style?: React.CSSProperties;           // Inline styles
  width?: string | number;                // Width (default: "100%")
  height?: string | number;               // Height (default: "100vh")
}
```

### Layout Dimensions

| Constant | Value | Description |
|---|---|---|
| `TOP_BAR_HEIGHT` | 32px | Unified top bar (branding + modes + filters) |
| `KOL_STATS_HEIGHT` | 30px | KOL mode stats bar |
| `NARRATIVE_STATS_HEIGHT` | 30px | Narrative mode stats bar |
| `CUI_BONO_PCT` | 20% | Cui bono panel width (min 260px, max 380px) |

---

## View Modes

### Events Mode (Demo)
Classic event flow graph. Nodes represent events (launches, media, partnerships, etc.) connected by causal relationships.

### KOLs Mode (Demo)
KOL influence graph. Nodes represent key opinion leaders connected by influence propagation waves.

### Narratives Mode (Default)
Prediction-oriented graph with three node types:

| Node Type | Component | Description |
|---|---|---|
| **Fact** | `NarrativeNode` | Real-world events with category, signal, and sentiment |
| **Anchor** | `AnchorNode` | Polymarket prediction markets with dual probability (Polymarket + RateXAI), alpha signals, and trading data |
| **Scenario** | `ScenarioNode` | YES/NO outcome branches from anchor nodes with probability and conditions |

**Anchor Modal** — clicking an anchor node opens a full overlay with:
- Key metrics (probability, alpha, volume, liquidity)
- "View on Polymarket" link
- Scenario branches with conditions
- Factor decomposition waterfall chart
- Dual probability sparkline (Polymarket vs RateXAI over time)
- Cui bono analysis

### Category Filters (Narratives)

| Filter | Color | Description |
|---|---|---|
| War | `#ef4444` | Armed conflict, military operations |
| Strikes | `#f97066` | Airstrikes, missile attacks, military action |
| Politics | `#c084fc` | Political events, diplomacy, governance |
| Economics | `#38bdf8` | Economic impact, sanctions, markets |
| Humanitarian | `#fda4af` | Civilian impact, casualties, refugees |
| Prediction | `#facc15` | Prediction market anchor nodes |

Additional categories available: `ai`, `elections`, `regulation`, `defi`, `memecoin`, `macro`, `tech`, `scandal`, `climate`, `sports`, `other`.

---

## Backend API Specification

All responses follow the `ApiResponse<T>` wrapper:
```typescript
{ success, data, meta: { total, page, limit, generatedAt, cacheHit, queryTimeMs }, error? }
```

Auth: Bearer token in Authorization header. Rate limit: 100 req/min per token.

### `POST /api/v1/event-flow/graph`

Returns the event graph for a project.

**Request:**
```typescript
interface EventFlowRequest {
  projectId: string;
  dateFrom: string;                   // ISO datetime
  dateTo: string;
  granularity: "hour" | "day" | "week" | "month";
  types?: EventType[];                // Filter by event types
  minWeight?: number;                 // Min weight 0..1
  minImpact?: number;                 // Min impact 0..100
  limit?: number;                     // Max nodes
  includeEdges?: boolean;             // Return edges or derive client-side
  sentiment?: Sentiment[];            // Sentiment filter
}
```

### `POST /api/v1/kol-flow/graph`

Returns the KOL influence graph.

**Request:**
```typescript
interface KolFlowRequest {
  projectId: string;
  dateFrom: string;
  dateTo: string;
  tiers?: KolTier[];                  // "mega" | "macro" | "mid" | "micro" | "nano"
  platforms?: Platform[];             // "youtube" | "twitter" | "telegram" | ...
  sortBy?: SortField;
  sortOrder?: "asc" | "desc";
  limit?: number;
  minFollowers?: number;
  includePosts?: boolean;
  includeInfluence?: boolean;
}
```

### `POST /api/v1/narrative-flow/graph`

Returns the narrative prediction graph.

**Request:**
```typescript
interface NarrativeFlowRequest {
  narrativeId: string;
  dateFrom: string;
  dateTo: string;
  categories?: NarrativeCategory[];   // Filter by category
  signals?: NarrativeSignal[];        // Filter by signal type
  minWeight?: number;
  minOddsDelta?: number;
  marketPlatform?: string;            // e.g. "polymarket"
  limit?: number;
  includeEdges?: boolean;
  sentiment?: Sentiment[];
}
```

### Key Data Types

**EventNode:**
```typescript
interface EventNode {
  id: string;                         // "evt_abc123"
  col: number;                        // Time column index (0-based)
  label: string;                      // "Token Launch"
  type: EventType;                    // 15 types (see below)
  sentiment: "pos" | "neg" | "neu";
  weight: number;                     // 0..1 normalized
  desc: string;
  impact: number;                     // 0..100
  mentions: number;
  from?: string[];                    // Parent event IDs
  extra?: string;                     // Badge text
  timestamp?: string;                 // ISO
  sourceUrl?: string;
  imageUrl?: string;
  meta?: Record<string, any>;
}
```

**EventType enum:**
```
blogger | media | metric | partnership | listing | launch | fud | security |
event | onchain | resolution | milestone | community | governance | airdrop
```

**NarrativeNode:**
```typescript
interface NarrativeNode {
  id: string;
  col: number;
  label: string;
  category: NarrativeCategory;
  signal: NarrativeSignal;            // "catalyst" | "escalation" | "resolution" | "reversal" | "noise"
  sentiment: Sentiment;
  desc: string;
  from?: string[];
  weight: number;                     // 0..1
  oddsDelta?: number;                 // Probability shift in pp
  marketProb?: number;                // Polymarket probability 0..100
  sourceAuthority?: number;           // 0..100
  momentum?: number;                  // -100..100
  volume?: number;
  marketUrl?: string;                 // Polymarket URL
  timestamp?: string;

  // Anchor node fields (nodeType: "anchor")
  nodeType?: "fact" | "anchor" | "scenario";
  influenceLinks?: AnchorInfluenceLink[];
  tradingVolume?: number;
  liquidity?: number;
  scenarios?: string[];               // Scenario node IDs

  // RateXAI probability engine
  rateXProb?: number;                 // RateXAI independent probability
  alpha?: number;                     // Alpha signal (rateXProb - marketProb)
  alphaSignal?: "long" | "short" | "neutral";
  rateXConfidence?: number;
  outcomes?: AnchorOutcome[];
  factors?: AnchorFactor[];
  dualProbHistory?: DualProbPoint[];  // { date, polymarket, rateX }

  // Scenario node fields (nodeType: "scenario")
  parentAnchor?: string;
  outcome?: "YES" | "NO" | "PARTIAL";
  outcomeProbability?: number;
  conditions?: string[];
  nextEvents?: string[];

  // Cui bono
  cuiBono?: CuiBono;
}
```

**KolNode:**
```typescript
interface KolNode {
  id: string;
  name: string;                       // "Coin Bureau"
  handle: string;                     // "@coinbureau"
  avatar: string;                     // "CB" (2 chars)
  tier: KolTier;                      // "mega" | "macro" | "mid" | "micro" | "nano"
  followers: number;
  platform: Platform;
  sentiment: Sentiment;
  col: number;
  mentions: number;
  engRate: number;                    // Engagement rate %
  reach: number;
  views: number;
  posts: KolPost[];
  from?: string[];
  influence?: string[];
  avatarUrl?: string;
  profileUrl?: string;
  trustScore?: number;                // 0..100
  engHistory?: number[];              // For sparkline
}
```

### Backend Implementation Notes

**`col` (column index)** — computed on the backend:
- Events: bin timestamp into intervals by granularity, col = interval index
- KOLs: "wave" — when the KOL first mentioned the project, grouped into waves
- Narratives: chronological ordering of events within the narrative timeline

**`from[]` (parent links)** — key logic:
- Events: causal relationships (event A led to B) — via ML pipeline or manual annotation
- KOLs: determined by who mentioned first and who followed whom
- Narratives: factual causation chain + influence links from anchor nodes

**`weight`** — normalized 0..1:
- Events: composite score from impact, mentions, source authority
- KOLs: log-normalized followers
- Narratives: composite of source authority, odds delta, and market volume

**Tier classification (KOLs):**
```
mega:  followers >= 1,000,000
macro: followers >= 500,000
mid:   followers >= 100,000
micro: followers >= 10,000
nano:  followers < 10,000
```

---

## Theme Customization

```tsx
<EventGraph
  theme={{
    bg: "#0f0f1a",
    accent: "#ff6b35",
    complement: "#901dea",
    narrativeCategoryColors: {
      war: { color: "#ef4444", bg: "rgba(239,68,68,0.14)" },
    },
  }}
/>
```

### Default Theme Colors

| Property | Value | Usage |
|---|---|---|
| `bg` | `#11161b` | Background |
| `bgAlt` | `#161d26` | Alternate background |
| `surface` | `#1d2732` | Surface/card |
| `text` | `#ffffff` | Primary text |
| `textSecondary` | `#a7abc3` | Secondary text |
| `accent` | `#1c64f2` | Brand accent |
| `positive` | `#30fd82` | Positive sentiment |
| `negative` | `#ff495f` | Negative sentiment |
| `complement` | `#901dea` | Purple complement (Polymarket buttons) |

---

## Exported Hooks

| Hook | Description |
|---|---|
| `useAnimationTime()` | Continuous animation time (seconds), ~12fps, respects prefers-reduced-motion |
| `useContainerSize(ref)` | Track container dimensions via ResizeObserver |
| `usePanZoom(opts?)` | Zoom + pan state + event handlers (min 0.35x, max 2.5x) |
| `useGraphFilters(...)` | Filter state management for all three modes |
| `useGraphSelection()` | Hover + select + panel state |
| `useEventFlowGraph(...)` | Full pipeline: filter → layout → edges → chain (events) |
| `useKolFlowGraph(...)` | Full pipeline for KOL mode |
| `useNarrativeFlowGraph(...)` | Full pipeline for narrative mode |
| `useEventGraphApi(client, req)` | Data fetching for events |
| `useKolGraphApi(client, req)` | Data fetching for KOLs |
| `useNarrativeGraphApi(client, req)` | Data fetching for narratives |

## Exported Utilities

| Function | Description |
|---|---|
| `computeEventPositions(nodes, layout)` | Compute X,Y for event nodes |
| `computeKolPositions(nodes, layout)` | Compute X,Y for KOL nodes |
| `computeNarrativePositions(nodes, layout)` | Compute X,Y for narrative nodes |
| `deriveEventEdges(nodes)` | Derive edges from node.from[] |
| `deriveKolEdges(nodes)` | Derive edges from from[] + influence[] |
| `deriveNarrativeEdges(nodes)` | Derive edges for narrative nodes |
| `getEventChain(id, nodes, edges)` | Full upstream + downstream chain |
| `getKolChain(id, nodes, edges)` | Full influence chain |
| `getNarrativeChain(id, nodes, edges)` | Full narrative chain |
| `filterEvents(nodes, filters)` | Filter events by type/weight/impact/search |
| `filterKols(nodes, filters)` | Filter KOLs by tier/platform/search/sort |
| `filterNarratives(nodes, filters)` | Filter narratives by category/signal/search |
| `computeKolStats(nodes)` | KOL aggregate statistics |
| `computeNarrativeStats(nodes)` | Narrative aggregate statistics |
| `formatNumber(n)` | 1200 → "1.2K" |
| `nodeRadius(weight, layout)` | Weight → event node radius |
| `kolRadius(followers)` | Followers → KOL node radius (log scale) |
| `narrativeNodeRadius(weight, layout)` | Weight → narrative node radius |
| `streamPath(from, to, width)` | SVG path for sankey stream |
| `isAnchorNode(node)` | Check if node is an anchor |
| `isScenarioNode(node)` | Check if node is a scenario |

## Exported Components

| Component | Description |
|---|---|
| `EventGraph` | Main orchestrator — renders all modes, bars, panels |
| `EventNodeComponent` | SVG event node (circle + label + badge) |
| `KolNodeComponent` | SVG KOL node (circle + avatar + tier badge) |
| `NarrativeNodeComponent` | SVG narrative fact node |
| `AnchorNodeComponent` | SVG anchor node (diamond shape, Polymarket data) |
| `ScenarioNodeComponent` | SVG scenario node (YES/NO outcome) |
| `AnchorModal` | Full-screen modal for anchor detail view |
| `DetailPanel` | Right sidebar detail panel |
| `HoverTooltip` | Floating tooltip on node hover |
| `CuiBonoPanel` | Cui bono scoreboard panel |
| `GraphErrorBoundary` | Error boundary wrapper |
| `NarrativeLegend` | Legend for narrative mode |
| `StreamPath` | SVG sankey-style stream connection |
| `GridColumn` | SVG grid column with label |
| `FlowArrow` | SVG directional arrow |
| `SentimentRing` | SVG sentiment indicator ring |
| `Sparkline` | SVG sparkline chart |
| `GlowRings` | SVG animated glow effect |
| `ImpactRing` | SVG impact indicator |
| `TierBadge` | SVG tier badge for KOLs |
