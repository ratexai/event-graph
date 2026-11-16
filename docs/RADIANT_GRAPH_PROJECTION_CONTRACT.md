# RADIANT Graph Projection Contract

Status: **CONTRACT RC — TESTNET ONLY**

Runtime state: **NOT IMPLEMENTED**

Ownership freeze: `platform-api-contracts@e3afd68578817f280afd3329cc2de1c8ece8f10d`

## 1. Decision boundary

RADIANT owns Event and EventRevision truth. Graph Updater is the sole writer of
RADIANT projections into the shared Neo4j database, using an approved,
versioned outbox contract.

Neo4j is a rebuildable read projection. It is not the immutable Event ledger.
RADIANT, Serving, BFF, frontend code, and agents must not write RADIANT graph
nodes or relationships directly.

## 2. Existing graph semantics that must be preserved

The current Graph Updater already has two separate ingestion lanes:

- the Harvester HTTP graph-update path for social/intelligence graph writes;
- a default-off LavinMQ computation-event consumer for algorithm results and
  edge candidates.

Its `:GraphEvent` label is an idempotency and processing receipt with fields
such as `idempotency_key`, `event_id`, `event_type`, `quality`, attempts, and
completion timestamps. It is not a RADIANT real-world Event and must never be
queried or relabeled as one.

Evidence:

- `harvester-graph-updater/docs/graph_events.md:1-33@snapshot:276c34f8d3c507fe76eecac057c4e2edbe96971f6109894dafdf708df50ae547`
- `harvester-graph-updater/graph_updater/graph_events/computed_cypher.py:95-187@snapshot:276c34f8d3c507fe76eecac057c4e2edbe96971f6109894dafdf708df50ae547`
- `harvester-graph-updater/graph_updater/graph_events/models.py:17-56,155-223@snapshot:276c34f8d3c507fe76eecac057c4e2edbe96971f6109894dafdf708df50ae547`

The ownership and mutation path are frozen in
`platform-api-contracts/GRAPH_ONTOLOGY_OWNERSHIP_MATRIX.md:15-35@e3afd68578817f280afd3329cc2de1c8ece8f10d`.

## 3. Proposed outbox message shapes

The RADIANT transactional-outbox → approved graph mutation envelope → Graph
Updater path is accepted by the shared ownership freeze. The following event
type names and payload shapes remain `CONTRACT_ONLY` until they are registered
and implemented by both producer and consumer:

| Event type | Purpose | Canonical producer | Consumer |
|---|---|---|---|
| `radiant.event_revision.published.v1` | Append or refresh an Event revision projection. | RADIANT authoritative store outbox | Graph Updater |
| `radiant.event_relation.upserted.v1` | Project a typed Event-to-Event relation assertion. | RADIANT authoritative store outbox | Graph Updater |
| `radiant.event.retracted.v1` | Mark current Event projection retracted without deleting history. | RADIANT authoritative store outbox | Graph Updater |
| `radiant.prediction.updated.v1` | Project a versioned forecast view where approved. | RADIANT authoritative store outbox | Graph Updater |
| `radiant.resolution.published.v1` | Project an evidence-bound resolution. | RADIANT authoritative store outbox | Graph Updater |

Required envelope fields:

```text
event_id             unique delivery-event ID, not the domain Event ID
event_type           one allowlisted type above
event_version        v1
schema_subject       accepted Schema Registry subject
idempotency_key      stable per semantic projection operation
occurred_at          authoritative transaction time
published_at         outbox publication time
trace_id             end-to-end trace identity
producer             RADIANT producer identity
quality              preview for the Wave 1/Testnet lane
payload              schema-validated domain projection payload
```

The exact broker, topic, routing key, schema subject, retry topology, and DLQ
names remain `UNKNOWN`. The ownership freeze does not imply runtime or transport
readiness.

## 4. Projection identity and idempotency

- `event_id` is the canonical RADIANT Event key.
- `revision_id` uniquely identifies a projected EventRevision.
- `relation_id`, `prediction_id`, and `resolution_id` are stable domain IDs.
- `idempotency_key` identifies one projection operation and is stored in the
  existing processing-receipt mechanism or an approved equivalent.
- A completed replay performs no additional semantic writes.
- An incomplete replay may safely repeat the full transaction.
- Projection order must not let an older revision replace a newer current
  pointer.
- Missing shared endpoints route to a declared retry/DLQ policy; Graph Updater
  must not create orphan shared entities to make a message pass.

## 5. Frozen logical graph model

The shared ownership freeze fixes the following semantic projection boundary.
Physical labels, property mapping, constraints, indexes, and revision storage
representation remain `UNKNOWN` until accepted as Graph Updater implementation
contracts.

### Nodes

| Logical type | Canonical owner | Projected key | Notes |
|---|---|---|---|
| `Event` | RADIANT | `event_id` | Current searchable projection only. |
| `Scenario` | RADIANT | `scenario_id` | Preview until methodology is accepted. |
| `Prediction` | RADIANT | `prediction_id` | Requires method version and input cutoff. |
| `Resolution` | RADIANT | `resolution_id` | Requires evidence and resolver identity. |
| `Entity` | shared canonical owner | `entity_id` | MATCH-only from RADIANT projection lane. |
| `Narrative` | shared canonical owner | `narrative_id` or approved key | MATCH-only. Exact identity contract is `UNKNOWN`. |
| `Evidence` | Harvester | `evidence_id` | Reference projection only; Harvester remains authority. |

`EventRevision` remains an append-only RADIANT authoritative record. The
ownership freeze does not make it a Neo4j authority or require a physical
`EventRevision` node. A current Event projection may carry revision metadata;
historical revision reads must come from the RADIANT authority or an approved
revision read model.

### Relationships

| Frozen relationship | Direction | Domain owner | Constraint |
|---|---|---|---|
| `EVENT_RELATES_TO_EVENT` | Event → Event | RADIANT | Carries stable `relation_id`, bounded `relation_type`, valid time, epistemic status, evidence references, and assertion revision. `FOLLOWS` is acyclic; association is not causal proof. |
| `EVENT_EVIDENCED_BY` | Event → Evidence | RADIANT binding; Harvester owns Evidence | Carries `evidence_ref_id`, relation type, and assertion revision; the Evidence endpoint must exist or be resolvable. |
| `EVENT_INVOLVES_ENTITY` | Event → Entity | RADIANT binding; shared owner owns Entity | MATCH-only canonical Entity identity. |
| `EVENT_CONTEXTUALIZED_BY_NARRATIVE` | Event → Narrative | RADIANT binding; shared owner owns Narrative | MATCH-only canonical Narrative identity. |

Scenario, Prediction, and Resolution are RADIANT-owned types, but their exact
Neo4j relationship names remain `UNKNOWN`; this RC must not invent additional
shared relationship names.

`GraphEvent`, `GraphAlgorithmRun`, `GraphMetric`, and `GraphEdgeBatch` remain
operational graph-processing types and are outside this ontology.

## 6. Projection payload minimum

`radiant.event_revision.published.v1` must include:

- `event_id`, `revision_id`, `revision_number`, and
  `supersedes_revision_id`;
- current lifecycle and epistemic status;
- valid-time fields and `observed_at`;
- `event_type`, title, and bounded summary;
- stable evidence, entity, and narrative IDs;
- `schema_version`, `method_version`, `content_digest`, and quality envelope;
- `projection_version` and `source_owner`.

The payload must not embed raw source documents or provider secrets.

## 7. Write transaction rules

For each accepted message, Graph Updater must atomically:

1. reserve an idempotency receipt;
2. validate event version, schema subject, quality lane, and payload;
3. upsert the keyed current projection without mutating or impersonating the
   authoritative revision history;
4. resolve shared endpoints through canonical identities;
5. apply relationship assertions with provenance and valid time;
6. advance projected revision metadata only when the revision is newer;
7. mark the processing receipt complete;
8. acknowledge the delivery only after the Neo4j transaction succeeds.

Partial edge failures must be explicit and observable. They must not silently
produce a successful complete graph.

## 8. Rebuild and reconciliation

- The authoritative RADIANT store plus outbox history must be sufficient to
  rebuild the Neo4j projection.
- Rebuild runs use a named `projection_version` and isolated checkpoint.
- Cutover requires count, ID, revision-pointer, relation, and evidence-link
  parity checks.
- Serving continues to read the previous accepted projection until rebuild
  validation passes.
- Rollback selects the previous projection/checkpoint; it never rewrites the
  authoritative Event ledger.

## 9. Read boundary

- Serving or a bounded RADIANT read adapter owns canonical synchronous reads.
- BFF may compose authenticated page DTOs but must not query Neo4j directly.
- Frontend code must not query Neo4j, Milvus, OpenSearch, or Harvester storage.
- Public graph reads are bounded by root, depth, as-of time, authorization, and
  deterministic pagination/size limits.

## 10. Acceptance gates

- Frozen semantic ownership and relationship names remain unchanged.
- Shared governance accepts physical labels, property mapping, outbox subjects,
  schemas, and transport topology.
- Graph Updater allowlists and validates all RADIANT message types.
- Duplicate, out-of-order, retry, DLQ, and partial-failure tests pass.
- `FOLLOWS` cycle detection and time-order tests pass.
- Rebuild-from-authority and parity tests pass.
- No direct Neo4j writer exists outside Graph Updater.
- Serving/read adapter exposes provenance, quality, revision, and as-of fields.
- Exact-SHA Testnet smoke proves Event → Evidence → temporal relation → graph
  read.
