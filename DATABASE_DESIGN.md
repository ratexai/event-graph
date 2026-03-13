# Database Design — RateX Radiant

## Current State

All data stored as flat JSON files on disk:
- `radiant/data/registry.json` — map index
- `radiant/data/maps/*.json` — full map data (nodes, edges, timeslots)
- No user management, no history, no concurrent writes, no search

**Problems:**
- No concurrent write safety (agent + API can corrupt)
- No incremental updates (entire map rewritten on each agent run)
- No audit trail / version history
- No full-text search across nodes
- No user accounts / permissions
- No real-time subscriptions
- Scaling: 1 map = 1 file, 74+ nodes with deep nesting = slow reads

---

## Recommended Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Primary DB** | **PostgreSQL 16+** | JSONB for flexible fields, GIN indexes, full-text search, LISTEN/NOTIFY for real-time, battle-tested |
| **ORM** | **Drizzle ORM** | Type-safe, lightweight, great PostgreSQL support, works with existing TS types |
| **Migrations** | **Drizzle Kit** | Auto-generate migrations from schema changes |
| **Cache** | **Redis** | Pub/sub for real-time, session cache, rate limiting |
| **Time-series** | **TimescaleDB extension** (optional) | Hypertable for probability history if volume grows |

**Why not:**
- MongoDB — graph-like data with relations fits relational better; JSONB gives same flexibility
- Supabase/Firebase — vendor lock-in; we need custom agents writing data
- Neo4j — overkill for our graph size (< 1000 nodes per map)

---

## Schema

### Core Tables

```sql
-- ══════════════════════════════════════════════════════════════
-- 1. MAPS (top-level narrative containers)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE maps (
  id            TEXT PRIMARY KEY,          -- "iran-war-2026"
  title         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active',  -- active | developing | monitoring
  update_cycle  TEXT DEFAULT '12h',
  headline_prob REAL,                      -- current headline probability 0..100
  trend         TEXT,                      -- up | down | flat
  emoji         TEXT,
  node_count    INT DEFAULT 0,

  -- Narrative metadata
  category      TEXT,                      -- war | ai | economics | ...
  sentiment     TEXT DEFAULT 'neu',
  start_prob    REAL,
  current_prob  REAL,

  -- Cui Bono aggregate
  cui_bono      JSONB DEFAULT '{}',        -- NarrativeCuiBono

  -- Branches / sub-storylines
  branches      TEXT[] DEFAULT '{}',

  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_maps_status ON maps(status);


-- ══════════════════════════════════════════════════════════════
-- 2. TIME_SLOTS (timeline columns within a map)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE time_slots (
  id          SERIAL PRIMARY KEY,
  map_id      TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  index       INT NOT NULL,               -- column position
  label       TEXT NOT NULL,              -- "Feb 25"
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  slot_type   TEXT DEFAULT 'past',        -- past | present | near_future | anchor_date
  anchor_id   TEXT,                        -- for anchor_date: linked anchor node

  UNIQUE(map_id, index)
);

CREATE INDEX idx_timeslots_map ON time_slots(map_id);


-- ══════════════════════════════════════════════════════════════
-- 3. NODES (events, anchors, scenarios — the core entity)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE nodes (
  id              TEXT NOT NULL,
  map_id          TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,

  -- Core fields
  col             INT NOT NULL,            -- timeline position
  label           TEXT NOT NULL,
  node_type       TEXT DEFAULT 'fact',     -- fact | anchor | scenario
  category        TEXT NOT NULL,           -- war | politics | economics | ...
  signal          TEXT DEFAULT 'noise',    -- catalyst | escalation | resolution | reversal | noise
  sentiment       TEXT DEFAULT 'neu',      -- pos | neg | neu
  description     TEXT,
  weight          REAL DEFAULT 0.5,        -- 0..1

  -- Scoring
  odds_delta      REAL DEFAULT 0,          -- pp shift
  market_prob     REAL,                    -- 0..100
  source_authority REAL DEFAULT 50,        -- 0..100
  momentum        REAL DEFAULT 0,
  volume          REAL DEFAULT 0,

  -- Source
  source_url      TEXT,
  source_name     TEXT,
  timestamp       TIMESTAMPTZ,
  image_url       TEXT,
  extra           TEXT,                    -- badge text
  tags            TEXT[] DEFAULT '{}',
  temporal        TEXT DEFAULT 'past',     -- past | present | future

  -- Prediction market link (anchors)
  market_platform TEXT,                    -- "polymarket"
  market_question TEXT,
  market_url      TEXT,
  market_slug     TEXT,
  resolves_at     TIMESTAMPTZ,
  trading_volume  TEXT,
  liquidity       TEXT,
  prob_history    REAL[] DEFAULT '{}',     -- sparkline data
  scenarios       TEXT[] DEFAULT '{}',     -- child scenario IDs

  -- RateX probability engine (anchors)
  ratex_prob      REAL,                    -- 0..100
  alpha           REAL,                    -- ratex - market
  alpha_signal    TEXT,                    -- underpriced | overpriced | in_line
  ratex_confidence REAL,                   -- 0..1
  ratex_reasoning TEXT,
  outcomes        JSONB DEFAULT '[]',      -- AnchorOutcome[]
  factors         JSONB DEFAULT '[]',      -- AnchorFactor[]
  dual_prob_history JSONB DEFAULT '[]',    -- DualProbPoint[]

  -- Scenario fields
  parent_anchor   TEXT,                    -- parent anchor node ID
  outcome         TEXT,                    -- YES | NO | PARTIAL
  outcome_prob    REAL,                    -- 0..100
  conditions      TEXT[] DEFAULT '{}',
  next_events     TEXT[] DEFAULT '{}',

  -- Cui Bono (per-node)
  cui_bono        JSONB DEFAULT '{}',      -- { winners, losers, indices, hiddenMotives }

  -- Flexible metadata
  meta            JSONB DEFAULT '{}',

  -- Causal mapping (prediction focus)
  causal_node_ids TEXT[] DEFAULT '{}',     -- for anchors: related fact node IDs
  for_resolution  JSONB DEFAULT '[]',      -- PredictionCausalLink[]
  against_resolution JSONB DEFAULT '[]',   -- PredictionCausalLink[]

  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY (map_id, id)
);

-- Indexes
CREATE INDEX idx_nodes_map        ON nodes(map_id);
CREATE INDEX idx_nodes_type       ON nodes(map_id, node_type);
CREATE INDEX idx_nodes_category   ON nodes(map_id, category);
CREATE INDEX idx_nodes_timestamp  ON nodes(map_id, timestamp);
CREATE INDEX idx_nodes_anchor     ON nodes(map_id) WHERE node_type = 'anchor';
CREATE INDEX idx_nodes_search     ON nodes USING GIN (to_tsvector('english', label || ' ' || COALESCE(description, '')));


-- ══════════════════════════════════════════════════════════════
-- 4. EDGES (causal/temporal links between nodes)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE edges (
  id          SERIAL PRIMARY KEY,
  map_id      TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  from_node   TEXT NOT NULL,
  to_node     TEXT NOT NULL,
  weight      REAL DEFAULT 1,
  edge_type   TEXT DEFAULT 'causal',      -- causal | temporal | reference | influence
  influence   REAL,                        -- pp shift (for influence edges)
  mechanism   TEXT,                        -- short explanation

  UNIQUE(map_id, from_node, to_node)
);

CREATE INDEX idx_edges_map  ON edges(map_id);
CREATE INDEX idx_edges_from ON edges(map_id, from_node);
CREATE INDEX idx_edges_to   ON edges(map_id, to_node);


-- ══════════════════════════════════════════════════════════════
-- 5. INFLUENCE_LINKS (rich links from facts → anchors)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE influence_links (
  id          SERIAL PRIMARY KEY,
  map_id      TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  anchor_id   TEXT NOT NULL,              -- target anchor node
  fact_id     TEXT NOT NULL,              -- source fact node
  influence   REAL NOT NULL,             -- pp shift (e.g., -25)
  mechanism   TEXT NOT NULL,

  UNIQUE(map_id, anchor_id, fact_id)
);

CREATE INDEX idx_influence_anchor ON influence_links(map_id, anchor_id);


-- ══════════════════════════════════════════════════════════════
-- 6. PROBABILITY_HISTORY (time-series for tracking)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE prob_history (
  id          SERIAL PRIMARY KEY,
  map_id      TEXT NOT NULL,
  node_id     TEXT NOT NULL,              -- anchor node
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  market_prob REAL,                        -- Polymarket
  ratex_prob  REAL,                        -- RateX estimate
  alpha       REAL,                        -- difference
  source      TEXT DEFAULT 'agent',        -- agent | manual | polymarket_api

  FOREIGN KEY (map_id, node_id) REFERENCES nodes(map_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_prob_history_node ON prob_history(map_id, node_id, recorded_at);

-- Optional: convert to TimescaleDB hypertable for large-scale
-- SELECT create_hypertable('prob_history', 'recorded_at');


-- ══════════════════════════════════════════════════════════════
-- 7. AGENT_RUNS (audit trail for automated updates)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE agent_runs (
  id            SERIAL PRIMARY KEY,
  map_id        TEXT NOT NULL REFERENCES maps(id),
  agent_type    TEXT NOT NULL,             -- update_map | map_predictions
  model         TEXT NOT NULL,             -- claude-sonnet-4-6
  started_at    TIMESTAMPTZ DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  status        TEXT DEFAULT 'running',    -- running | success | failed

  -- What changed
  nodes_added   INT DEFAULT 0,
  nodes_updated INT DEFAULT 0,
  summary       TEXT,                      -- agent's own summary

  -- Cost tracking
  input_tokens  INT,
  output_tokens INT,

  -- Error info
  error_message TEXT,

  -- Raw response for debugging
  raw_response  JSONB
);

CREATE INDEX idx_agent_runs_map ON agent_runs(map_id, started_at DESC);


-- ══════════════════════════════════════════════════════════════
-- 8. USERS & AUTH
-- ══════════════════════════════════════════════════════════════

CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  avatar_url  TEXT,
  role        TEXT DEFAULT 'viewer',       -- viewer | editor | admin

  -- Auth (external provider or password hash)
  auth_provider TEXT,                      -- google | github | email
  auth_id       TEXT,                      -- external provider user ID
  password_hash TEXT,                      -- for email auth

  -- Preferences
  preferences JSONB DEFAULT '{}',

  created_at  TIMESTAMPTZ DEFAULT now(),
  last_login  TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_users_auth ON users(auth_provider, auth_id);


-- ══════════════════════════════════════════════════════════════
-- 9. USER_MAP_ACCESS (permissions per map)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE user_map_access (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  map_id      TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  role        TEXT DEFAULT 'viewer',       -- viewer | editor | owner

  PRIMARY KEY (user_id, map_id)
);


-- ══════════════════════════════════════════════════════════════
-- 10. BOOKMARKS & ALERTS (user engagement)
-- ══════════════════════════════════════════════════════════════

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
  map_id      TEXT NOT NULL,
  node_id     TEXT,                        -- null = map-level alert
  alert_type  TEXT NOT NULL,               -- prob_change | new_event | signal_shift
  threshold   REAL,                        -- e.g., 5.0 for "notify if prob changes by >5pp"
  active      BOOLEAN DEFAULT true,
  last_fired  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),

  FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE
);
```

---

## Drizzle Schema (TypeScript)

```
radiant/
├── db/
│   ├── schema.ts          -- Drizzle table definitions
│   ├── client.ts          -- Database connection pool
│   ├── migrate.ts         -- Migration runner
│   └── queries/
│       ├── maps.ts        -- Map CRUD + full load
│       ├── nodes.ts       -- Node CRUD + search
│       ├── edges.ts       -- Edge CRUD
│       ├── history.ts     -- Probability history
│       └── agents.ts      -- Agent run tracking
├── api/
│   ├── server.py → server.ts  -- Migrate to TypeScript (Hono/Fastify)
│   └── routes/
│       ├── maps.ts
│       ├── nodes.ts
│       ├── search.ts
│       ├── predictions.ts
│       └── auth.ts
└── agents/                -- Keep Python agents, they write via API
```

### Key Query: Load Full Map (replaces JSON file read)

```sql
-- 1. Map metadata
SELECT * FROM maps WHERE id = $1;

-- 2. Time slots
SELECT * FROM time_slots WHERE map_id = $1 ORDER BY index;

-- 3. All nodes with edges pre-joined
SELECT
  n.*,
  COALESCE(
    json_agg(DISTINCT jsonb_build_object(
      'id', il.fact_id,
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

**Expected response time:** < 50ms for maps with 100 nodes (single roundtrip with CTE or parallel queries).

---

## Migration Strategy (JSON → PostgreSQL)

### Phase 1: Dual-write (1 week)
- API reads from JSON (current behavior)
- Add DB writes alongside JSON writes in agents
- Verify data parity

### Phase 2: DB-primary reads (1 week)
- API reads from PostgreSQL
- JSON files become backup
- Add `/api/v1/maps/{id}/history` endpoint

### Phase 3: JSON removal
- Remove JSON file reads from API
- Agents write directly to DB via API endpoints
- JSON export as optional backup command

### Import Script

```python
# radiant/db/import_json.py
def import_map(map_id: str):
    """Import a JSON map file into PostgreSQL."""
    with open(f"radiant/data/maps/{map_id}.json") as f:
        data = json.load(f)

    # 1. Upsert map
    db.execute(upsert_map(map_id, data))

    # 2. Insert time_slots
    for slot in data["timeSlots"]:
        db.execute(insert_timeslot(map_id, slot))

    # 3. Insert nodes
    for node in data["nodes"]:
        db.execute(insert_node(map_id, node))

        # 3a. Insert influence links
        for link in node.get("influenceLinks", []):
            db.execute(insert_influence_link(map_id, node["id"], link))

    # 4. Derive edges from node.from[]
    for node in data["nodes"]:
        for parent_id in node.get("from", []):
            db.execute(insert_edge(map_id, parent_id, node["id"]))
```

---

## Real-Time Architecture

```
Browser  ←──  SSE/WebSocket  ←──  API Server  ←──  PostgreSQL NOTIFY
                                       ↑
                                   Redis PubSub  ←──  Agent Workers
```

1. Agent updates a node → writes to DB → triggers PostgreSQL `NOTIFY map_update`
2. API server listens → broadcasts via SSE to connected clients
3. Frontend receives update → patches local state → re-renders graph

```sql
-- Trigger for real-time notifications
CREATE OR REPLACE FUNCTION notify_map_update() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('map_update', json_build_object(
    'map_id', NEW.map_id,
    'node_id', NEW.id,
    'action', TG_OP
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER nodes_notify
  AFTER INSERT OR UPDATE ON nodes
  FOR EACH ROW EXECUTE FUNCTION notify_map_update();
```

---

## API Migration: Python → TypeScript

Recommend migrating `server.py` to TypeScript with **Hono** (lightweight, edge-ready):

```typescript
// radiant/api/server.ts
import { Hono } from "hono";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../db/schema";

const app = new Hono();
const db = drizzle(process.env.DATABASE_URL!, { schema });

// GET /api/v1/maps
app.get("/api/v1/maps", async (c) => {
  const maps = await db.select().from(schema.maps);
  return c.json({ maps });
});

// GET /api/v1/maps/:id (full map load)
app.get("/api/v1/maps/:id", async (c) => {
  const mapId = c.req.param("id");
  const [map, slots, nodes, edges] = await Promise.all([
    db.select().from(schema.maps).where(eq(schema.maps.id, mapId)),
    db.select().from(schema.timeSlots).where(eq(schema.timeSlots.mapId, mapId)),
    db.select().from(schema.nodes).where(eq(schema.nodes.mapId, mapId)),
    db.select().from(schema.edges).where(eq(schema.edges.mapId, mapId)),
  ]);
  return c.json({ ...map[0], timeSlots: slots, nodes, edges });
});

// POST /api/v1/maps/:id/nodes (agent writes)
app.post("/api/v1/maps/:id/nodes", authMiddleware("editor"), async (c) => {
  const body = await c.req.json();
  const node = await db.insert(schema.nodes).values(body).returning();
  return c.json(node[0], 201);
});

// GET /api/v1/search?q=
app.get("/api/v1/search", async (c) => {
  const q = c.req.query("q");
  const results = await db.execute(sql`
    SELECT map_id, id, label, description, ts_rank(
      to_tsvector('english', label || ' ' || COALESCE(description, '')),
      plainto_tsquery(${q})
    ) AS rank
    FROM nodes
    WHERE to_tsvector('english', label || ' ' || COALESCE(description, ''))
      @@ plainto_tsquery(${q})
    ORDER BY rank DESC LIMIT 20
  `);
  return c.json(results);
});
```

---

## Infrastructure

### Development
```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: radiant
      POSTGRES_USER: radiant
      POSTGRES_PASSWORD: radiant_dev
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

volumes:
  pgdata:
```

### Production
- **Neon** or **Supabase Postgres** (serverless, auto-scaling, branching for dev)
- **Upstash Redis** (serverless, pay-per-request)
- **Fly.io** or **Railway** for API server

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
| agent_runs | 150 | +300 |

Total: ~8KB per node → 500 nodes = ~4MB. PostgreSQL handles this trivially.

---

## Implementation Priority

### Phase 1 — Foundation (MVP)
1. `docker-compose.yml` + PostgreSQL
2. Drizzle schema + migrations
3. Import script (JSON → PG)
4. API server in TypeScript (Hono)
5. Update Python agents to write via API

### Phase 2 — Service Features
6. User auth (JWT + Google OAuth)
7. Real-time updates (SSE)
8. Full-text search
9. Probability history tracking
10. Agent run audit log

### Phase 3 — Scale
11. Redis caching layer
12. Rate limiting
13. WebSocket for live graph updates
14. TimescaleDB for prob_history
15. Polymarket API integration (auto-fetch prices)
