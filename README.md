# @ratexai/event-graph

Standardized **Event Flow Graph** and **KOL Influence Graph** visualization library for the RateXAI SocialFi / InfoFi dashboard.

## Architecture

```
@ratexai/event-graph/
├── src/
│   ├── index.ts                    # Barrel export
│   ├── types/index.ts              # All TypeScript types & data contracts
│   ├── api/client.ts               # API client with caching & retry
│   ├── hooks/index.ts              # React hooks (10 hooks)
│   ├── utils/index.ts              # Layout, graph traversal, formatting
│   ├── styles/theme.ts             # Theme, colors, icons, labels
│   └── components/
│       ├── EventGraph.tsx           # Main orchestrator component
│       ├── EventFlow/EventNode.tsx  # Event SVG node
│       ├── KolFlow/KolNode.tsx      # KOL SVG node
│       └── Shared/SvgPrimitives.tsx # StreamPath, Grid, Sparkline, etc.
├── package.json
└── tsconfig.json
```

---

## Quick Start (Vike React)

### 1. Install

```bash
# Copy into your project as a local package
cp -r ratexai-event-graph/ packages/event-graph/

# Or add as workspace in monorepo root package.json:
# "workspaces": ["packages/*"]
```

### 2. Basic Usage

```tsx
// pages/dashboard/socialfi/+Page.tsx
import { EventGraph } from "@ratexai/event-graph";
import type { EventFlowData, KolFlowData } from "@ratexai/event-graph";

export default function SocialFiPage() {
  const [eventData, setEventData] = useState<EventFlowData>();
  const [kolData, setKolData] = useState<KolFlowData>();

  useEffect(() => {
    fetch("/api/v1/event-flow/graph", {
      method: "POST",
      body: JSON.stringify({
        projectId: "hype-protocol",
        dateFrom: "2025-02-14",
        dateTo: "2025-02-20",
        granularity: "day",
      }),
    })
      .then(r => r.json())
      .then(res => setEventData(res.data));

    fetch("/api/v1/kol-flow/graph", {
      method: "POST",
      body: JSON.stringify({
        projectId: "hype-protocol",
        dateFrom: "2025-02-14",
        dateTo: "2025-02-20",
      }),
    })
      .then(r => r.json())
      .then(res => setKolData(res.data));
  }, []);

  return (
    <EventGraph
      eventData={eventData}
      kolData={kolData}
      defaultMode="events"
      branding={{ name: "RateXAI", accentColor: "#00e5a0" }}
      onNodeSelect={(id, mode) => console.log(`Selected ${mode} node:`, id)}
    />
  );
}
```

### 3. Using the API Client

```tsx
import { EventGraph, EventGraphApiClient, useEventGraphApi, useKolGraphApi } from "@ratexai/event-graph";

const apiClient = new EventGraphApiClient({
  baseUrl: "https://api.ratexai.com/v1",
  token: "your-bearer-token",
});

function SocialFiDashboard({ projectId }: { projectId: string }) {
  const eventApi = useEventGraphApi(apiClient, {
    projectId,
    dateFrom: "2025-02-14",
    dateTo: "2025-02-20",
    granularity: "day",
  });

  const kolApi = useKolGraphApi(apiClient, {
    projectId,
    dateFrom: "2025-02-14",
    dateTo: "2025-02-20",
    includePosts: true,
    includeInfluence: true,
  });

  return (
    <EventGraph
      eventData={eventApi.data}
      kolData={kolApi.data}
      loading={eventApi.loading || kolApi.loading}
      error={eventApi.error || kolApi.error}
    />
  );
}
```

### 4. Custom Composition (without main component)

```tsx
import {
  useEventFlowGraph, useAnimationTime, usePanZoom,
  useGraphFilters, useGraphSelection,
  EventNodeComponent, StreamPath, computeKolStats,
} from "@ratexai/event-graph";

// Use individual hooks and components for full control
// over layout and behavior
```

---

## Component Props

```typescript
interface EventGraphProps {
  defaultMode?: "events" | "kols";     // Initial view mode
  eventData?: EventFlowData;            // Event flow data
  kolData?: KolFlowData;                // KOL flow data
  theme?: Partial<GraphTheme>;          // Theme overrides
  layout?: Partial<LayoutConfig>;       // Layout overrides
  showModeSwitcher?: boolean;           // Show mode toggle
  showFilters?: boolean;                // Show filter bar
  showDetailPanel?: boolean;            // Show detail panel
  showZoomControls?: boolean;           // Show zoom buttons
  showKolStats?: boolean;               // Show KOL stats bar
  branding?: BrandingConfig;            // Logo and name
  onNodeSelect?: (id, mode) => void;    // Node selection callback
  onNodeHover?: (id, mode) => void;     // Node hover callback
  onModeChange?: (mode) => void;        // Mode change callback
  onFilterChange?: (filters) => void;   // Filter change callback
  loading?: boolean;                    // Loading state
  error?: string | null;                // Error message
  width?: string | number;              // Width (default: "100%")
  height?: string | number;             // Height (default: "100vh")
}
```

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

**EventNode:**
```typescript
interface EventNode {
  id: string;                         // "evt_abc123"
  col: number;                        // Time column index (0-based)
  label: string;                      // "Token Launch"
  type: EventType;                    // "launch" | "blogger" | "media" | ...
  sentiment: "pos" | "neg" | "neu";
  weight: number;                     // 0..1 normalized
  desc: string;
  impact: number;                     // 0..100
  mentions: number;
  from?: string[];                    // Parent event IDs
  extra?: string;                     // Badge text
  timestamp?: string;                 // ISO
  sourceUrl?: string;
  meta?: Record<string, any>;
}
```

**EventType enum:**
```
blogger | media | metric | partnership | listing | launch | fud | security |
event | onchain | resolution | milestone | community | governance | airdrop
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

**KolNode:**
```typescript
interface KolNode {
  id: string;
  name: string;                       // "Coin Bureau"
  handle: string;                     // "@coinbureau"
  avatar: string;                     // "CB" (2 chars)
  tier: KolTier;
  followers: number;
  platform: Platform;
  sentiment: Sentiment;
  col: number;                        // Wave position
  mentions: number;
  engRate: number;                    // Engagement rate %
  reach: number;
  views: number;
  posts: KolPost[];
  triggerEvent?: string;              // Event ID that triggered coverage
  from?: string[];                    // KOL IDs that influenced this one
  influence?: string[];               // KOL IDs this one influenced
  avatarUrl?: string;
  profileUrl?: string;
  trustScore?: number;                // 0..100
  engHistory?: number[];              // For sparkline
}
```

**KolPost:**
```typescript
interface KolPost {
  day: number;
  type: "video" | "short" | "stream" | "tweet" | "thread" | "article" | "tutorial" | "reel" | "post";
  title: string;
  views: number;
  likes: number;
  sentiment: Sentiment;
  timestamp?: string;
  url?: string;
  comments?: number;
  shares?: number;
}
```

### `GET /api/v1/kol-flow/stats?projectId=xxx`

```typescript
interface KolAggregateStats {
  totalKols: number;
  totalReach: number;
  totalMentions: number;
  avgEngRate: number;
  positiveRatio: number;              // 0..100%
  tierBreakdown: Record<KolTier, number>;
  platformBreakdown: Record<Platform, number>;
  topKolByReach?: string;
  topKolByEngagement?: string;
}
```

### Backend Implementation Notes

**`col` (column index)** — computed on the backend:
- Events: bin timestamp into intervals by granularity, col = interval index
- KOLs: "wave" — when the KOL first mentioned the project, grouped into waves

**`from[]` (parent links)** — key logic:
- Events: causal relationships (event A led to B) — via ML pipeline or manual annotation
- KOLs: determined by who mentioned first and who followed whom

**`weight`** — normalized 0..1:
- Events: composite score from impact, mentions, source authority
- KOLs: log-normalized followers

**Tier classification:**
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
    eventTypeColors: {
      blogger: { color: "#ff6b35", bg: "rgba(255,107,53,0.12)" },
    },
  }}
/>
```

---

## Exported Hooks

| Hook | Description |
|---|---|
| `useAnimationTime()` | Continuous animation time (seconds) |
| `useContainerSize(ref)` | Track container dimensions via ResizeObserver |
| `usePanZoom()` | Zoom + pan state + event handlers |
| `useGraphFilters(...)` | Filter state management |
| `useGraphSelection()` | Hover + select + panel state |
| `useEventFlowGraph(...)` | Full pipeline: filter → layout → edges → chain |
| `useKolFlowGraph(...)` | Same for KOL mode |
| `useEventGraphApi(client, req)` | Data fetching for events |
| `useKolGraphApi(client, req)` | Data fetching for KOLs |

## Exported Utilities

| Function | Description |
|---|---|
| `computeEventPositions(nodes, w, h)` | Compute X,Y for event nodes |
| `computeKolPositions(nodes, w, h)` | Compute X,Y for KOL nodes |
| `deriveEventEdges(nodes)` | Derive edges from node.from[] |
| `deriveKolEdges(nodes)` | Derive edges from from[] + influence[] |
| `getEventChain(id, nodes)` | Full upstream + downstream chain |
| `getKolChain(id, nodes)` | Full influence chain |
| `filterEvents(nodes, filters)` | Filter events by type/weight/impact/search |
| `filterKols(nodes, filters)` | Filter KOLs by tier/platform/search/sort |
| `computeKolStats(nodes)` | Aggregate statistics |
| `streamPath(from, to, width)` | SVG path for sankey stream |
| `formatNumber(n)` | 1200 → "1.2K" |
| `nodeRadius(weight)` | Weight → node radius |
| `kolRadius(followers)` | Followers → radius (log scale) |
