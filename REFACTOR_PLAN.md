# Radiant — Refactoring Plan: JSON → Full-Stack Service

> Status: **DRAFT — requires team sign-off**
> Author: Claude / RateX AI
> Date: 2026-03-13

---

## Table of Contents

1. [Current Architecture](#1-current-architecture)
2. [Target Architecture](#2-target-architecture)
3. [Final Database Schema (PostgreSQL)](#3-final-database-schema-postgresql)
4. [Monorepo Restructure](#4-monorepo-restructure)
5. [Refactoring Phases](#5-refactoring-phases)
6. [Detailed Task Breakdown](#6-detailed-task-breakdown)
7. [API Contract: Before → After](#7-api-contract-before--after)
8. [Agent Migration Plan](#8-agent-migration-plan)
9. [Frontend Client Changes](#9-frontend-client-changes)
10. [Testing Strategy](#10-testing-strategy)
11. [Infrastructure & Deployment](#11-infrastructure--deployment)
12. [Risks & Mitigations](#12-risks--mitigations)
13. [Decision Log](#13-decision-log)

---

## 1. Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  CURRENT STATE — Flat JSON + Python Read/Write              │
└─────────────────────────────────────────────────────────────┘

┌──────────┐  npm build   ┌───────────────────┐
│ src/     │─────────────→│ @ratexai/event-   │  React library
│ (React)  │              │ graph (npm pkg)   │  consumed by host app
└──────────┘              └───────────────────┘

┌──────────────────┐  reads JSON   ┌─────────────────────┐
│ radiant/api/     │──────────────→│ radiant/data/maps/  │
│ server.py (Fast  │               │ *.json              │
│ API, 79 lines)   │               │ registry.json       │
└──────────────────┘               └─────────────────────┘
                                           ▲
┌──────────────────┐  writes JSON          │
│ radiant/agents/  │──────────────────────→│
│ update_map.py    │  (full file rewrite)
│ map_predict.py   │
└──────────────────┘

┌──────────┐
│ demo/    │  Vite dev server, hardcoded data
└──────────┘
```

### What We Have

| Component | Language | Lines | Purpose |
|-----------|----------|-------|---------|
| `src/types/index.ts` | TS | 686 | All data contracts |
| `src/api/client.ts` | TS | 239 | Frontend API client (fetch + cache + retry) |
| `src/hooks/useApi.ts` | TS | 81 | React data fetching hooks |
| `src/components/EventGraph.tsx` | TSX | ~400 | Main orchestrator |
| `src/components/EventGraph/GraphCanvas.tsx` | TSX | ~500 | SVG graph renderer |
| `src/components/CuiBono/CuiBonoPanel.tsx` | TSX | ~400 | Right sidebar |
| `radiant/api/server.py` | Python | 79 | FastAPI — serves JSON files |
| `radiant/agents/update_map.py` | Python | ~8000 | Claude agent — discovers events |
| `radiant/agents/map_predictions.py` | Python | ~8000 | Claude agent — maps predictions |
| `radiant/agents/config.py` | Python | 11 | Agent config |
| `radiant/data/maps/*.json` | JSON | varies | 5 map files, 1 populated (74 nodes) |
| `radiant/data/registry.json` | JSON | 54 | Map index |
| `demo/` | TSX | ~3000 | Demo app with hardcoded data |

### Problems Blocking Service Launch

| # | Problem | Impact |
|---|---------|--------|
| 1 | **No database** — JSON files on disk | No concurrent writes, no transactions, agent can corrupt |
| 2 | **No user system** | Can't track who sees what, no auth |
| 3 | **No audit trail** | Agent runs are fire-and-forget, no history |
| 4 | **No real-time** | Client must poll, no push updates |
| 5 | **No search** | Can't search across maps or nodes |
| 6 | **No version history** | Can't see how probability evolved over time |
| 7 | **Python API is minimal** | 4 endpoints, no validation, no auth, no pagination |
| 8 | **Mixed Python + TS** | Two runtimes to deploy, no shared types |
| 9 | **No incremental updates** | Agent rewrites entire map file each run |
| 10 | **No tests for API/agents** | Only frontend unit tests (72 passing) |

---

## 2. Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  TARGET STATE — PostgreSQL + TypeScript API + Real-time     │
└─────────────────────────────────────────────────────────────┘

┌──────────┐  npm pkg    ┌───────────────────┐   SSE/WS
│ packages/│────────────→│ Host App (Next.js) │←────────────┐
│ ui/      │             │ or standalone      │              │
│ (React)  │             └───────────────────┘              │
└──────────┘                                                │
                                                            │
┌──────────────────────────────────────────────────┐        │
│ packages/api/  — Hono + Drizzle + PostgreSQL     │        │
│                                                  │        │
│  routes/maps.ts       → CRUD maps               │────────┘
│  routes/nodes.ts      → CRUD nodes + search      │  NOTIFY →
│  routes/predictions.ts→ prob history, alerts      │  SSE broadcast
│  routes/auth.ts       → JWT + OAuth              │
│  routes/agents.ts     → agent run tracking       │
│  routes/sse.ts        → real-time stream         │
│                                                  │
│  db/schema.ts         → Drizzle table defs       │
│  db/queries/          → typed query functions     │
│  db/seed.ts           → import from JSON         │
└─────────────────────┬────────────────────────────┘
                      │
                      ▼
              ┌──────────────┐
              │ PostgreSQL   │
              │ 16 + JSONB   │
              └──────────────┘
                      ▲
                      │ HTTP API calls
┌──────────────────────────────────┐
│ packages/agents/  (Python)       │
│                                  │
│  update_map.py → POST /nodes     │
│  map_predictions.py → PATCH      │
│  polymarket_sync.py → new!       │
│                                  │
│  Writes via API, not direct DB   │
└──────────────────────────────────┘
```

---

## 3. Final Database Schema (PostgreSQL)

### 3.1 Entity-Relationship Diagram

```
maps 1──∞ time_slots
maps 1──∞ nodes
maps 1──∞ edges
nodes 1──∞ influence_links (anchor → facts)
nodes 1──∞ prob_history (time-series)
maps 1──∞ agent_runs
users 1──∞ user_map_access ∞──1 maps
users 1──∞ bookmarks ∞──1 nodes
users 1──∞ alerts
```

### 3.2 Table Definitions

#### `maps` — Top-level narrative containers

```sql
CREATE TABLE maps (
  id            TEXT PRIMARY KEY,              -- "iran-war-2026"
  title         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active' -- active | developing | monitoring | archived
                CHECK (status IN ('active','developing','monitoring','archived')),
  update_cycle  INTERVAL DEFAULT '12 hours',  -- changed from TEXT to native INTERVAL
  headline_prob REAL CHECK (headline_prob BETWEEN 0 AND 100),
  trend         TEXT CHECK (trend IN ('up','down','flat')),
  emoji         TEXT,

  -- Narrative metadata
  category      TEXT,
  sentiment     TEXT DEFAULT 'neu' CHECK (sentiment IN ('pos','neg','neu')),
  start_prob    REAL CHECK (start_prob BETWEEN 0 AND 100),
  current_prob  REAL CHECK (current_prob BETWEEN 0 AND 100),

  -- Aggregated data (denormalized for fast reads)
  node_count    INT DEFAULT 0,
  cui_bono      JSONB DEFAULT '{}',
  branches      TEXT[] DEFAULT '{}',

  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_maps_status ON maps(status);

-- Auto-update updated_at
CREATE TRIGGER maps_updated_at
  BEFORE UPDATE ON maps
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

#### `time_slots` — Timeline columns

```sql
CREATE TABLE time_slots (
  id          SERIAL PRIMARY KEY,
  map_id      TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  slot_index  INT NOT NULL,                -- renamed from "index" (reserved word)
  label       TEXT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  slot_type   TEXT DEFAULT 'past'
              CHECK (slot_type IN ('past','present','near_future','anchor_date')),
  anchor_id   TEXT,                         -- for anchor_date: linked anchor node

  UNIQUE(map_id, slot_index)
);

CREATE INDEX idx_timeslots_map ON time_slots(map_id);
```

#### `nodes` — Events, anchors, scenarios

```sql
CREATE TABLE nodes (
  id              TEXT NOT NULL,
  map_id          TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,

  -- Core
  col             INT NOT NULL,
  label           TEXT NOT NULL,
  node_type       TEXT DEFAULT 'fact'
                  CHECK (node_type IN ('fact','anchor','scenario')),
  category        TEXT NOT NULL,
  signal          TEXT DEFAULT 'noise'
                  CHECK (signal IN ('catalyst','escalation','resolution','reversal','noise')),
  sentiment       TEXT DEFAULT 'neu'
                  CHECK (sentiment IN ('pos','neg','neu')),
  description     TEXT,
  weight          REAL DEFAULT 0.5 CHECK (weight BETWEEN 0 AND 1),

  -- Scoring
  odds_delta      REAL DEFAULT 0,
  market_prob     REAL CHECK (market_prob IS NULL OR market_prob BETWEEN 0 AND 100),
  source_authority REAL DEFAULT 50 CHECK (source_authority BETWEEN 0 AND 100),
  momentum        REAL DEFAULT 0,
  volume          REAL DEFAULT 0,

  -- Source
  source_url      TEXT,
  source_name     TEXT,
  timestamp       TIMESTAMPTZ,
  image_url       TEXT,
  extra           TEXT,
  tags            TEXT[] DEFAULT '{}',
  temporal        TEXT DEFAULT 'past'
                  CHECK (temporal IN ('past','present','future')),

  -- Prediction market (anchor nodes)
  market_platform TEXT,
  market_question TEXT,
  market_url      TEXT,
  market_slug     TEXT,
  resolves_at     TIMESTAMPTZ,
  trading_volume  TEXT,
  liquidity       TEXT,
  scenarios       TEXT[] DEFAULT '{}',

  -- RateX probability engine (anchor nodes)
  ratex_prob       REAL CHECK (ratex_prob IS NULL OR ratex_prob BETWEEN 0 AND 100),
  alpha            REAL,
  alpha_signal     TEXT CHECK (alpha_signal IS NULL OR alpha_signal IN ('underpriced','overpriced','in_line')),
  ratex_confidence REAL CHECK (ratex_confidence IS NULL OR ratex_confidence BETWEEN 0 AND 1),
  ratex_reasoning  TEXT,

  -- Scenario fields
  parent_anchor   TEXT,
  outcome         TEXT CHECK (outcome IS NULL OR outcome IN ('YES','NO','PARTIAL')),
  outcome_prob    REAL CHECK (outcome_prob IS NULL OR outcome_prob BETWEEN 0 AND 100),
  conditions      TEXT[] DEFAULT '{}',
  next_events     TEXT[] DEFAULT '{}',

  -- JSONB fields (complex nested data — not worth normalizing at current scale)
  cui_bono           JSONB DEFAULT '{}',
  outcomes           JSONB DEFAULT '[]',   -- AnchorOutcome[]
  factors            JSONB DEFAULT '[]',   -- AnchorFactor[]
  dual_prob_history  JSONB DEFAULT '[]',   -- DualProbPoint[]
  for_resolution     JSONB DEFAULT '[]',   -- PredictionCausalLink[]
  against_resolution JSONB DEFAULT '[]',   -- PredictionCausalLink[]
  meta               JSONB DEFAULT '{}',

  -- Denormalized for fast graph queries
  parent_ids      TEXT[] DEFAULT '{}',     -- was "from" in JSON
  causal_node_ids TEXT[] DEFAULT '{}',     -- for anchors

  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY (map_id, id)
);

-- Indexes
CREATE INDEX idx_nodes_map        ON nodes(map_id);
CREATE INDEX idx_nodes_type       ON nodes(map_id, node_type);
CREATE INDEX idx_nodes_category   ON nodes(map_id, category);
CREATE INDEX idx_nodes_timestamp  ON nodes(map_id, timestamp DESC);
CREATE INDEX idx_nodes_anchor     ON nodes(map_id) WHERE node_type = 'anchor';
CREATE INDEX idx_nodes_parent     ON nodes USING GIN (parent_ids);
CREATE INDEX idx_nodes_tags       ON nodes USING GIN (tags);
CREATE INDEX idx_nodes_search     ON nodes USING GIN (
  to_tsvector('english', label || ' ' || COALESCE(description, ''))
);

CREATE TRIGGER nodes_updated_at
  BEFORE UPDATE ON nodes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

#### `edges` — Causal/temporal links

```sql
CREATE TABLE edges (
  id          SERIAL PRIMARY KEY,
  map_id      TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  from_node   TEXT NOT NULL,
  to_node     TEXT NOT NULL,
  weight      REAL DEFAULT 1,
  edge_type   TEXT DEFAULT 'causal'
              CHECK (edge_type IN ('causal','temporal','reference','influence')),
  influence   REAL,                         -- pp shift (influence edges)
  mechanism   TEXT,

  UNIQUE(map_id, from_node, to_node),
  FOREIGN KEY (map_id, from_node) REFERENCES nodes(map_id, id) ON DELETE CASCADE,
  FOREIGN KEY (map_id, to_node) REFERENCES nodes(map_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_edges_map  ON edges(map_id);
CREATE INDEX idx_edges_from ON edges(map_id, from_node);
CREATE INDEX idx_edges_to   ON edges(map_id, to_node);
```

#### `influence_links` — Rich fact→anchor links

```sql
CREATE TABLE influence_links (
  id          SERIAL PRIMARY KEY,
  map_id      TEXT NOT NULL,
  anchor_id   TEXT NOT NULL,
  fact_id     TEXT NOT NULL,
  influence   REAL NOT NULL,               -- pp shift
  mechanism   TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),

  UNIQUE(map_id, anchor_id, fact_id),
  FOREIGN KEY (map_id, anchor_id) REFERENCES nodes(map_id, id) ON DELETE CASCADE,
  FOREIGN KEY (map_id, fact_id) REFERENCES nodes(map_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_influence_anchor ON influence_links(map_id, anchor_id);
CREATE INDEX idx_influence_fact   ON influence_links(map_id, fact_id);
```

#### `prob_history` — Time-series probability tracking

```sql
CREATE TABLE prob_history (
  id          BIGSERIAL PRIMARY KEY,
  map_id      TEXT NOT NULL,
  node_id     TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  market_prob REAL,
  ratex_prob  REAL,
  alpha       REAL,
  source      TEXT DEFAULT 'agent'
              CHECK (source IN ('agent','manual','polymarket_api','system')),

  FOREIGN KEY (map_id, node_id) REFERENCES nodes(map_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_prob_node_time ON prob_history(map_id, node_id, recorded_at DESC);

-- Partition by month if volume grows (optional TimescaleDB):
-- SELECT create_hypertable('prob_history', 'recorded_at', chunk_time_interval => INTERVAL '1 month');
```

#### `agent_runs` — Audit trail

```sql
CREATE TABLE agent_runs (
  id            BIGSERIAL PRIMARY KEY,
  map_id        TEXT NOT NULL REFERENCES maps(id),
  agent_type    TEXT NOT NULL
                CHECK (agent_type IN ('update_map','map_predictions','polymarket_sync','manual')),
  model         TEXT NOT NULL,
  started_at    TIMESTAMPTZ DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  status        TEXT DEFAULT 'running'
                CHECK (status IN ('running','success','failed','cancelled')),
  duration_ms   INT,

  -- What changed
  nodes_added   INT DEFAULT 0,
  nodes_updated INT DEFAULT 0,
  edges_added   INT DEFAULT 0,
  summary       TEXT,

  -- Cost tracking
  input_tokens  INT,
  output_tokens INT,
  cost_usd      REAL,

  -- Error info
  error_message TEXT,
  raw_response  JSONB
);

CREATE INDEX idx_agent_runs_map ON agent_runs(map_id, started_at DESC);
CREATE INDEX idx_agent_runs_status ON agent_runs(status) WHERE status = 'running';
```

#### `users` — Authentication

```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  avatar_url  TEXT,
  role        TEXT DEFAULT 'viewer'
              CHECK (role IN ('viewer','editor','admin','agent')),

  -- Auth
  auth_provider TEXT CHECK (auth_provider IN ('google','github','email','api_key')),
  auth_id       TEXT,
  password_hash TEXT,
  api_key       TEXT UNIQUE,               -- for agent/programmatic access

  preferences JSONB DEFAULT '{}',

  created_at  TIMESTAMPTZ DEFAULT now(),
  last_login  TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_users_auth ON users(auth_provider, auth_id)
  WHERE auth_provider IS NOT NULL;
CREATE UNIQUE INDEX idx_users_api_key ON users(api_key) WHERE api_key IS NOT NULL;
```

#### `user_map_access` — Permissions

```sql
CREATE TABLE user_map_access (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  map_id      TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  role        TEXT DEFAULT 'viewer'
              CHECK (role IN ('viewer','editor','owner')),
  granted_at  TIMESTAMPTZ DEFAULT now(),
  granted_by  UUID REFERENCES users(id),

  PRIMARY KEY (user_id, map_id)
);
```

#### `bookmarks` + `alerts` — User engagement

```sql
CREATE TABLE bookmarks (
  id          SERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  map_id      TEXT NOT NULL,
  node_id     TEXT NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),

  FOREIGN KEY (map_id, node_id) REFERENCES nodes(map_id, id) ON DELETE CASCADE,
  UNIQUE(user_id, map_id, node_id)
);

CREATE TABLE alerts (
  id          SERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  map_id      TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  node_id     TEXT,
  alert_type  TEXT NOT NULL
              CHECK (alert_type IN ('prob_change','new_event','signal_shift','agent_complete')),
  threshold   REAL,
  active      BOOLEAN DEFAULT true,
  last_fired  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_alerts_active ON alerts(user_id) WHERE active = true;
```

#### Shared helpers

```sql
-- updated_at trigger function (reused by all tables)
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Real-time notification trigger
CREATE OR REPLACE FUNCTION notify_map_change() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('map_changes', json_build_object(
    'table', TG_TABLE_NAME,
    'map_id', COALESCE(NEW.map_id, OLD.map_id),
    'id', COALESCE(NEW.id, OLD.id),
    'op', TG_OP
  )::text);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER nodes_change_notify
  AFTER INSERT OR UPDATE OR DELETE ON nodes
  FOR EACH ROW EXECUTE FUNCTION notify_map_change();

CREATE TRIGGER edges_change_notify
  AFTER INSERT OR UPDATE OR DELETE ON edges
  FOR EACH ROW EXECUTE FUNCTION notify_map_change();
```

### 3.3 Schema Decisions & Rationale

| Decision | Rationale |
|----------|-----------|
| **Composite PK `(map_id, id)` on nodes** | All queries are scoped to a map; this makes partition-ready and eliminates need for extra index |
| **`parent_ids TEXT[]`** instead of junction table | < 10 parents per node, array is simpler; GIN index allows `@>` containment queries |
| **JSONB for `cui_bono`, `outcomes`, `factors`** | Deeply nested, rarely queried independently; normalizing would add 5+ tables for < 100 rows |
| **`prob_history` as separate table** | Time-series data grows unboundedly; needs its own index + optional TimescaleDB |
| **`INTERVAL` for `update_cycle`** | PostgreSQL native; enables `WHERE now() - updated_at > update_cycle` for stale map detection |
| **CHECK constraints everywhere** | Catch bad data at DB level, not just app level |
| **FK from edges to nodes** | Referential integrity; prevents orphan edges |
| **`api_key` on users** | Agents authenticate with API keys, not OAuth |
| **`agent` role** | Agents are first-class users with audit trail |
| **No `prob_history` array on nodes** | Moved to dedicated table; sparkline data computed via `SELECT ... ORDER BY recorded_at DESC LIMIT 30` |

### 3.4 What Changed vs. DATABASE_DESIGN.md Draft

| Change | Before (draft) | After (final) |
|--------|----------------|---------------|
| `update_cycle` type | TEXT ("12h") | INTERVAL (native) |
| `index` column name | `index` | `slot_index` (reserved word) |
| `from` field | `from` | `parent_ids` (reserved word) |
| CHECK constraints | None | All enum-like fields |
| Edge foreign keys | Only to maps | To nodes (map_id, id) composite |
| `api_key` on users | Missing | Added for agent auth |
| `agent` role | Missing | Added |
| `cost_usd` on agent_runs | Missing | Added |
| `duration_ms` on agent_runs | Missing | Added |
| `granted_by` on access | Missing | Added for audit |
| `prob_history` on nodes | `REAL[]` | Removed — use `prob_history` table |
| Node `from` field | Ambiguous | Split into `parent_ids` (array) + `edges` table |

---

## 4. Monorepo Restructure

### Current Layout
```
event-graph/
├── src/              # React library source
├── demo/             # Vite demo app
├── radiant/
│   ├── api/          # Python FastAPI (79 lines)
│   ├── agents/       # Python Claude agents
│   ├── data/         # JSON files
│   └── requirements.txt
├── package.json      # Single package
├── tsconfig.json
└── tsup.config.*
```

### Target Layout
```
event-graph/
├── packages/
│   ├── ui/                          # React library (current src/)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── styles/
│   │   │   ├── utils/
│   │   │   ├── types/index.ts       # Frontend-only types (rendering, UI)
│   │   │   └── index.ts
│   │   ├── package.json             # @ratexai/event-graph
│   │   └── tsconfig.json
│   │
│   ├── api/                         # Backend API server (NEW)
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── maps.ts
│   │   │   │   ├── nodes.ts
│   │   │   │   ├── edges.ts
│   │   │   │   ├── predictions.ts
│   │   │   │   ├── search.ts
│   │   │   │   ├── agents.ts
│   │   │   │   ├── auth.ts
│   │   │   │   └── sse.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── rateLimit.ts
│   │   │   │   └── cors.ts
│   │   │   ├── db/
│   │   │   │   ├── schema.ts        # Drizzle schema
│   │   │   │   ├── client.ts        # Connection pool
│   │   │   │   ├── migrate.ts       # Migrations runner
│   │   │   │   └── seed.ts          # JSON → DB import
│   │   │   ├── lib/
│   │   │   │   ├── notify.ts        # PG NOTIFY → SSE bridge
│   │   │   │   └── polymarket.ts    # Polymarket API client
│   │   │   └── server.ts            # Hono app entry
│   │   ├── drizzle/                 # Generated migrations
│   │   ├── package.json             # @ratexai/api
│   │   └── tsconfig.json
│   │
│   └── shared/                      # Shared types & utils (NEW)
│       ├── src/
│       │   ├── types.ts             # All data contracts (moved from ui/types)
│       │   ├── enums.ts             # Enum values as const arrays
│       │   └── validation.ts        # Zod schemas for API validation
│       ├── package.json             # @ratexai/shared
│       └── tsconfig.json
│
├── agents/                          # Python agents (moved from radiant/agents/)
│   ├── update_map.py
│   ├── map_predictions.py
│   ├── polymarket_sync.py           # NEW: auto-fetch market prices
│   ├── config.py
│   ├── api_client.py                # NEW: typed HTTP client for our API
│   ├── prompts/
│   └── requirements.txt
│
├── data/                            # Seed data (moved from radiant/data/)
│   ├── maps/                        # JSON files (now seed-only)
│   └── registry.json
│
├── demo/                            # Demo app
├── docker-compose.yml               # NEW: PG + Redis
├── .env.example                     # NEW
├── pnpm-workspace.yaml              # NEW: monorepo config
├── turbo.json                       # NEW: build orchestration
└── package.json                     # Root workspace
```

---

## 5. Refactoring Phases

### Phase 0 — Preparation (1-2 days)

**Goal:** Set up monorepo, move files, nothing breaks.

- [ ] Install pnpm, create `pnpm-workspace.yaml`
- [ ] Create `packages/ui/` — move current `src/`, adjust paths
- [ ] Create `packages/shared/` — extract types from `src/types/index.ts`
- [ ] Create `packages/api/` scaffold
- [ ] Move `radiant/agents/` → `agents/`
- [ ] Move `radiant/data/` → `data/`
- [ ] Add `turbo.json` for build orchestration
- [ ] Verify: `pnpm build` builds all packages, `pnpm test` passes 72 tests
- [ ] Create `.env.example`

### Phase 1 — Database Foundation (3-4 days)

**Goal:** PostgreSQL running, schema applied, data imported.

- [ ] Add `docker-compose.yml` (PostgreSQL 16 + Redis 7)
- [ ] Create Drizzle schema (`packages/api/src/db/schema.ts`)
- [ ] Generate and apply initial migration
- [ ] Write JSON → DB import script (`packages/api/src/db/seed.ts`)
- [ ] Import all 5 maps (1 populated, 4 empty)
- [ ] Verify data parity: JSON node count = DB node count
- [ ] Write basic query tests

### Phase 2 — API Server (3-4 days)

**Goal:** TypeScript API serves same data as Python server.

- [ ] Set up Hono server (`packages/api/src/server.ts`)
- [ ] `GET /api/v1/maps` — list maps from DB
- [ ] `GET /api/v1/maps/:id` — full map load (nodes + edges + timeslots)
- [ ] `GET /api/v1/search?q=` — full-text search
- [ ] `POST /api/v1/maps/:id/nodes` — create node (for agents)
- [ ] `PATCH /api/v1/maps/:id/nodes/:nodeId` — update node
- [ ] `DELETE /api/v1/maps/:id/nodes/:nodeId` — delete node
- [ ] `GET /api/v1/maps/:id/history` — prob history for anchors
- [ ] `POST /api/v1/agent-runs` — log agent runs
- [ ] Request validation with Zod (from shared package)
- [ ] Error handling middleware
- [ ] API key auth middleware (for agents)
- [ ] Verify: all existing frontend API calls work against new server

### Phase 3 — Agent Migration (2-3 days)

**Goal:** Python agents write to DB via API, not JSON files.

- [ ] Create `agents/api_client.py` — typed HTTP client for our API
- [ ] Modify `update_map.py`:
  - Read current state via `GET /api/v1/maps/:id`
  - Write new nodes via `POST /api/v1/maps/:id/nodes`
  - Log run via `POST /api/v1/agent-runs`
  - Keep JSON write as fallback (env flag `USE_DB=true`)
- [ ] Modify `map_predictions.py`:
  - Read anchors + facts via API
  - Update anchors via `PATCH /api/v1/maps/:id/nodes/:id`
  - Log run via `POST /api/v1/agent-runs`
- [ ] Create `polymarket_sync.py` — auto-fetch market prices
  - `GET https://clob.polymarket.com/markets/:slug`
  - Write to `prob_history` via API
  - Run on schedule (every 30 min)
- [ ] Verify: run agent, check data appears in DB + API

### Phase 4 — Frontend Client Update (1-2 days)

**Goal:** Frontend works against new API without breaking.

- [ ] Update `packages/ui/src/api/client.ts`:
  - Map API response shapes (snake_case → camelCase if needed)
  - Add SSE subscription method
  - Add auth token management
- [ ] Update demo app to point to local API
- [ ] Add real-time update hook: `useMapSubscription(mapId)`
- [ ] Verify: demo loads data from PostgreSQL via new API

### Phase 5 — Auth & Users (2-3 days)

**Goal:** User accounts, permissions, API keys.

- [ ] JWT middleware (access + refresh tokens)
- [ ] Google OAuth flow (`/auth/google`)
- [ ] GitHub OAuth flow (`/auth/github`)
- [ ] API key generation (`POST /auth/api-keys`)
- [ ] Permission middleware: check `user_map_access` role
- [ ] `GET /auth/me` — current user profile
- [ ] `GET /admin/users` — admin user management

### Phase 6 — Real-Time & Polish (2-3 days)

**Goal:** Live updates, search, bookmarks.

- [ ] SSE endpoint: `GET /api/v1/maps/:id/stream`
  - Listen to PostgreSQL `NOTIFY map_changes`
  - Broadcast to connected clients
- [ ] Bookmark endpoints: `POST/DELETE /api/v1/bookmarks`
- [ ] Alert endpoints: `POST/PATCH/DELETE /api/v1/alerts`
- [ ] Alert evaluation worker (checks prob_history changes)
- [ ] Admin dashboard: agent run stats, cost tracking
- [ ] Rate limiting middleware (per API key)

---

## 6. Detailed Task Breakdown

### Phase 1 Tasks (Database Foundation)

```
P1.1  docker-compose.yml
      ├── postgres:16 with healthcheck
      ├── redis:7-alpine
      └── Volumes for persistence

P1.2  packages/api/package.json dependencies
      ├── hono
      ├── drizzle-orm + drizzle-kit
      ├── pg (node-postgres)
      ├── zod
      ├── jose (JWT)
      └── dotenv

P1.3  packages/api/src/db/schema.ts
      ├── All 10 tables as Drizzle pgTable()
      ├── All indexes
      ├── All relations (Drizzle relationalQuery)
      └── Export inferred types (InsertNode, SelectNode, etc.)

P1.4  packages/api/src/db/seed.ts
      ├── Read JSON from data/maps/*.json
      ├── Read data/registry.json
      ├── Insert maps
      ├── Insert time_slots
      ├── Insert nodes (transform camelCase → snake_case)
      ├── Derive + insert edges from node.from[]
      ├── Insert influence_links from node.influenceLinks[]
      ├── Insert initial prob_history from node.probHistory[]
      └── Verify counts match

P1.5  Migration + verification
      ├── npx drizzle-kit generate
      ├── npx drizzle-kit push
      ├── Run seed.ts
      └── SELECT count(*) sanity checks
```

### Phase 2 Tasks (API Server)

```
P2.1  Server setup
      ├── Hono with basePath("/api/v1")
      ├── CORS middleware
      ├── Request ID middleware
      ├── Error handler (ApiError → JSON)
      └── Health check endpoint

P2.2  Map routes
      ├── GET  /maps          → list all (with node_count, headline_prob)
      ├── GET  /maps/:id      → full load (parallel: map + slots + nodes + edges)
      ├── POST /maps          → create map (admin only)
      └── PATCH /maps/:id     → update map metadata

P2.3  Node routes
      ├── GET    /maps/:id/nodes           → list with filters + pagination
      ├── GET    /maps/:id/nodes/:nodeId   → single node + influence_links
      ├── POST   /maps/:id/nodes           → create (auto-update map.node_count)
      ├── PATCH  /maps/:id/nodes/:nodeId   → partial update
      ├── DELETE /maps/:id/nodes/:nodeId   → delete (cascade edges)
      └── POST   /maps/:id/nodes/batch     → bulk upsert (for agents)

P2.4  Search route
      ├── GET /search?q=&map_id=&category=&limit=
      └── Full-text search with ts_rank ordering

P2.5  Prediction routes
      ├── GET  /maps/:id/predictions        → all anchors with latest prob
      ├── GET  /maps/:id/predictions/:nodeId/history  → prob time-series
      └── POST /maps/:id/predictions/:nodeId/prob     → record new reading

P2.6  Agent routes
      ├── POST /agent-runs         → start new run
      ├── PATCH /agent-runs/:id    → complete/fail run
      └── GET  /agent-runs?map_id= → list runs
```

---

## 7. API Contract: Before → After

### `GET /api/v1/maps` — List maps

**Before (Python, reads JSON):**
```json
{
  "maps": [
    { "id": "iran-war-2026", "title": "Iran-US-Israel War", "status": "active", ... }
  ]
}
```

**After (TypeScript, reads DB) — same shape, richer data:**
```json
{
  "maps": [
    {
      "id": "iran-war-2026",
      "title": "Iran-US-Israel War",
      "status": "active",
      "nodeCount": 74,
      "headlineProb": 8,
      "trend": "down",
      "updatedAt": "2026-03-04T18:00:00Z",
      "lastAgentRun": "2026-03-04T17:55:00Z",
      "category": "war"
    }
  ],
  "meta": { "total": 5 }
}
```

### `GET /api/v1/maps/:id` — Full map

**Before:** Returns raw JSON file as-is (untyped blob).

**After:** Structured, with nested data properly shaped:
```json
{
  "id": "iran-war-2026",
  "title": "Iran-US-Israel War",
  "timeSlots": [...],
  "nodes": [
    {
      "id": "fact-1",
      "mapId": "iran-war-2026",
      "label": "...",
      "parentIds": ["fact-0"],
      "influenceLinks": [{ "factId": "...", "influence": -25, "mechanism": "..." }],
      ...
    }
  ],
  "edges": [...],
  "narrative": { ... },
  "stats": { ... }
}
```

**Key change:** `node.from` → `node.parentIds` (avoids JS reserved word issues).

### NEW Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/search?q=` | Full-text search across all maps |
| `GET` | `/api/v1/maps/:id/stream` | SSE real-time updates |
| `GET` | `/api/v1/maps/:id/predictions` | All prediction anchors |
| `GET` | `/api/v1/maps/:id/predictions/:id/history` | Prob time-series |
| `POST` | `/api/v1/maps/:id/nodes` | Create node (agent) |
| `POST` | `/api/v1/maps/:id/nodes/batch` | Bulk upsert (agent) |
| `PATCH` | `/api/v1/maps/:id/nodes/:id` | Update node |
| `POST` | `/api/v1/agent-runs` | Log agent run start |
| `PATCH` | `/api/v1/agent-runs/:id` | Log agent run complete |
| `POST` | `/auth/login` | Email login |
| `POST` | `/auth/google` | Google OAuth |
| `POST` | `/auth/api-keys` | Generate API key |
| `GET` | `/auth/me` | Current user |
| `POST` | `/api/v1/bookmarks` | Bookmark node |
| `POST` | `/api/v1/alerts` | Create alert |

---

## 8. Agent Migration Plan

### Current Agent Flow
```
Agent reads JSON file → calls Claude → gets new nodes → rewrites JSON file
```

### Target Agent Flow
```
Agent calls GET /api/v1/maps/:id → calls Claude → POST /api/v1/maps/:id/nodes/batch → done
```

### `agents/api_client.py` — New shared HTTP client

```python
class RadiantApiClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.headers = {"Authorization": f"Bearer {api_key}"}

    def get_map(self, map_id: str) -> dict:
        """GET /api/v1/maps/:id → full map data."""

    def create_nodes(self, map_id: str, nodes: list[dict]) -> list[dict]:
        """POST /api/v1/maps/:id/nodes/batch → bulk create."""

    def update_node(self, map_id: str, node_id: str, data: dict) -> dict:
        """PATCH /api/v1/maps/:id/nodes/:id → partial update."""

    def start_run(self, map_id: str, agent_type: str, model: str) -> int:
        """POST /api/v1/agent-runs → returns run ID."""

    def complete_run(self, run_id: int, summary: str, stats: dict):
        """PATCH /api/v1/agent-runs/:id → mark complete."""

    def fail_run(self, run_id: int, error: str):
        """PATCH /api/v1/agent-runs/:id → mark failed."""
```

### `update_map.py` Changes

```diff
- DATA_DIR = Path(__file__).parent.parent / "data" / "maps"
+ from api_client import RadiantApiClient
+ client = RadiantApiClient(os.environ["RADIANT_API_URL"], os.environ["RADIANT_API_KEY"])

  def update_map(map_id: str):
-     with open(DATA_DIR / f"{map_id}.json") as f:
-         current = json.load(f)
+     current = client.get_map(map_id)
+     run_id = client.start_run(map_id, "update_map", MODEL)

      # ... Claude call stays the same ...

-     with open(DATA_DIR / f"{map_id}.json", "w") as f:
-         json.dump(merged, f, indent=2)
+     client.create_nodes(map_id, new_nodes)
+     client.complete_run(run_id, summary, {"nodes_added": len(new_nodes)})
```

---

## 9. Frontend Client Changes

### `packages/ui/src/api/client.ts` — Updates needed

1. **Response shape mapping** — API returns `snake_case`, frontend expects `camelCase`
   - Add `mapNodeFromApi(raw) → NarrativeNode` transformer
   - Or configure API to return camelCase (preferred — let Hono handle it)

2. **New method: subscribe to SSE**
   ```typescript
   subscribeToMap(mapId: string, onUpdate: (event: MapChangeEvent) => void): () => void {
     const es = new EventSource(`${this.config.baseUrl}/maps/${mapId}/stream`);
     es.onmessage = (e) => onUpdate(JSON.parse(e.data));
     return () => es.close();
   }
   ```

3. **Auth integration**
   ```typescript
   setToken(token: string): void {
     this.config.token = token;
   }
   ```

### `packages/ui/src/hooks/useMapSubscription.ts` — New hook

```typescript
export function useMapSubscription(
  client: EventGraphApiClient,
  mapId: string | undefined,
  onNodeChange: (nodeId: string) => void,
) {
  useEffect(() => {
    if (!mapId) return;
    return client.subscribeToMap(mapId, (event) => {
      if (event.table === 'nodes') onNodeChange(event.id);
    });
  }, [client, mapId, onNodeChange]);
}
```

---

## 10. Testing Strategy

### Current: 72 unit tests (frontend only)

### Target:

| Layer | Framework | Tests |
|-------|-----------|-------|
| DB schema | `vitest` + `pg` | Seed → query → verify round-trip |
| API routes | `vitest` + `supertest` | Each endpoint: happy path + errors + auth |
| API integration | `vitest` | Full flow: create map → add nodes → search → verify |
| Agent HTTP client | `pytest` | Mock API → verify requests are correct |
| Frontend (existing) | `vitest` | Keep all 72 passing |
| E2E | Playwright (Phase 6+) | Browser → API → DB round-trip |

### Test Database
```
# docker-compose.test.yml — ephemeral PG for tests
services:
  postgres-test:
    image: postgres:16
    tmpfs: /var/lib/postgresql/data   # RAM disk = fast
    environment:
      POSTGRES_DB: radiant_test
```

---

## 11. Infrastructure & Deployment

### Development
```bash
# Start everything:
docker compose up -d          # PG + Redis
pnpm --filter api db:migrate  # Apply schema
pnpm --filter api db:seed     # Import JSON data
pnpm --filter api dev         # Start API (port 3001)
pnpm --filter ui demo         # Start demo (port 5173, proxies to 3001)
```

### Production Options

| Option | Pros | Cons |
|--------|------|------|
| **Railway** | Simple, monorepo support, PG addon | $$$ at scale |
| **Fly.io** | Edge, cheap, Docker-native | More setup |
| **Render** | Free tier, auto-deploy | Cold starts |
| **VPS (Hetzner)** | Cheapest, full control | Manual ops |

**Recommended for MVP:** Railway or Fly.io
- PostgreSQL: Neon (free tier, serverless, branching)
- Redis: Upstash (free tier, serverless)
- API: Railway (auto-deploy from GitHub)

### Environment Variables

```bash
# .env.example
DATABASE_URL=postgresql://radiant:radiant_dev@localhost:5432/radiant
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=change-me-in-production
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Agents
ANTHROPIC_API_KEY=
RADIANT_API_URL=http://localhost:3001/api/v1
RADIANT_API_KEY=   # generated via POST /auth/api-keys

# Polymarket
POLYMARKET_API_URL=https://clob.polymarket.com
```

---

## 12. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Monorepo migration breaks builds | Medium | High | Do Phase 0 as isolated PR, verify CI |
| Agent writes fail during dual-write | Medium | Medium | Keep JSON fallback, compare counts nightly |
| `from` → `parentIds` rename breaks consumers | High | High | Frontend maps both field names for 2 releases |
| Schema migration on live data | Low (no prod yet) | Low | We have no prod users, safe to break |
| Python agents need API running | Medium | Medium | Health check + retry in `api_client.py` |
| TypeScript API perf vs Python | Low | Low | Hono is faster than FastAPI for this workload |

---

## 13. Decision Log

| Date | Decision | Alternatives Considered | Reason |
|------|----------|------------------------|--------|
| 2026-03-13 | PostgreSQL 16 | MongoDB, SQLite, Supabase | JSONB + FTS + NOTIFY; best balance of flexibility and structure |
| 2026-03-13 | Drizzle ORM | Prisma, Kysely, raw SQL | Lightest, best TS inference, no code gen |
| 2026-03-13 | Hono | Express, Fastify, tRPC | Lightweight, Web Standard API, works everywhere |
| 2026-03-13 | Keep Python agents | Rewrite in TS | 16K lines of working agent code; not worth rewriting now |
| 2026-03-13 | pnpm workspaces | npm workspaces, Nx, Lerna | Simplest, fastest, best monorepo support |
| 2026-03-13 | Turborepo | Nx | Simpler config, good enough for 3 packages |
| 2026-03-13 | `node.from` → `parentIds` | Keep `from` | `from` is an import keyword, causes issues in destructuring |
| 2026-03-13 | Composite PK on nodes | UUID PK | All queries scoped by map_id; composite is natural + efficient |
| 2026-03-13 | SSE over WebSocket | WebSocket, polling | Simpler, works through proxies, sufficient for our update rate |
| 2026-03-13 | API key auth for agents | mTLS, OAuth2 client creds | Simplest; agents run in trusted env |

---

## Appendix: Quick Start After Refactor

```bash
# Clone & setup
git clone ... && cd event-graph
cp .env.example .env
pnpm install

# Database
docker compose up -d
pnpm --filter @ratexai/api db:push
pnpm --filter @ratexai/api db:seed

# Development
pnpm dev   # starts API (3001) + demo (5173) concurrently

# Run agents
cd agents
pip install -r requirements.txt
python update_map.py iran-war-2026
python map_predictions.py iran-war-2026

# Tests
pnpm test          # all packages
pnpm test:api      # API only
pnpm test:ui       # UI only
```
