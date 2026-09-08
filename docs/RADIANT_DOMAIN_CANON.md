# RADIANT Domain Canon

Status: **CONTRACT RC — TESTNET ONLY**

Runtime state: **NOT IMPLEMENTED**

Baseline: `event-graph@e1401895f97f2c10e06fa44970329fd0f893276c`

Ownership freeze: `platform-api-contracts@e3afd68578817f280afd3329cc2de1c8ece8f10d`

## 1. Purpose

RADIANT is the RateXAI API-first World Graph product.

Its domain is:

`Events → Context → History → Relationships → Scenarios → Predictions`

RADIANT answers:

> What happened, what led to it, what changed, what is connected, and what may happen next?

This document freezes the Wave 1 domain boundary. It does not claim that the
runtime, Testnet, deployment, or public API exists.

## 2. Current evidence

| Evidence | Proven state |
|---|---|
| `radiant/api/server.py:15-78@e1401895f97f2c10e06fa44970329fd0f893276c` | Prototype FastAPI reads JSON maps and exposes `/api/v1/maps`, `/api/v1/maps/{map_id}`, `/api/v1/search`, and `/health`. |
| `src/types/index.ts:58-116,188-429@e1401895f97f2c10e06fa44970329fd0f893276c` | Frontend-only event, narrative, scenario, and prediction display shapes exist. |
| `radiant/agents/update_map.py:175-245@e1401895f97f2c10e06fa44970329fd0f893276c` | The prototype mutates JSON files from model output; it is not an immutable event ledger. |
| `Harvester/harvester/models/intelligence.py:280-480@snapshot:a86116b821ca5088aa6ff40a334c76b578ad607c608834ef7b74e20b9d40568b` | Harvester owns canonical stories and immutable story-to-source provenance. |
| `Harvester/harvester/models/intelligence.py:483-614@snapshot:a86116b821ca5088aa6ff40a334c76b578ad607c608834ef7b74e20b9d40568b` | Harvester contains an immutable, evidence-bearing calendar-event revision primitive. It is not the RADIANT Event domain. |
| `Harvester/harvester/intelligence/vector_store.py:14-127@snapshot:a86116b821ca5088aa6ff40a334c76b578ad607c608834ef7b74e20b9d40568b` | A reusable Milvus story-cluster index exists. |
| `harvester-graph-updater/graph_updater/graph_events/computed_cypher.py:95-187@snapshot:276c34f8d3c507fe76eecac057c4e2edbe96971f6109894dafdf708df50ae547` | `:GraphEvent` is a computation-message idempotency receipt, not a real-world Event. |
| `serving-layer/README.md:16-19,37@snapshot:9fb78658694982c2227bf13aed78e0aeb43dd9427635debcb206b552bc05425b` | Serving already reads canonical stories, calendar revisions, Milvus, and the shared Neo4j graph. |
| `platform-api-contracts/PRODUCT_TRACK_OWNERSHIP_MATRIX.md:19,29-30@e3afd68578817f280afd3329cc2de1c8ece8f10d` | The shared ownership freeze assigns RADIANT Event revision truth and the temporal products, makes Graph Updater the sole Neo4j projector, and declares Neo4j non-authoritative. |
| `platform-api-contracts/GRAPH_ONTOLOGY_OWNERSHIP_MATRIX.md:15-35@e3afd68578817f280afd3329cc2de1c8ece8f10d` | The shared ontology freezes RADIANT ownership and the RADIANT outbox-to-Graph-Updater mutation path. |

## 3. Canonical aggregate boundary

RADIANT owns canonical truth for these domain records:

- `Event`
- `EventRevision`
- `EventRelation`
- `EvidenceRef` bindings
- `Scenario`
- `Prediction`
- `Resolution`
- RADIANT timeline and World Event Ledger projections
- bindings from those records to shared evidence, entities, narratives,
  countries, regions, and prediction markets

RADIANT does not own:

- raw collection or source identity;
- Harvester `Story`, `IntelligenceItem`, `Evidence`, `Claim`, or source
  provenance;
- canonical shared `Entity` or `Narrative` identity;
- Milvus collection ownership or embedding generation;
- the shared Neo4j database;
- graph algorithm execution;
- authentication, identity, or entitlements;
- BFF page composition;
- external model-provider routing.

## 4. Domain semantics

### 4.1 Event

An Event is a stable identity for one real-world occurrence.

An Event is not:

- a story, article, post, map node, claim, or source document;
- an ingestion message or `:GraphEvent` receipt;
- a prediction or scenario;
- a mutable JSON object.

A story or article may be evidence for an Event. Multiple stories may support
one Event, and one story may supply evidence for more than one Event.

### 4.2 EventRevision

An EventRevision is an immutable, ordered statement of Event truth as known at
an observation time. A material semantic change creates a new revision. A
replay of identical semantic content does not.

The authoritative history is append-only. A latest-event view is a derived
projection and must never erase prior revisions.

### 4.3 EvidenceRef and Claim bindings

RADIANT owns `EvidenceRef`, the immutable binding from an EventRevision to a
stable evidence identity and its relation to that revision. Harvester remains
the canonical owner of the underlying `Evidence`, `Claim`, source, and source
provenance. RADIANT does not copy a source document and declare the copy
authoritative.

Every published Testnet EventRevision requires at least one evidence reference.
Evidence-free model output may be stored only as an unpromoted candidate.

### 4.4 EventRelation

An EventRelation is a typed, directed, time-aware relationship between two
Events. Relation assertion time and the valid-time interval are distinct.

Every Event-to-Event assertion projects through the frozen shared Neo4j
relationship name `EVENT_RELATES_TO_EVENT`. Its narrower RADIANT-owned
`relation_type` property is deliberately limited to:

- `PRECEDES`
- `CO_OCCURS_WITH`
- `ASSOCIATED_WITH`
- `CORRELATED_WITH`
- `CONTRADICTS`
- `CAUSAL_CANDIDATE`

`CAUSAL_CANDIDATE` is not proof of causation. No relation may be silently
upgraded to a stronger epistemic class.

World history is a temporal graph or DAG over bounded relation types. It is not
one global linked list. Cycles are forbidden only for relation types explicitly
declared acyclic, such as `PRECEDES`; associative relations may form cycles.

The other frozen shared semantic relationship names are
`EVENT_EVIDENCED_BY`, `EVENT_INVOLVES_ENTITY`, and
`EVENT_CONTEXTUALIZED_BY_NARRATIVE`. Physical labels, properties, constraints,
and indexes remain a Graph Updater implementation contract, not RADIANT-owned
database truth.

### 4.5 Scenario

A Scenario is a versioned conditional future state. It references Events,
claims, assumptions, conditions, and optional Predictions. It is never emitted
as an observed Event before its resolution criteria are satisfied.

### 4.6 Prediction

A Prediction is a versioned forecast with a probability, confidence where
available, time horizon, method version, input cutoff, supporting evidence,
contradicting evidence, and quality state.

The prototype `rateXProb`, `alpha`, and free-text reasoning fields are display
fixtures until an approved methodology and reproducible producer exist.

### 4.7 Resolution

A Resolution records the evaluated outcome of a Scenario, Prediction, or
prediction-market binding. It includes resolution criteria, evidence, observed
time, resolver identity, and method version. A frontend `signal: "resolution"`
or a YES/NO scenario label is not a Resolution record.

## 5. Identity and time invariants

- `event_id` is an opaque, stable RADIANT identifier. It is not derived from a
  title, URL, source, date, or mutable provider ID.
- `revision_id` identifies exactly one immutable revision.
- Revision numbers are positive, monotonically increasing per `event_id`, and
  unique within that Event.
- `observed_at` records when RADIANT accepted the revision input.
- Valid time describes when the occurrence happened or was believed to apply.
- Unknown time remains unknown. It is never replaced by ingestion time.
- Provider IDs are aliases, not canonical identity.
- Display names are not identity.
- `null` and `insufficient_data` are never converted to zero.

## 6. Truth and projection model

```text
Harvester evidence, stories, claims, entities, narratives
        ↓ stable IDs and accepted read contracts
RADIANT Event/EventRevision persistence + transactional outbox
        ↓ approved, versioned outbox events
Graph Updater — sole Neo4j projector
        ↓ derived graph projection
Serving / RADIANT read adapter
        ↓ authenticated API composition
Platform BFF / public API consumers
```

RADIANT persistence is authoritative for Event and EventRevision truth.
Neo4j is a rebuildable projection and is not the immutable authority.

## 7. Lifecycle

Wave 1 establishes contracts only.

Allowed lifecycle labels:

- `CONTRACT_ONLY`
- `CANDIDATE`
- `PREVIEW`
- `INSUFFICIENT_DATA`
- `UNAVAILABLE`

`LIVE`, `PRODUCTION`, and `MAINNET` are forbidden until runtime, security,
replay, deployment, readiness, trace, rollback, and real-data smoke evidence is
accepted on an exact commit.

## 8. Compatibility boundary

The existing `/api/v1/maps` JSON pipeline is `PROTOTYPE_COMPATIBILITY` only.
Its map IDs and node IDs are not canonical RADIANT Event IDs. Migration must be
explicit and may not infer canonical identity from those values.

The frontend `/event-flow/*`, `/kol-flow/*`, and `/narrative-flow/*` client
surface is also prototype-only and is not the RADIANT v1 public API.

## 9. Preserved UNKNOWN decisions

- Physical RADIANT Event store technology and service repository.
- Exact owner and contract for canonical shared country and region identity.
- Accepted event-type taxonomy.
- Accepted causal inference methodology.
- Accepted prediction methodology and model producer.
- Prediction-market provider and resolution authority.
- Tenant isolation and entitlement semantics beyond `radiant:read`.
- Retention and legal-compliance periods.
- Exact physical Neo4j labels, property mapping, constraints, and indexes.
- Exact registered outbox subjects, broker topology, retry, and DLQ names.
