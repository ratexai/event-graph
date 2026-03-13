# Database Design — Radiant Prediction Domain Service (v2)

> Aligned with REFACTOR_PLAN.md v2 (domain service model)
> Date: 2026-03-13

## Design Principle

**This database stores prediction-domain data only.**

- Users, auth, billing, agent lifecycle → owned by TradingAgenticChat
- Maps, nodes, edges, probabilities, market data → owned here
- Cross-service references use TEXT IDs (no foreign keys across databases)

---

## Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Database** | PostgreSQL 16+ | JSONB, GIN indexes, FTS, LISTEN/NOTIFY |
| **ORM** | Drizzle ORM | Type-safe TS, zero codegen, SQL-composable |
| **Migrations** | Drizzle Kit | Auto-generate from schema changes |
| **Time-series** | TimescaleDB (optional) | Hypertable for prob_history if volume grows |

---

## Schema Overview

### Tables by Domain

**Prediction Core (owned):**
- `maps` — narrative containers
- `time_slots` — timeline columns
- `nodes` — events, anchors, scenarios
- `edges` — causal/temporal links
- `influence_links` — rich fact→anchor links
- `prob_history` — probability time-series

**Platform Integration (references):**
- `map_access` — cached ACL from TradingAgenticChat
- `agent_run_refs` — lightweight references to platform agent runs
- `bookmarks` — user engagement (user_id from JWT, no local user table)
- `alerts` — user alert subscriptions

### ER Diagram

```
maps 1──∞ time_slots
maps 1──∞ nodes
maps 1──∞ edges
nodes 1──∞ influence_links (anchor → facts)
nodes 1──∞ prob_history (time-series)
maps 1──∞ agent_run_refs (references to platform)
maps 1──∞ map_access (cached workspace permissions)
nodes 1──∞ bookmarks (user engagement)
maps 1──∞ alerts (user alert subscriptions)
```

---

## Table Definitions

### 1. `maps` — Top-level narrative containers

```sql
CREATE TABLE maps (
  id            TEXT PRIMARY KEY,              -- "iran-war-2026"
  title         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','developing','monitoring','archived')),
  update_cycle  INTERVAL DEFAULT '12 hours',
  headline_prob REAL CHECK (headline_prob BETWEEN 0 AND 100),
  trend         TEXT CHECK (trend IN ('up','down','flat')),
  emoji         TEXT,

  -- Narrative metadata
  category      TEXT,
  sentiment     TEXT DEFAULT 'neu' CHECK (sentiment IN ('pos','neg','neu')),
  start_prob    REAL CHECK (start_prob BETWEEN 0 AND 100),
  current_prob  REAL CHECK (current_prob BETWEEN 0 AND 100),

  -- Aggregated (denormalized for fast reads)
  node_count    INT DEFAULT 0,
  cui_bono      JSONB DEFAULT '{}',
  branches      TEXT[] DEFAULT '{}',

  -- Platform references (TEXT, not FK — different database)
  owner_workspace_id TEXT,                    -- TradingAgenticChat workspace UUID
  created_by_user_id TEXT,                    -- TradingAgenticChat user UUID

  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_maps_status ON maps(status);
CREATE INDEX idx_maps_workspace ON maps(owner_workspace_id);

CREATE TRIGGER maps_updated_at
  BEFORE UPDATE ON maps
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 2. `time_slots` — Timeline columns

```sql
CREATE TABLE time_slots (
  id          SERIAL PRIMARY KEY,
  map_id      TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  slot_index  INT NOT NULL,
  label       TEXT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  slot_type   TEXT DEFAULT 'past'
              CHECK (slot_type IN ('past','present','near_future','anchor_date')),
  anchor_id   TEXT,

  UNIQUE(map_id, slot_index)
);

CREATE INDEX idx_timeslots_map ON time_slots(map_id);
```

### 3. `nodes` — Events, anchors, scenarios

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

  -- JSONB (complex nested, rarely queried independently)
  cui_bono           JSONB DEFAULT '{}',
  outcomes           JSONB DEFAULT '[]',
  factors            JSONB DEFAULT '[]',
  dual_prob_history  JSONB DEFAULT '[]',
  for_resolution     JSONB DEFAULT '[]',
  against_resolution JSONB DEFAULT '[]',
  meta               JSONB DEFAULT '{}',

  -- Denormalized for graph queries
  parent_ids      TEXT[] DEFAULT '{}',
  causal_node_ids TEXT[] DEFAULT '{}',

  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY (map_id, id)
);

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

### 4. `edges` — Causal/temporal links

```sql
CREATE TABLE edges (
  id          SERIAL PRIMARY KEY,
  map_id      TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  from_node   TEXT NOT NULL,
  to_node     TEXT NOT NULL,
  weight      REAL DEFAULT 1,
  edge_type   TEXT DEFAULT 'causal'
              CHECK (edge_type IN ('causal','temporal','reference','influence')),
  influence   REAL,
  mechanism   TEXT,

  UNIQUE(map_id, from_node, to_node),
  FOREIGN KEY (map_id, from_node) REFERENCES nodes(map_id, id) ON DELETE CASCADE,
  FOREIGN KEY (map_id, to_node) REFERENCES nodes(map_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_edges_map  ON edges(map_id);
CREATE INDEX idx_edges_from ON edges(map_id, from_node);
CREATE INDEX idx_edges_to   ON edges(map_id, to_node);
```

### 5. `influence_links` — Rich fact→anchor links

```sql
CREATE TABLE influence_links (
  id          SERIAL PRIMARY KEY,
  map_id      TEXT NOT NULL,
  anchor_id   TEXT NOT NULL,
  fact_id     TEXT NOT NULL,
  influence   REAL NOT NULL,
  mechanism   TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),

  UNIQUE(map_id, anchor_id, fact_id),
  FOREIGN KEY (map_id, anchor_id) REFERENCES nodes(map_id, id) ON DELETE CASCADE,
  FOREIGN KEY (map_id, fact_id) REFERENCES nodes(map_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_influence_anchor ON influence_links(map_id, anchor_id);
CREATE INDEX idx_influence_fact   ON influence_links(map_id, fact_id);
```

### 6. `prob_history` — Time-series probability tracking

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

-- Optional TimescaleDB:
-- SELECT create_hypertable('prob_history', 'recorded_at', chunk_time_interval => INTERVAL '1 month');
```

### 7. `map_access` — Cached ACL from platform

```sql
-- Source of truth: TradingAgenticChat workspace_members
-- Refreshed via: JWT validation + Kafka workspace.member.changed.v1
-- Fallback: call platform API if cache miss or stale (>1h)

CREATE TABLE map_access (
  workspace_id  TEXT NOT NULL,
  map_id        TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  role          TEXT DEFAULT 'viewer'
                CHECK (role IN ('viewer','editor','owner')),
  cached_at     TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY (workspace_id, map_id)
);

CREATE INDEX idx_map_access_stale ON map_access(cached_at);
```

### 8. `agent_run_refs` — Lightweight platform references

```sql
-- Full agent run lifecycle (cost, LLM tokens, tool calls, memory)
-- is tracked in TradingAgenticChat's agent_runs table.
-- We only store what we need for local display.

CREATE TABLE agent_run_refs (
  id              SERIAL PRIMARY KEY,
  map_id          TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  platform_run_id TEXT NOT NULL UNIQUE,
  agent_type      TEXT NOT NULL
                  CHECK (agent_type IN ('update_map','map_predictions','polymarket_sync')),
  status          TEXT DEFAULT 'running'
                  CHECK (status IN ('running','success','failed')),
  started_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ,

  nodes_added     INT DEFAULT 0,
  nodes_updated   INT DEFAULT 0,
  edges_added     INT DEFAULT 0,
  summary         TEXT
);

CREATE INDEX idx_run_refs_map ON agent_run_refs(map_id, started_at DESC);
```

### 9. `bookmarks` — User engagement

```sql
CREATE TABLE bookmarks (
  id          SERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,              -- platform user UUID (no FK)
  map_id      TEXT NOT NULL,
  node_id     TEXT NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),

  FOREIGN KEY (map_id, node_id) REFERENCES nodes(map_id, id) ON DELETE CASCADE,
  UNIQUE(user_id, map_id, node_id)
);

CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
```

### 10. `alerts` — User alert subscriptions

```sql
CREATE TABLE alerts (
  id          SERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,              -- platform user UUID (no FK)
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

### Shared helpers

```sql
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Real-time notification for SSE
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

---

## Key Query: Load Full Map

```sql
-- Replaces reading a JSON file. 4 parallel queries, < 50ms for 100 nodes.

-- 1. Map metadata
SELECT * FROM maps WHERE id = $1;

-- 2. Time slots (ordered)
SELECT * FROM time_slots WHERE map_id = $1 ORDER BY slot_index;

-- 3. Nodes with influence links
SELECT
  n.*,
  COALESCE(
    json_agg(DISTINCT jsonb_build_object(
      'factId', il.fact_id,
      'influence', il.influence,
      'mechanism', il.mechanism
    )) FILTER (WHERE il.id IS NOT NULL),
    '[]'
  ) AS influence_links
FROM nodes n
LEFT JOIN influence_links il ON il.map_id = n.map_id AND il.anchor_id = n.id
WHERE n.map_id = $1
GROUP BY n.map_id, n.id;

-- 4. Edges
SELECT * FROM edges WHERE map_id = $1;
```

---

## What's NOT in This Database

| Concern | Where It Lives | Why |
|---------|---------------|-----|
| Users & identity | TradingAgenticChat `users` table | UUID-first model, 17 Alembic revisions |
| Workspaces & tenancy | TradingAgenticChat `workspaces` | RLS policies, member management |
| Authentication | TradingAgenticChat JWT issuance | OAuth, linked accounts, password hash |
| Agent lifecycle | TradingAgenticChat `agent_runs` | Cost tracking, LLM transactions, tool calls |
| Billing | TradingAgenticChat `billing_ledger` | Append-only, idempotency keys |
| Chat messages | TradingAgenticChat `messages` | Conversations, message parts, widgets |
| Execution | TradingAgenticChat `execution_intents` | Wallet bindings, trading actions |

---

## Estimated Sizes

| Table | Rows (5 maps, 100 nodes/map) | Growth/month |
|-------|------------------------------|--------------|
| maps | 5-50 | +2-5 |
| nodes | 500 | +200-500 |
| edges | 1,500 | +600-1,500 |
| time_slots | 100 | +50-100 |
| influence_links | 300 | +100-200 |
| prob_history | 5,000 | +10,000+ |
| agent_run_refs | 150 | +300 |
| map_access | 50 | +20 |
| bookmarks | 100 | +500 |
| alerts | 50 | +200 |

Total: ~8KB per node → 500 nodes = ~4MB. Trivial for PostgreSQL.

---

## Infrastructure

### Development
```yaml
# docker-compose.yml — prediction DB only
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: radiant_prediction
      POSTGRES_USER: radiant
      POSTGRES_PASSWORD: radiant_dev
    ports: ["5433:5432"]          # 5433 to avoid conflict with platform DB on 5432
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U radiant -d radiant_prediction"]
      interval: 5s
      retries: 3

volumes:
  pgdata:
```

### Production
- **Neon PostgreSQL** (serverless, separate instance from TradingAgenticChat)
- Both services use PG but with independent databases for deployment isolation
