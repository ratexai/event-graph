# Radiant — Refactoring Plan v2: Prediction Domain Service

> Status: **DRAFT v2 — requires team sign-off**
> Author: Claude / RateX AI
> Date: 2026-03-13
> Supersedes: v1 (standalone full-stack approach)

---

## Table of Contents

1. [Strategic Context: Where event-graph Fits](#1-strategic-context)
2. [Why Drizzle? Why Hono?](#2-technology-choices)
3. [Current Architecture](#3-current-architecture)
4. [Target Architecture (Domain Service Model)](#4-target-architecture)
5. [Domain Boundaries: What Lives Where](#5-domain-boundaries)
6. [Integration Layer: event-graph ↔ TradingAgenticChat](#6-integration-layer)
7. [Data Sources: Harvesters, Polymarket, MCP](#7-data-sources)
8. [Database Schema (Prediction Domain Only)](#8-database-schema)
9. [Monorepo Restructure](#9-monorepo-restructure)
10. [Refactoring Phases](#10-refactoring-phases)
11. [API Contract](#11-api-contract)
12. [Agent Strategy: Delegation, Not Duplication](#12-agent-strategy)
13. [Frontend Client Changes](#13-frontend-client-changes)
14. [Testing Strategy](#14-testing-strategy)
15. [Infrastructure & Deployment](#15-infrastructure--deployment)
16. [Risks & Mitigations](#16-risks--mitigations)
17. [Decision Log](#17-decision-log)

---

## 1. Strategic Context

### The RateXAI Ecosystem

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         RateXAI PLATFORM                                │
│                                                                         │
│  ┌────────────────────────────────────────────────────┐                 │
│  │  TradingAgenticChat (Control Plane)                │                 │
│  │                                                    │                 │
│  │  ▸ Identity: users, workspaces, workspace_members  │                 │
│  │  ▸ Auth: JWT, OAuth (Google/GitHub), linked accts  │                 │
│  │  ▸ Chat: conversations, messages, message_parts    │                 │
│  │  ▸ Agent Runtime: agents, agent_versions, runs     │                 │
│  │  ▸ Billing: billing_ledger, llm_transactions       │                 │
│  │  ▸ Execution: wallet_bindings, execution_intents   │                 │
│  │  ▸ Marketplace: agent profiles, forks, installs    │                 │
│  │  ▸ Events: Avro → Kafka → Spark/Iceberg            │                 │
│  │  ▸ Infra: PostgreSQL + Alembic, RLS, audit         │                 │
│  │                                                    │                 │
│  │  Stack: Python, FastAPI, Alembic, PostgreSQL        │                 │
│  └───────────────────────┬────────────────────────────┘                 │
│                          │                                              │
│                   JWT tokens, Kafka events,                             │
│                   Agent run API, User context                           │
│                          │                                              │
│  ┌───────────────────────▼────────────────────────────┐                 │
│  │  event-graph / Radiant (Prediction Domain Service) │  ← THIS REPO   │
│  │                                                    │                 │
│  │  ▸ Prediction Maps: maps, nodes, edges, timeslots  │                 │
│  │  ▸ Probability Engine: prob_history, influence      │                 │
│  │  ▸ Market Integration: Polymarket API/MCP           │                 │
│  │  ▸ Visualization: React graph library               │                 │
│  │  ▸ Agent Runs: tracked in TradingAgenticChat        │                 │
│  │  ▸ Auth: validates TradingAgenticChat JWTs          │                 │
│  │                                                    │                 │
│  │  Stack: TypeScript, Hono, Drizzle, PostgreSQL       │                 │
│  └────────────────────────────────────────────────────┘                 │
│                                                                         │
│  ┌────────────────────────────────┐                                     │
│  │  Legacy Services               │                                     │
│  │  ▸ Harvester (news parsing)    │                                     │
│  │  ▸ Existing RateXAI auth       │                                     │
│  └────────────────────────────────┘                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Insight

**event-graph is a domain service, not a platform.**

TradingAgenticChat is the platform — it owns users, auth, agents, billing, execution.
event-graph owns **prediction maps** — the specialized visualization + probability tracking
for prediction market audiences.

**Consequences:**
- NO auth system in event-graph → validate JWTs issued by TradingAgenticChat
- NO agent runner in event-graph → register prediction agents in TradingAgenticChat's runtime
- NO billing in event-graph → cost events flow to TradingAgenticChat's ledger
- NO user management → user context comes from JWT claims
- YES own database → prediction-specific schema (maps, nodes, prob_history)
- YES own API → prediction-specific endpoints (Hono, lightweight)
- YES own Polymarket integration → domain-specific, not platform concern
- YES own visualization → React library (@ratexai/event-graph)

---

## 2. Technology Choices

### Why Hono (not FastAPI, not Express)?

| Factor | Hono | FastAPI (TradingAgenticChat) | Express |
|--------|------|-----|---------|
| **Language** | TypeScript | Python | TypeScript |
| **Why it fits** | Same language as React library = shared types, single toolchain | Already powers the platform | Heavy, old patterns |
| **Performance** | ~50K req/s, Web Standard API | ~15K req/s (uvicorn) | ~20K req/s |
| **Bundle** | 14KB | N/A | 200KB+ |
| **Edge deploy** | CF Workers, Deno, Bun, Node | Server only | Server only |
| **Middleware** | Built-in JWT validation, CORS, rate-limit | Built-in | Needs express-jwt, cors, etc. |

**The real reason:** event-graph is a TypeScript monorepo. The React library, shared types,
API server, and Drizzle schema all share one language. Introducing Python for a 79-line
API server means two runtimes, two CI pipelines, no shared types. Hono lets us keep
everything in one `pnpm build`.

The Python agents stay Python — they call our API over HTTP. But the API itself is TS.

### Why Drizzle (not Alembic, not Prisma)?

| Factor | Drizzle | Alembic (TradingAgenticChat) | Prisma |
|--------|---------|---------|--------|
| **Language** | TypeScript | Python | TypeScript |
| **Schema definition** | TS code → SQL | Python code → SQL | .prisma DSL → TS |
| **Type inference** | Direct from schema (zero codegen) | N/A (Python types separate) | Generated client |
| **Migration** | `drizzle-kit generate` + `push` | `alembic revision --autogenerate` | `prisma migrate` |
| **Query builder** | SQL-like, composable | SQLAlchemy | Abstracted, limited raw SQL |
| **Bundle size** | ~50KB | N/A | ~2MB |

**The real reason:** TradingAgenticChat uses Alembic because it's Python. We're TypeScript.
Drizzle is the lightest, most type-safe ORM in the TS ecosystem. Schema-as-code, zero codegen,
direct SQL composability. We don't need Prisma's abstraction layer for a domain service
with well-defined queries.

**Both services use PostgreSQL** — this is intentional. Shared DB engine means shared operational
knowledge, shared connection pooling patterns, and the option to share a cluster if needed.

### Why not share TradingAgenticChat's database directly?

**Tempting but wrong.** Shared database = coupled services. If TradingAgenticChat runs a migration,
event-graph breaks. If event-graph runs a heavy query, TradingAgenticChat slows down.

Instead: **separate databases, shared auth tokens, event-driven sync.**

```
TradingAgenticChat DB (Alembic)    event-graph DB (Drizzle)
├── users                          ├── maps
├── workspaces                     ├── nodes
├── conversations                  ├── edges
├── agents                         ├── time_slots
├── billing_ledger                 ├── influence_links
├── ...                            ├── prob_history
│                                  ├── agent_run_refs  ← references, not copies
│                                  ├── map_access      ← thin ACL cache
│                                  └── bookmarks / alerts

Sync: JWT claims (user_id, workspace_id) + Kafka events + API calls
```

---

## 3. Current Architecture

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
┌──────────────────┐  writes JSON         │
│ radiant/agents/  │─────────────────────→│
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
| `src/components/EventGraph.tsx` | TSX | ~476 | Main orchestrator |
| `src/components/` (all) | TSX | ~6900 | Full graph rendering suite |
| `radiant/api/server.py` | Python | 79 | FastAPI — serves JSON files |
| `radiant/agents/update_map.py` | Python | ~273 | Claude agent — discovers events |
| `radiant/agents/map_predictions.py` | Python | ~249 | Claude agent — maps predictions |
| `radiant/agents/config.py` | Python | 11 | Agent config |
| `radiant/data/maps/*.json` | JSON | varies | 5 map files, 1 populated (74 nodes) |
| `radiant/data/registry.json` | JSON | 54 | Map index |
| `demo/` | TSX | ~3400 | Demo app with hardcoded data |

### Problems Blocking Service Launch

| # | Problem | Impact | v2 Solution |
|---|---------|--------|-------------|
| 1 | **No database** — JSON files on disk | No concurrent writes, no transactions | Own PostgreSQL (Drizzle) |
| 2 | **No user system** | Can't track who sees what | Validate TradingAgenticChat JWTs |
| 3 | **No audit trail** | Agent runs fire-and-forget | Log agent_run_refs, details in TradingAgenticChat |
| 4 | **No real-time** | Client must poll | PG NOTIFY → SSE |
| 5 | **No search** | Can't search across maps/nodes | PG full-text search (GIN) |
| 6 | **No version history** | Can't see probability evolution | `prob_history` table |
| 7 | **Python API is minimal** | 4 endpoints, no validation | Hono with Zod validation |
| 8 | **Mixed Python + TS** | Two runtimes for API | TS API, Python agents stay Python |
| 9 | **No incremental updates** | Agent rewrites entire map file | Node-level CRUD via API |
| 10 | **No Polymarket sync** | Manual probability updates | MCP/API direct integration |
| 11 | **Duplicates platform concerns** | Would rebuild auth, billing, agents | Delegates to TradingAgenticChat |

---

## 4. Target Architecture (Domain Service Model)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TARGET STATE — Prediction Domain Service within RateXAI               │
└─────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────────────────┐
                    │  TradingAgenticChat (Platform)    │
                    │                                  │
                    │  ▸ Auth (JWT issuer)             │
                    │  ▸ Agent Runtime                 │
                    │  ▸ Billing Ledger                │
                    │  ▸ Kafka Event Bus               │
                    │  ▸ User/Workspace mgmt           │
                    └──────┬─────────────┬─────────────┘
                           │             │
              JWT tokens   │             │  Kafka events
              Agent API    │             │  (Avro schemas)
                           │             │
┌──────────┐  npm pkg  ┌──▼─────────────▼──────────────────────────┐
│ packages/│──────────→│  Host App (Next.js / RateXAI frontend)    │
│ ui/      │           │  or TradingAgenticChat chat UI             │
│ (React)  │           └─────────────────┬─────────────────────────┘
└──────────┘                             │
                                         │ REST + SSE
                                         │
┌────────────────────────────────────────▼─────────────────────────┐
│  packages/api/ — Hono + Drizzle + PostgreSQL                     │
│  (Prediction Domain Service)                                     │
│                                                                  │
│  Auth:                                                           │
│  ├── middleware/auth.ts  → validates TradingAgenticChat JWTs     │
│  ├── middleware/agent.ts → validates agent API keys              │
│  └── NO own user management                                     │
│                                                                  │
│  Routes (prediction-specific):                                   │
│  ├── routes/maps.ts          → CRUD maps                        │
│  ├── routes/nodes.ts         → CRUD nodes + batch upsert        │
│  ├── routes/predictions.ts   → prob history, alpha, anchors     │
│  ├── routes/search.ts        → full-text across maps            │
│  ├── routes/polymarket.ts    → market sync status, triggers     │
│  ├── routes/sse.ts           → real-time map change stream      │
│  └── routes/health.ts        → liveness/readiness               │
│                                                                  │
│  Integration:                                                    │
│  ├── lib/polymarket.ts       → Polymarket CLOB API client       │
│  ├── lib/mcp-polymarket.ts   → MCP server for Polymarket tools  │
│  ├── lib/harvester-client.ts → Consume news from legacy API     │
│  ├── lib/kafka.ts            → Publish/consume Avro events      │
│  └── lib/platform-client.ts  → Call TradingAgenticChat API      │
│                                                                  │
│  DB:                                                             │
│  ├── db/schema.ts            → Drizzle tables (prediction only) │
│  ├── db/client.ts            → Connection pool                  │
│  └── db/seed.ts              → JSON → DB import                 │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
               ┌──────────────┐
               │ PostgreSQL   │  event-graph's own DB
               │ (prediction) │  NOT shared with TradingAgenticChat
               └──────────────┘
                       ▲
                       │ HTTP API calls
┌──────────────────────┴──────────────────────────────────────────┐
│  agents/ (Python) — registered in TradingAgenticChat runtime    │
│                                                                 │
│  update_map.py      → POST /api/v1/maps/:id/nodes/batch        │
│  map_predictions.py → PATCH /api/v1/maps/:id/nodes/:id         │
│  polymarket_sync.py → GET polymarket API → POST prob_history    │
│                                                                 │
│  These agents are REGISTERED in TradingAgenticChat's agent      │
│  runtime (agent_versions table). Their runs are tracked there.  │
│  event-graph only stores a lightweight agent_run_ref.           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  External Data Sources                                          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ Polymarket   │  │ Legacy       │  │ TradingAgenticChat │    │
│  │ CLOB API     │  │ Harvester    │  │ Kafka Events       │    │
│  │              │  │ (news parse) │  │ (Avro)             │    │
│  └──────┬───────┘  └──────┬───────┘  └────────┬───────────┘    │
│         │                 │                    │                │
│         │  REST/MCP       │  REST              │  Kafka consume │
│         └─────────────────┴────────────────────┘                │
│                           │                                     │
│                  event-graph API ingests                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Domain Boundaries: What Lives Where

### event-graph OWNS (this repo)

| Domain | Data | API | Rationale |
|--------|------|-----|-----------|
| **Prediction Maps** | maps, nodes, edges, time_slots | Full CRUD | Core domain entity |
| **Probability Engine** | prob_history, influence_links | Read/write | Prediction-specific time-series |
| **Market Integration** | Polymarket sync state | Sync triggers | Domain-specific data source |
| **Visualization** | React components, hooks, themes | npm package | Rendering is the product |
| **Map Access Control** | map_access (thin ACL cache) | Check on read | Cached from platform, not authoritative |
| **User Engagement** | bookmarks, alerts (prediction-specific) | CRUD | UX features scoped to maps |
| **Agent Run References** | agent_run_refs (FK-less) | Read only | Lightweight log, details in platform |

### TradingAgenticChat OWNS (delegated)

| Domain | Why NOT in event-graph |
|--------|----------------------|
| **Users & Identity** | UUID-first model, external_id bootstrap, username policy — already built |
| **Workspaces & Tenancy** | workspace_members, RLS policies — already built with Alembic |
| **Authentication** | JWT issuance, OAuth flows, linked accounts — already built |
| **Agent Runtime** | agent_versions, agent_runs, memory_snapshots — would duplicate 006/007 migrations |
| **Billing & Cost** | billing_ledger, llm_transactions — append-only with idempotency keys |
| **Execution** | wallet_bindings, execution_intents — trading domain, not prediction |
| **Chat** | conversations, messages — chat is the platform, maps are a widget inside it |
| **Avro Event Bus** | Schema governance, Kafka infra — centralized |

### Shared / Negotiated

| Concern | Approach |
|---------|----------|
| **Auth tokens** | TradingAgenticChat issues JWTs → event-graph validates with shared JWKS |
| **User context** | JWT claims carry `user_id`, `workspace_id`, `role` — no user table needed |
| **Agent registration** | Prediction agents registered as `agent_versions` in TradingAgenticChat |
| **Agent run tracking** | Runs tracked in TradingAgenticChat's `agent_runs` → event-graph stores `agent_run_ref` |
| **Cost attribution** | Agent LLM costs → TradingAgenticChat's `llm_transactions` → billing_ledger |
| **Events** | event-graph publishes `prediction.map.updated.v1` to Kafka, TradingAgenticChat consumes |
| **News data** | Legacy harvester → TradingAgenticChat integration → Kafka event → event-graph consumes |

---

## 6. Integration Layer: event-graph ↔ TradingAgenticChat

### 6.1 Authentication Flow

```
User → RateXAI Frontend → TradingAgenticChat /auth/login
                                    │
                                    ▼
                             JWT { user_id, workspace_id, role, exp }
                                    │
                          ┌─────────┴─────────┐
                          │                   │
                          ▼                   ▼
                TradingAgenticChat    event-graph API
                (issuer, full user)   (validator, claims only)
```

**event-graph auth middleware:**
```typescript
// packages/api/src/middleware/auth.ts
// Validates JWT using TradingAgenticChat's JWKS endpoint
// Extracts: user_id, workspace_id, role
// NO user table lookup — trust the token

const JWKS_URL = process.env.PLATFORM_JWKS_URL; // TradingAgenticChat /.well-known/jwks.json

async function validateToken(token: string): Promise<TokenClaims> {
  const jwks = createRemoteJWKSet(new URL(JWKS_URL));
  const { payload } = await jwtVerify(token, jwks, {
    issuer: 'ratexai-platform',
    audience: 'ratexai-services',
  });
  return {
    userId: payload.sub as string,
    workspaceId: payload.workspace_id as string,
    role: payload.role as string,
  };
}
```

**Why no user table?** TradingAgenticChat already has users with 17 Alembic revisions of
hardening. Duplicating it here means sync drift, double migration burden, and split
identity. JWT claims are sufficient for authorization.

**Exception: map_access cache.** We cache workspace → map permissions locally so we don't
need to call TradingAgenticChat on every map read. Cache is refreshed on token refresh
or via Kafka `workspace.member.changed.v1` events.

### 6.2 Agent Integration Flow

```
┌────────────────────────────────────┐
│  TradingAgenticChat Agent Runtime  │
│                                    │
│  agent_versions:                   │
│  ├── radiant-update-map v1.0       │  ← registered here
│  ├── radiant-map-predictions v1.0  │
│  └── radiant-polymarket-sync v1.0  │
│                                    │
│  agent_runs:                       │
│  ├── run_abc123 (update-map, iran) │  ← tracked here
│  │   ├── llm_transactions: $0.12   │
│  │   └── tool_calls: web_search ×3 │
│  └── run_def456 (predictions, iran)│
└──────────────┬─────────────────────┘
               │
               │ 1. Platform schedules agent run
               │ 2. Agent calls event-graph API
               │ 3. Platform logs cost/audit
               │
               ▼
┌──────────────────────────────────────┐
│  event-graph API                     │
│                                      │
│  POST /api/v1/maps/:id/nodes/batch   │  ← agent writes nodes
│  PATCH /api/v1/maps/:id/nodes/:id    │  ← agent updates predictions
│  POST /api/v1/maps/:id/prob          │  ← agent records probability
│                                      │
│  agent_run_refs:                     │
│  ├── platform_run_id: "run_abc123"   │  ← lightweight reference
│  │   map_id: "iran-war-2026"         │
│  │   nodes_added: 5                  │
│  │   completed_at: 2026-03-13T18:00  │
│  └── (no cost data — that's in the   │
│       platform's billing_ledger)     │
└──────────────────────────────────────┘
```

**Why not run agents independently?**
- TradingAgenticChat already has `agent_runs` table with `parent_run_id`, depth guards,
  memory snapshots, and LLM cost tracking (Phase 4, revisions 006/007).
- Duplicating this means re-implementing idempotency, billing reconciliation, and
  the marketplace install model.
- Prediction agents are just another agent type in the platform. They happen to
  write to event-graph's DB instead of the chat DB.

### 6.3 Event Flow (Kafka/Avro)

```
event-graph PUBLISHES:
├── prediction.map.updated.v1        → map metadata changed
├── prediction.node.created.v1       → new event/anchor/scenario added
├── prediction.prob.changed.v1       → probability reading recorded
└── prediction.alert.triggered.v1    → alert threshold crossed

event-graph CONSUMES:
├── workspace.member.changed.v1      → refresh map_access cache
├── agent.run.completed.v1           → update agent_run_refs
├── harvester.news.published.v1      → candidate events for map update
└── chat.request.recorded.v1         → link chat context to map interactions
```

**Avro schema compatibility:** event-graph follows the same Avro governance model
as TradingAgenticChat (versioned schemas under `schemas/avro/`, Schema Registry
compatibility checks, DLQ for decode failures).

### 6.4 Cross-Service API Calls

| Direction | Call | When |
|-----------|------|------|
| event-graph → Platform | `GET /api/v1/agent-runs/:id` | Display agent run details in UI |
| event-graph → Platform | `POST /api/v1/agent-runs` | Start a prediction agent run on-demand |
| event-graph → Platform | `GET /api/v1/workspaces/:id/members` | Refresh map_access cache |
| Platform → event-graph | `GET /api/v1/maps` | Show prediction maps in chat sidebar |
| Platform → event-graph | `GET /api/v1/maps/:id` | Embed prediction widget in chat |
| Platform → event-graph | `GET /api/v1/maps/:id/predictions` | Show prediction summary |

---

## 7. Data Sources: Harvesters, Polymarket, MCP

### 7.1 Polymarket Integration

Polymarket is core to the prediction domain. event-graph owns this integration directly.

**Option A: Direct REST API (recommended for MVP)**
```
┌──────────────┐     REST      ┌─────────────────────────────┐
│ Polymarket   │──────────────→│ packages/api/src/lib/        │
│ CLOB API     │               │ polymarket.ts                │
│              │               │                              │
│ GET /markets │               │ ▸ fetchMarketBySlug(slug)    │
│ GET /prices  │               │ ▸ fetchCurrentPrice(tokenId) │
│ WS /prices   │               │ ▸ subscribePrice(slug, cb)   │
└──────────────┘               └─────────────────────────────┘
```

**Option B: MCP Server (recommended for agent interaction)**
```
┌──────────────────────────────────────────────────┐
│ MCP Server: @ratexai/mcp-polymarket              │
│                                                  │
│ Tools:                                           │
│ ├── polymarket_search(query)                     │
│ │   → search markets by keyword                  │
│ ├── polymarket_market(slug)                      │
│ │   → get market details + current price         │
│ ├── polymarket_price_history(slug, days)         │
│ │   → get price history for sparklines           │
│ ├── polymarket_orderbook(slug)                   │
│ │   → get order book depth                       │
│ └── polymarket_related(slug)                     │
│     → find related markets                       │
│                                                  │
│ Resources:                                       │
│ ├── polymarket://market/{slug}                   │
│ └── polymarket://market/{slug}/history           │
│                                                  │
│ Used by:                                         │
│ ├── Claude agents (via TradingAgenticChat)       │
│ ├── event-graph API (server-side)                │
│ └── Chat UI (via agent tool calls)               │
└──────────────────────────────────────────────────┘
```

**Recommendation:** Build BOTH.
- Direct REST client for the `polymarket_sync.py` scheduled agent (runs every 30min).
- MCP server for ad-hoc queries from Claude agents during map updates.
- MCP tools are registered in TradingAgenticChat's agent runtime so any chat agent
  can query Polymarket through the prediction service.

### 7.2 Legacy Harvester Integration

The existing harvester service parses news. event-graph consumes its output.

**Two consumption paths:**

```
Path 1: REST API (synchronous, on-demand)
┌─────────────┐    GET /news?topic=iran    ┌──────────────────┐
│ Harvester   │◄──────────────────────────│ event-graph API  │
│ API         │─────────────────────────→│ lib/harvester.ts │
│             │    [{ title, url, date }] │                  │
└─────────────┘                           └──────────────────┘
Used by: update_map.py agent when it needs recent news context

Path 2: Kafka events (async, real-time)
┌─────────────┐  harvester.news.published.v1  ┌──────────────────┐
│ Harvester   │──────────────────────────────→│ event-graph      │
│             │          Kafka                │ Kafka consumer   │
└─────────────┘                               └──────────────────┘
Used by: background process that flags candidate events for map updates
```

### 7.3 Data Source Priority Matrix

| Source | Protocol | Frequency | Owner | Priority |
|--------|----------|-----------|-------|----------|
| **Polymarket CLOB API** | REST + WebSocket | Every 30min (sync) + real-time (WS) | event-graph | P0 — core to product |
| **Legacy Harvester** | REST + Kafka | On-demand + streaming | Shared | P1 — news feeds agents |
| **Claude Web Search** | Tool call (via agent) | Per agent run (2x/day) | TradingAgenticChat runtime | P0 — agent discovers events |
| **User input** | REST (event-graph API) | Ad-hoc | event-graph | P1 — manual node creation |
| **TradingAgenticChat events** | Kafka (Avro) | Continuous | Platform | P2 — cross-service sync |

---

## 8. Database Schema (Prediction Domain Only)

**Key change from v1:** Removed `users`, `user_map_access` (full user table),
and `agent_runs` (full audit). Replaced with thin references.

### 8.1 Entity-Relationship Diagram

```
maps 1──∞ time_slots
maps 1──∞ nodes
maps 1──∞ edges
nodes 1──∞ influence_links (anchor → facts)
nodes 1──∞ prob_history (time-series)
maps 1──∞ agent_run_refs (lightweight references to platform runs)
maps 1──∞ map_access (cached ACL from platform)
maps 1──∞ bookmarks (user engagement, keyed by platform user_id)
maps 1──∞ alerts (user engagement)
```

### 8.2 Tables — Prediction Core

#### `maps` — Top-level narrative containers

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

  -- Aggregated (denormalized)
  node_count    INT DEFAULT 0,
  cui_bono      JSONB DEFAULT '{}',
  branches      TEXT[] DEFAULT '{}',

  -- Platform references (NOT foreign keys — different database)
  owner_workspace_id TEXT,                    -- workspace that created this map
  created_by_user_id TEXT,                    -- user who created (from JWT claims)

  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_maps_status ON maps(status);
CREATE INDEX idx_maps_workspace ON maps(owner_workspace_id);
```

#### `time_slots`, `nodes`, `edges`, `influence_links`, `prob_history`

Same as v1 (see DATABASE_DESIGN.md) — these are prediction-domain tables,
no changes needed. The schema is correct as designed.

### 8.3 Tables — Platform Integration (NEW / CHANGED)

#### `map_access` — Cached ACL (replaces `user_map_access`)

```sql
-- Thin ACL cache. Source of truth is TradingAgenticChat's workspace_members.
-- Refreshed on JWT validation + Kafka workspace.member.changed.v1 events.
-- If cache misses, fall back to platform API call.

CREATE TABLE map_access (
  workspace_id  TEXT NOT NULL,                -- from platform
  map_id        TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  role          TEXT DEFAULT 'viewer'
                CHECK (role IN ('viewer','editor','owner')),
  cached_at     TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY (workspace_id, map_id)
);

-- TTL: entries older than 1 hour are considered stale → re-validate
CREATE INDEX idx_map_access_stale ON map_access(cached_at);
```

#### `agent_run_refs` — Lightweight references (replaces `agent_runs`)

```sql
-- We don't duplicate the full agent run lifecycle.
-- TradingAgenticChat owns the agent_runs table with cost tracking,
-- LLM transactions, memory snapshots, etc.
-- We only store what we need for local display + debugging.

CREATE TABLE agent_run_refs (
  id            SERIAL PRIMARY KEY,
  map_id        TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  platform_run_id TEXT NOT NULL,              -- TradingAgenticChat agent_runs.id
  agent_type    TEXT NOT NULL
                CHECK (agent_type IN ('update_map','map_predictions','polymarket_sync')),
  status        TEXT DEFAULT 'running'
                CHECK (status IN ('running','success','failed')),
  started_at    TIMESTAMPTZ DEFAULT now(),
  completed_at  TIMESTAMPTZ,

  -- Summary of what changed in event-graph
  nodes_added   INT DEFAULT 0,
  nodes_updated INT DEFAULT 0,
  edges_added   INT DEFAULT 0,
  summary       TEXT,

  UNIQUE(platform_run_id)
);

CREATE INDEX idx_run_refs_map ON agent_run_refs(map_id, started_at DESC);
```

#### `bookmarks` + `alerts` — User engagement (simplified)

```sql
-- User references by platform user_id (UUID string, NOT a foreign key)
-- No local user table — user_id comes from JWT claims

CREATE TABLE bookmarks (
  id          SERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,                  -- platform user UUID
  map_id      TEXT NOT NULL,
  node_id     TEXT NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),

  FOREIGN KEY (map_id, node_id) REFERENCES nodes(map_id, id) ON DELETE CASCADE,
  UNIQUE(user_id, map_id, node_id)
);

CREATE TABLE alerts (
  id          SERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,                  -- platform user UUID
  map_id      TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  node_id     TEXT,
  alert_type  TEXT NOT NULL
              CHECK (alert_type IN ('prob_change','new_event','signal_shift','agent_complete')),
  threshold   REAL,
  active      BOOLEAN DEFAULT true,
  last_fired  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX idx_alerts_active ON alerts(user_id) WHERE active = true;
```

### 8.4 What Was Removed vs v1

| v1 Table | v2 Decision | Reason |
|----------|-------------|--------|
| `users` | **REMOVED** | TradingAgenticChat owns user identity (17 Alembic revisions of hardening) |
| `user_map_access` (full) | **→ `map_access`** (cache) | No user FK needed, workspace-level ACL, cached from platform |
| `agent_runs` (full) | **→ `agent_run_refs`** (ref) | Cost/LLM/audit data stays in platform's billing_ledger |

### 8.5 Schema Decisions

| Decision | Rationale |
|----------|-----------|
| **No `users` table** | JWT claims provide user_id/workspace_id; TradingAgenticChat is identity authority |
| **`map_access` as cache** | Avoids cross-DB foreign keys; TTL + Kafka sync keeps it fresh |
| **`agent_run_refs` not `agent_runs`** | Full audit trail (cost, LLM tokens, tool calls) lives in platform |
| **`user_id TEXT` not `UUID`** | No FK to local users table; just a reference string from JWT |
| **Platform references are TEXT, not FK** | Different databases; referential integrity is eventual via events |
| **Prediction tables unchanged** | maps/nodes/edges/prob_history are domain-owned, schema is correct |

---

## 9. Monorepo Restructure

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
│   ├── api/                         # Prediction Domain API (NEW)
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── maps.ts
│   │   │   │   ├── nodes.ts
│   │   │   │   ├── edges.ts
│   │   │   │   ├── predictions.ts
│   │   │   │   ├── search.ts
│   │   │   │   ├── polymarket.ts
│   │   │   │   └── sse.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts          # JWT validation (TradingAgenticChat tokens)
│   │   │   │   ├── agent-auth.ts    # API key auth (for prediction agents)
│   │   │   │   ├── rateLimit.ts
│   │   │   │   └── cors.ts
│   │   │   ├── db/
│   │   │   │   ├── schema.ts        # Drizzle schema (prediction tables only)
│   │   │   │   ├── client.ts        # Connection pool
│   │   │   │   ├── migrate.ts
│   │   │   │   └── seed.ts          # JSON → DB import
│   │   │   ├── lib/
│   │   │   │   ├── polymarket.ts    # Polymarket REST client
│   │   │   │   ├── harvester.ts     # Legacy harvester API client
│   │   │   │   ├── platform.ts      # TradingAgenticChat API client
│   │   │   │   ├── kafka.ts         # Avro event pub/sub
│   │   │   │   └── notify.ts        # PG NOTIFY → SSE bridge
│   │   │   └── server.ts            # Hono app entry
│   │   ├── drizzle/                 # Generated migrations
│   │   ├── package.json             # @ratexai/prediction-api
│   │   └── tsconfig.json
│   │
│   ├── mcp-polymarket/              # MCP Server for Polymarket (NEW)
│   │   ├── src/
│   │   │   ├── server.ts            # MCP server entry
│   │   │   ├── tools/
│   │   │   │   ├── search.ts
│   │   │   │   ├── market.ts
│   │   │   │   ├── price-history.ts
│   │   │   │   └── orderbook.ts
│   │   │   └── resources/
│   │   │       └── market.ts
│   │   ├── package.json             # @ratexai/mcp-polymarket
│   │   └── tsconfig.json
│   │
│   └── shared/                      # Shared types & validation (NEW)
│       ├── src/
│       │   ├── types.ts             # Data contracts (maps, nodes, predictions)
│       │   ├── enums.ts             # Enum values as const arrays
│       │   ├── validation.ts        # Zod schemas for API validation
│       │   └── avro.ts              # Avro schema type helpers
│       ├── package.json             # @ratexai/prediction-shared
│       └── tsconfig.json
│
├── agents/                          # Python agents (registered in TradingAgenticChat)
│   ├── update_map.py
│   ├── map_predictions.py
│   ├── polymarket_sync.py           # NEW: scheduled market price sync
│   ├── config.py
│   ├── api_client.py                # HTTP client for event-graph API
│   ├── platform_client.py           # HTTP client for TradingAgenticChat API
│   ├── prompts/
│   └── requirements.txt
│
├── schemas/                         # Avro event schemas (NEW)
│   └── avro/
│       ├── prediction.map.updated.v1.avsc
│       ├── prediction.node.created.v1.avsc
│       ├── prediction.prob.changed.v1.avsc
│       └── prediction.alert.triggered.v1.avsc
│
├── data/                            # Seed data (moved from radiant/data/)
│   ├── maps/
│   └── registry.json
│
├── demo/                            # Demo app
├── docker-compose.yml               # PostgreSQL (prediction DB only)
├── .env.example
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

**Key differences from v1:**
- No Redis (platform handles pub/sub infrastructure)
- Added `mcp-polymarket/` package
- Added `schemas/avro/` for event contracts
- Agents have `platform_client.py` alongside `api_client.py`
- No auth routes — JWT validation only

---

## 10. Refactoring Phases

### Phase 0 — Preparation (1-2 days)

**Goal:** Monorepo setup, nothing breaks.

- [ ] Install pnpm, create `pnpm-workspace.yaml`
- [ ] Create `packages/ui/` — move current `src/`, adjust paths
- [ ] Create `packages/shared/` — extract types
- [ ] Create `packages/api/` scaffold (empty Hono server)
- [ ] Move `radiant/agents/` → `agents/`
- [ ] Move `radiant/data/` → `data/`
- [ ] Add `turbo.json`
- [ ] Verify: `pnpm build` passes, `pnpm test` passes 72 tests
- [ ] Create `.env.example`

### Phase 1 — Database + API (3-4 days)

**Goal:** PostgreSQL running with prediction schema, Hono serving data.

- [ ] `docker-compose.yml` (PostgreSQL 16 only, no Redis)
- [ ] Drizzle schema (`packages/api/src/db/schema.ts`) — prediction tables only
- [ ] Generate initial migration
- [ ] JSON → DB seed script
- [ ] Hono server with prediction CRUD routes
- [ ] JWT validation middleware (validates TradingAgenticChat tokens)
- [ ] Agent API key auth middleware
- [ ] Verify: demo loads data from PostgreSQL via new API

### Phase 2 — Agent Migration (2-3 days)

**Goal:** Python agents write to event-graph API, registered in TradingAgenticChat.

- [ ] Create `agents/api_client.py` (HTTP client for event-graph)
- [ ] Create `agents/platform_client.py` (HTTP client for TradingAgenticChat)
- [ ] Modify `update_map.py`: read via API, write via API, log run ref
- [ ] Modify `map_predictions.py`: same pattern
- [ ] Create `polymarket_sync.py`: fetch prices → write to prob_history
- [ ] Register agents as `agent_versions` in TradingAgenticChat
- [ ] Verify: agent run creates nodes in DB + agent_run_ref

### Phase 3 — Polymarket Integration (2-3 days)

**Goal:** Live market data flowing into prediction maps.

- [ ] `packages/api/src/lib/polymarket.ts` — REST client
- [ ] `packages/mcp-polymarket/` — MCP server with tools
- [ ] Polymarket price sync route: `POST /api/v1/maps/:id/sync-market`
- [ ] WebSocket price feed for real-time probability updates (optional)
- [ ] Verify: anchor nodes show live Polymarket prices

### Phase 4 — Harvester + Kafka Integration (2-3 days)

**Goal:** News data and cross-service events flowing.

- [ ] `packages/api/src/lib/harvester.ts` — legacy API client
- [ ] `packages/api/src/lib/kafka.ts` — Avro pub/sub
- [ ] Avro schemas for prediction events
- [ ] Consume `harvester.news.published.v1` → candidate events
- [ ] Consume `workspace.member.changed.v1` → refresh map_access
- [ ] Publish `prediction.map.updated.v1` on map changes
- [ ] Verify: news events appear as suggestions in map update agent

### Phase 5 — Real-Time + Polish (2-3 days)

**Goal:** Live updates, search, user engagement.

- [ ] SSE endpoint: `GET /api/v1/maps/:id/stream` (PG NOTIFY → SSE)
- [ ] Full-text search: `GET /api/v1/search?q=`
- [ ] Bookmark endpoints
- [ ] Alert endpoints + evaluation worker
- [ ] Frontend `useMapSubscription` hook
- [ ] Rate limiting middleware

### Phase 6 — Production Readiness (2-3 days)

**Goal:** Deploy, monitor, document.

- [ ] Health check endpoints (liveness + readiness)
- [ ] Prometheus metrics
- [ ] Error tracking (Sentry)
- [ ] API documentation (OpenAPI via Hono)
- [ ] Load testing (k6)
- [ ] Deployment config (Railway/Fly.io)
- [ ] Runbook for DB/agent failures

---

## 11. API Contract

### Public Endpoints (JWT auth)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/maps` | List maps (workspace-scoped) |
| `GET` | `/api/v1/maps/:id` | Full map (nodes + edges + slots) |
| `GET` | `/api/v1/maps/:id/predictions` | All anchors with latest prob |
| `GET` | `/api/v1/maps/:id/predictions/:nodeId/history` | Prob time-series |
| `GET` | `/api/v1/maps/:id/stream` | SSE real-time updates |
| `GET` | `/api/v1/search?q=` | Full-text search |
| `POST` | `/api/v1/bookmarks` | Bookmark node |
| `DELETE` | `/api/v1/bookmarks/:id` | Remove bookmark |
| `POST` | `/api/v1/alerts` | Create alert |
| `PATCH` | `/api/v1/alerts/:id` | Update alert |

### Agent Endpoints (API key auth)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/maps/:id/nodes` | Create node |
| `POST` | `/api/v1/maps/:id/nodes/batch` | Bulk upsert |
| `PATCH` | `/api/v1/maps/:id/nodes/:nodeId` | Update node |
| `DELETE` | `/api/v1/maps/:id/nodes/:nodeId` | Delete node |
| `POST` | `/api/v1/maps/:id/prob` | Record probability reading |
| `POST` | `/api/v1/maps/:id/sync-market` | Trigger Polymarket sync |
| `POST` | `/api/v1/agent-run-refs` | Log agent run reference |
| `PATCH` | `/api/v1/agent-run-refs/:id` | Complete/fail agent run ref |

### Admin Endpoints (admin role in JWT)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/maps` | Create map |
| `PATCH` | `/api/v1/maps/:id` | Update map metadata |
| `DELETE` | `/api/v1/maps/:id` | Archive map |
| `GET` | `/api/v1/agent-run-refs` | List agent run refs |

### Platform-to-Service Endpoints (service token)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/internal/maps` | List maps (no workspace filter) |
| `GET` | `/api/v1/internal/maps/:id/summary` | Map summary for chat widget |
| `POST` | `/api/v1/internal/map-access` | Push ACL update from platform |

---

## 12. Agent Strategy: Delegation, Not Duplication

### Agent Registration in TradingAgenticChat

```python
# Registered as agent_versions in TradingAgenticChat:

{
  "agent_id": "radiant-update-map",
  "version": "1.0.0",
  "type": "prediction",
  "description": "Discovers new events for prediction maps using Claude + web search",
  "runtime": "python",
  "schedule": "0 6,18 * * *",  # 2x daily
  "config": {
    "target_service": "event-graph",
    "model": "claude-sonnet-4-6",
    "tools": ["web_search", "mcp-polymarket"]
  }
}

{
  "agent_id": "radiant-map-predictions",
  "version": "1.0.0",
  "type": "prediction",
  "description": "Maps prediction anchors to causal event chains",
  "runtime": "python",
  "schedule": "0 7,19 * * *",  # 2x daily, 1h after update
  "config": {
    "target_service": "event-graph",
    "model": "claude-sonnet-4-6",
    "tools": ["mcp-polymarket"]
  }
}

{
  "agent_id": "radiant-polymarket-sync",
  "version": "1.0.0",
  "type": "data-sync",
  "description": "Syncs Polymarket prices to probability history",
  "runtime": "python",
  "schedule": "*/30 * * * *",  # every 30 min
  "config": {
    "target_service": "event-graph",
    "source": "polymarket-clob-api"
  }
}
```

### Agent Code Changes

```python
# agents/update_map.py (v2)

from api_client import EventGraphApiClient
from platform_client import PlatformClient

eg_client = EventGraphApiClient(
    base_url=os.environ["EVENT_GRAPH_API_URL"],
    api_key=os.environ["EVENT_GRAPH_API_KEY"],
)
platform = PlatformClient(
    base_url=os.environ["PLATFORM_API_URL"],
    api_key=os.environ["PLATFORM_AGENT_API_KEY"],
)

def update_map(map_id: str):
    # 1. Start run in platform (tracking, billing, audit)
    run = platform.start_agent_run(
        agent_id="radiant-update-map",
        map_id=map_id,
        model=MODEL,
    )

    # 2. Read current state from event-graph
    current = eg_client.get_map(map_id)

    # 3. Log run ref in event-graph
    ref = eg_client.start_run_ref(map_id, platform_run_id=run["id"], agent_type="update_map")

    try:
        # 4. Call Claude (same logic as before)
        response = call_claude_with_web_search(current)
        new_nodes = parse_response(response)

        # 5. Write to event-graph
        eg_client.create_nodes_batch(map_id, new_nodes)

        # 6. Complete both refs
        eg_client.complete_run_ref(ref["id"], nodes_added=len(new_nodes), summary=response.summary)
        platform.complete_agent_run(run["id"], summary=response.summary, stats={
            "nodes_added": len(new_nodes),
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
        })

    except Exception as e:
        eg_client.fail_run_ref(ref["id"], error=str(e))
        platform.fail_agent_run(run["id"], error=str(e))
        raise
```

---

## 13. Frontend Client Changes

### `packages/ui/src/api/client.ts` — Updates

1. **Auth: accept token from host app** (TradingAgenticChat provides it)
   ```typescript
   const client = new EventGraphApiClient({
     baseUrl: '/api/v1',
     token: authContext.accessToken, // from TradingAgenticChat
   });
   ```

2. **New: SSE subscription**
   ```typescript
   subscribeToMap(mapId: string, onUpdate: (event: MapChangeEvent) => void): () => void
   ```

3. **New: Polymarket data methods**
   ```typescript
   getMarketPrice(slug: string): Promise<{ price: number; volume: string }>
   ```

### No auth UI in event-graph

Auth flows (login, register, OAuth) are handled by TradingAgenticChat's frontend.
event-graph receives the JWT via:
- `Authorization: Bearer <token>` header (when standalone)
- Shared auth context (when embedded in TradingAgenticChat UI)

---

## 14. Testing Strategy

| Layer | Framework | What |
|-------|-----------|------|
| DB schema | vitest + pg | Seed → query → verify round-trip |
| API routes | vitest + Hono test client | Each endpoint: happy + error + auth |
| JWT validation | vitest | Mock JWKS, test valid/expired/wrong-issuer |
| Polymarket client | vitest | Mock REST, verify price parsing |
| MCP server | vitest | Tool call → response verification |
| Kafka events | vitest | Publish → consume → verify Avro schema |
| Agent HTTP client | pytest | Mock API → verify requests |
| Frontend (existing) | vitest | Keep all 72 passing |

---

## 15. Infrastructure & Deployment

### Development
```bash
docker compose up -d          # PostgreSQL only
pnpm --filter api db:migrate
pnpm --filter api db:seed
pnpm dev                      # API (3001) + demo (5173) + MCP server
```

### Environment Variables
```bash
# .env.example

# event-graph database (own DB)
DATABASE_URL=postgresql://radiant:radiant_dev@localhost:5432/radiant_prediction

# Platform integration
PLATFORM_API_URL=http://localhost:8000          # TradingAgenticChat
PLATFORM_JWKS_URL=http://localhost:8000/.well-known/jwks.json
PLATFORM_SERVICE_TOKEN=                          # for internal API calls

# Agent auth
AGENT_API_KEYS=key1,key2                         # comma-separated valid keys

# Polymarket
POLYMARKET_API_URL=https://clob.polymarket.com
POLYMARKET_WS_URL=wss://ws-subscriptions-clob.polymarket.com

# Kafka (Avro events)
KAFKA_BROKERS=localhost:9092
SCHEMA_REGISTRY_URL=http://localhost:8081

# Legacy harvester
HARVESTER_API_URL=http://harvester.internal:8080

# Claude (for agents — but runs are tracked in platform)
ANTHROPIC_API_KEY=
```

### Production
- **Database:** Neon PostgreSQL (serverless, separate from TradingAgenticChat's DB)
- **API:** Railway or Fly.io (auto-deploy from GitHub)
- **MCP Server:** Runs as sidecar or separate process
- **Agents:** Scheduled by TradingAgenticChat's agent runtime (not cron)

---

## 16. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| TradingAgenticChat JWT format changes | Medium | High | Pin JWT schema version in shared contract |
| Kafka not available in dev | High | Medium | Fallback to direct HTTP calls; Kafka is P2 |
| Platform agent runtime not ready for prediction agents | Medium | High | Keep standalone cron as fallback (GitHub Actions) |
| Polymarket API rate limits | Medium | Medium | Cache prices locally, respect rate limits |
| map_access cache goes stale | Low | Medium | 1h TTL + Kafka refresh + fallback to API call |
| Two databases means operational complexity | Medium | Medium | Same PG engine, same tooling, separate logical DBs |
| News harvester API unstable | Medium | Low | Agent works without harvester (uses Claude web search) |

---

## 17. Decision Log

| Date | Decision | Alternatives | Reason |
|------|----------|-------------|--------|
| 2026-03-13 | **Domain service, not platform** | Build everything standalone | TradingAgenticChat already has auth, agents, billing — duplicating = months of waste |
| 2026-03-13 | **Validate JWTs, don't issue them** | Own auth system | Identity authority is TradingAgenticChat |
| 2026-03-13 | **agent_run_refs not agent_runs** | Full audit table | Cost/LLM tracking belongs in platform's billing_ledger |
| 2026-03-13 | **Separate database** | Shared DB with platform | Decoupled deployments, no migration conflicts |
| 2026-03-13 | **Hono (TypeScript)** | FastAPI (Python), Express | Same language as React library = shared types, single toolchain |
| 2026-03-13 | **Drizzle ORM** | Alembic, Prisma | Lightest TS ORM, direct type inference, no codegen |
| 2026-03-13 | **Polymarket: REST + MCP** | REST only | MCP enables agent tool access to market data |
| 2026-03-13 | **Keep Python agents** | Rewrite in TS | Working code; they call our API over HTTP anyway |
| 2026-03-13 | **Register agents in platform** | Independent agent runner | TradingAgenticChat has agent_versions/runs/billing; don't rebuild |
| 2026-03-13 | **Kafka/Avro for cross-service** | Direct API calls only | Platform already has Avro governance + Spark/Iceberg pipeline |
| 2026-03-13 | **No Redis** | Redis for cache/pubsub | PG NOTIFY + in-memory cache sufficient for our scale |
| 2026-03-13 | **`map_access` cache table** | Call platform API on every request | Latency; cache with TTL + event refresh is practical |

---

## Appendix A: Quick Start After Refactor

```bash
# Clone & setup
git clone ... && cd event-graph
cp .env.example .env
pnpm install

# Database
docker compose up -d
pnpm --filter @ratexai/prediction-api db:push
pnpm --filter @ratexai/prediction-api db:seed

# Development
pnpm dev   # API (3001) + demo (5173)

# Agents (requires TradingAgenticChat running for auth)
cd agents
pip install -r requirements.txt
python update_map.py iran-war-2026
python polymarket_sync.py --all

# Tests
pnpm test
```

## Appendix B: Migration from v1 Plan

If you started implementing v1 (standalone with full user/agent tables):

1. Keep all prediction-domain tables unchanged (maps, nodes, edges, etc.)
2. Drop `users` table → replace with `user_id TEXT` references
3. Drop `user_map_access` → replace with `map_access` cache
4. Drop `agent_runs` → replace with `agent_run_refs`
5. Replace auth middleware (own JWT issuance → platform JWT validation)
6. Add platform integration layer (`lib/platform.ts`, `lib/kafka.ts`)
