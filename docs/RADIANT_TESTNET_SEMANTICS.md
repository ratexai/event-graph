# RADIANT Testnet Semantics

Status: **CONTRACT RC — TESTNET ONLY**

Deployment state: **NOT IMPLEMENTED**

Ownership freeze: `platform-api-contracts@e3afd68578817f280afd3329cc2de1c8ece8f10d`

## 1. Purpose

RADIANT Testnet is the first bounded runtime lane for validating canonical
Events, evidence bindings, temporal relations, graph projections, scenarios,
and predictions. It may contain real-world source material and experimental
outputs, but it must never imply production or Mainnet quality.

## 2. Mandatory response labels

Every Testnet response and exported artifact must identify:

- `environment: "testnet"`;
- `lifecycle: "preview"`;
- `as_of` timestamp;
- schema and projection versions;
- quality status;
- provenance completeness;
- methodology status for inferred relations and predictions.

Allowed capability states:

- `PREVIEW`
- `DEGRADED`
- `UNAVAILABLE`
- `INSUFFICIENT_DATA`

`LIVE`, `PRODUCTION`, `VERIFIED`, and `MAINNET` are forbidden unless their
specific evidence gates have been accepted outside this RC.

## 3. Truth presentation

- A canonical Event is a real-world occurrence, not an article or map node.
- Evidence and claims remain distinguishable from the Event they support.
- `observed` may be shown as an observed occurrence only with evidence.
- `associated`, `correlated`, `inferred`, `hypothesized`, and
  `causal_candidate` must be visibly labeled.
- `CAUSAL_CANDIDATE` must never be displayed as proven causation.
- Missing or unknown values remain null or `INSUFFICIENT_DATA`.
- A proxy value must display `PROXY`; Testnet must not relabel it as a direct
  measurement.
- Retractions and corrections append revisions and preserve prior history.

## 4. Candidate generation

The existing Anthropic scripts and JSON maps are prototype inputs only.

Model-generated material may enter Testnet through this sequence:

```text
model output
→ schema-valid candidate
→ source/evidence resolution
→ duplicate and identity review
→ epistemic and quality classification
→ accepted EventRevision transaction
→ transactional outbox
→ Graph Updater projection
→ Serving/read-adapter response
```

Direct JSON overwrite, scheduled repository commits, or successful prompt
parsing do not publish canonical Event truth.

## 5. Prediction semantics

A Testnet Prediction must expose:

- stable `prediction_id` and revision;
- subject or target Scenario;
- probability in the inclusive range 0–1;
- nullable confidence;
- forecast horizon and resolution deadline;
- `input_as_of` cutoff;
- `method_version`;
- supporting and contradicting evidence;
- assumptions and known limitations;
- preview quality state.

The current prototype `rateXProb`, `alpha`, `rateXReasoning`, factor arrays, and
YES/NO nodes remain `PROTOTYPE_FIXTURE` until a reproducible method, producer,
evaluation set, and resolution workflow are accepted.

## 6. Resolution semantics

A Testnet Resolution requires:

- stable `resolution_id`;
- resolved Prediction, Scenario, or market-binding ID;
- explicit resolution criteria and outcome;
- evidence references;
- authoritative resolver identity or declared provider;
- resolved-at and observed-at timestamps;
- method/schema version;
- dispute or correction state.

An expired market, a frontend outcome label, or a narrative signal does not by
itself prove a Resolution.

## 7. API and access

- All target RADIANT reads require bearer authorization with `radiant:read`.
- Exact token issuer, tenant isolation, and entitlement mapping remain
  `UNKNOWN` pending Core integration.
- Authentication is default-deny.
- Testnet CORS uses an explicit allowlist; wildcard origins, methods, or headers
  are not accepted.
- Graph reads require a root, maximum depth, as-of time, and result-size limit.
- Direct frontend access to Neo4j, Milvus, OpenSearch, Harvester databases, or
  RADIANT persistence is forbidden.

## 8. Compatibility behavior

`/api/v1/maps`, JSON map files, and the `/event-flow/*`, `/kol-flow/*`, and
`/narrative-flow/*` client are `PROTOTYPE_COMPATIBILITY`.

If temporarily exposed alongside Testnet:

- they use a separate route namespace and lifecycle label;
- map/node IDs are not treated as canonical Event IDs;
- no silent fallback maps canonical endpoints to prototype JSON;
- responses include deprecation and successor metadata;
- retirement requires known consumers, parity evidence, telemetry, and a
  sunset decision.

## 9. Dependency degradation

| Dependency | Required behavior when unavailable |
|---|---|
| RADIANT authoritative store | Event reads unavailable; do not serve Neo4j as authority. |
| Graph projection | Event detail may remain available from authority; graph endpoints return explicit degraded/unavailable state. |
| Harvester evidence/story reads | Preserve stored stable bindings; mark enrichment freshness and provenance gaps. |
| Milvus | Semantic discovery unavailable; do not substitute keyword results without labeling the fallback. |
| Serving/read adapter | Public reads unavailable; do not expose storage directly. |
| Core identity/entitlements | Default-deny. |
| Prediction provider/method | Predictions unavailable; Events remain independently readable. |

## 10. Minimum Testnet dataset

The acceptance dataset must include:

- one Event with two evidence references from different sources;
- one Event with at least two immutable revisions;
- one explicit correction or retraction;
- three or more Events with branching temporal relations;
- one bounded `PRECEDES` DAG and one non-acyclic associative relation;
- canonical Entity and Narrative links resolved through shared IDs;
- one Scenario and one Prediction with methodology labeled preview;
- one Resolution fixture with evidence;
- unknown time, insufficient data, missing enrichment, duplicate delivery, and
  out-of-order delivery cases.

No existing prototype map is automatically accepted as this dataset.

## 11. Testnet release gates

### Contract

- Event, EventRevision, EvidenceRef, EventRelation, Prediction, Scenario, and
  Resolution schemas validate.
- Public OpenAPI and runtime-generated OpenAPI match.
- Frozen RADIANT/Graph Updater ownership and the four shared Event relationship
  names are preserved.
- Physical projection mapping and registered event subjects are approved.

### Security

- Default-deny authentication and scope enforcement pass.
- CORS allowlist, rate limiting, payload limits, and audit logging pass.
- Secrets are injected, never stored in JSON or repository files.

### Data and graph

- Revision replay, concurrency, out-of-order, and retraction tests pass.
- Graph projection is idempotent and rebuildable.
- `PRECEDES` cycle and temporal consistency checks pass.
- Provenance and quality survive every hop.

### Integration

- RADIANT authority → outbox → Graph Updater → Serving/read adapter → API is
  proven with real Testnet data.
- Harvester Entity, Narrative, Evidence, Claim, Story, and Milvus reuse is
  proven without duplicate pipelines.
- BFF, if used, performs composition only.

### Operations

- Dependency-aware readiness, traces, metrics, DLQ, replay, backup, and rollback
  evidence exist on the exact candidate commit.
- An immutable artifact and deployment manifest identify the same commit.

## 12. Mainnet boundary

This document does not define Mainnet readiness. Mainnet additionally requires
approved methodology, immutable published revisions, security review,
reproducibility, operational SLOs, retention/compliance policy, rollback, and
accepted real-data evidence. All of those remain outside Wave 1.
