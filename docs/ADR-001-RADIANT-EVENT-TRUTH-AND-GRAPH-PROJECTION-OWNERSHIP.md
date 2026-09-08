# ADR-001: RADIANT Event Truth and Graph Projection Ownership

Status: **ACCEPTED FOR CONTRACT RC; RUNTIME APPROVAL PENDING**

Date: 2026-09-08

Scope: RADIANT Testnet contract foundation

Freeze basis: `platform-api-contracts@e3afd68578817f280afd3329cc2de1c8ece8f10d`

## Context

The current prototype stores narrative maps as mutable JSON and serves them
directly. Shared infrastructure already provides Harvester-owned stories,
evidence/provenance, a calendar-event revision primitive, Milvus embeddings,
Serving reads, and a Neo4j Graph Updater.

The shared graph also contains `:GraphEvent`, but that label is an idempotency
receipt for computation messages rather than a real-world occurrence.

Without an ownership decision, RADIANT could accidentally create a second
source of evidence, write directly to Neo4j, confuse processing events with
world Events, or treat a derived graph as immutable truth.

## Decision

1. RADIANT owns canonical `Event`, `EventRevision`, `EventRelation`, `Scenario`,
   `Prediction`, and `Resolution` domain truth.
2. Event persistence is append-only at the revision level. The physical store
   and service repository remain `UNKNOWN` until implementation ownership is
   assigned.
3. Each accepted EventRevision and relation mutation is committed atomically
   with a versioned transactional outbox record.
4. Graph Updater is the sole writer of RADIANT nodes and relations into the
   shared Neo4j database.
5. Neo4j is a rebuildable projection, not the immutable Event authority.
6. `:GraphEvent` remains a processing/idempotency receipt and must not represent
   RADIANT Event truth.
7. RADIANT owns `EvidenceRef` bindings. Harvester retains ownership of the
   referenced sources, Evidence, Claims, Stories, story provenance, and
   embedding generation.
8. Shared Entity and Narrative identities are referenced through canonical
   contracts and are not recreated by RADIANT.
9. Serving or an approved bounded RADIANT read adapter exposes synchronous
   reads. BFF composes; frontend renders. Neither writes graph truth.
10. The frozen shared graph relationship names are
    `EVENT_RELATES_TO_EVENT`, `EVENT_EVIDENCED_BY`,
    `EVENT_INVOLVES_ENTITY`, and `EVENT_CONTEXTUALIZED_BY_NARRATIVE`.
    Fine-grained RADIANT relation semantics are properties of the frozen
    relationship classes, not independently invented shared edge names.
11. Physical Neo4j labels, property mappings, outbox subjects and payloads,
    transport topology, and unregistered API operations remain contract-only
    until accepted in shared governance.

## Consequences

### Positive

- Immutable Event history can be reproduced independently of Neo4j.
- Graph projection can be rebuilt, versioned, validated, and rolled back.
- One writer owns Neo4j mutation semantics.
- Existing Harvester, Milvus, Serving, and graph infrastructure can be reused.
- The `GraphEvent` naming collision is explicitly contained.

### Costs

- RADIANT requires an authoritative persistence and outbox implementation.
- Graph Updater requires new schema-validated projection handlers.
- Shared Entity, Narrative, Evidence, and Claim endpoint contracts must be
  honored before integration.
- Serving/read-adapter work is required before public API delivery.

### Risks

- Out-of-order revisions could regress the current projection unless guarded.
- Missing canonical shared endpoints could create orphan graph nodes unless
  projection uses MATCH-only resolution.
- A projection backlog may make graph responses stale; freshness must be
  visible.
- Prototype JSON may be mistaken for canonical truth unless compatibility is
  explicitly labeled.

## Rejected alternatives

### Neo4j as the authoritative Event store

Rejected because immutable revision history, transactional domain changes, and
rebuild/rollback boundaries would be coupled to a derived graph projection.

### Direct RADIANT writes to Neo4j

Rejected because it creates a second graph writer and bypasses Graph Updater
idempotency, validation, retry, DLQ, and ontology controls.

### Treat Harvester Story as RADIANT Event

Rejected because a Story clusters documents while an Event canonicalizes a
real-world occurrence. The cardinality is not one-to-one.

### Treat `:GraphEvent` as RADIANT Event

Rejected because current `:GraphEvent` records message-processing state and is
subject to operational retention.

### Continue JSON files as authority

Rejected because mutable files and automated commits do not provide governed
identity, immutable revisions, evidence integrity, concurrency control, or
transactional projection publication.

## Required follow-up decisions

- Assign the RADIANT authoritative-store repository and runtime owner.
- Approve physical persistence technology.
- Approve shared outbox subjects, transport, Schema Registry records, retry,
  DLQ, and retention.
- Approve physical graph labels, property mappings, constraints, indexes, and
  canonical Narrative identity; do not rename the four frozen semantic edges.
- Approve Serving versus dedicated RADIANT read-adapter placement.
- Approve Core token issuer, tenant, and entitlement semantics.
- Approve prediction and causal-inference methodologies.

## Compliance checks

- No RADIANT runtime code may write Neo4j directly.
- No RADIANT projection may use `:GraphEvent` as a world Event.
- Every published Testnet EventRevision has stable evidence bindings.
- Projection state is reproducible from authoritative revisions and outbox
  history.
- All public reads preserve revision, provenance, freshness, quality, and as-of
  semantics.
