# RADIANT OpenAPI v1 Release Candidate

Status: **CONTRACT RC — NOT PROMOTED**

Runtime state: **NOT IMPLEMENTED**

Environment: **TESTNET TARGET**

## 1. Authority

This document is a RADIANT-owned elaboration of the frozen shared ownership and
operation registry. It does not modify or supersede the shared
`platform-api-contracts` repository.

The current shared OpenAPI explicitly declares itself contract-only and its
runtime not implemented. This RC preserves that truth while closing the domain
gaps needed for a Testnet implementation.

Evidence:

- `platform-api-contracts/PRODUCT_TRACK_OWNERSHIP_MATRIX.md:19,29-30@e3afd68578817f280afd3329cc2de1c8ece8f10d`
- `platform-api-contracts/registry/operations.yaml:179-211,245-310@e3afd68578817f280afd3329cc2de1c8ece8f10d`
- `platform-api-contracts/openapi/public/radiant.v1.yaml@e3afd68578817f280afd3329cc2de1c8ece8f10d`

Promotion requires the shared contract-plane owner to review and apply the
accepted schema in its own repository.

## 2. API rules

- Base path: `/api/v1/radiant`.
- Authentication: OAuth2 bearer token with `radiant:read` for reads.
- Authentication and authorization are default-deny.
- Exact token URL, issuer, tenant claim, and entitlement mapping are `UNKNOWN`.
- JSON is the required representation for v1.
- Every response includes `environment`, `lifecycle`, `as_of`, and quality.
- Cursors are opaque and stable only for the query snapshot.
- `limit` defaults to 50 and must not exceed 100.
- Graph depth defaults to 2 and must not exceed 3.
- Unknown and insufficient values remain null or explicitly classified.

## 3. Route disposition

### Existing target routes to retain

| Method | Route | Operation ID | RC disposition |
|---|---|---|---|
| GET | `/events` | `radiant.events.list.v1` | Retain; add quality and revision summary. |
| GET | `/events/{event_id}` | `radiant.event.get.v1` | Retain; return current revision and evidence. |
| GET | `/entities/{entity_id}/timeline` | `radiant.entity.timeline.v1` | Retain; require bounded time and pagination. |
| GET | `/graph` | `radiant.graph.read.v1` | Retain; bounded root/depth/as-of projection. |
| GET | `/relationships` | `radiant.relationships.list.v1` | Retain; typed, time-aware Event relations. |
| GET | `/facts` | `radiant.facts.list.v1` | Retain as Harvester-owned factual references; RADIANT does not own fact truth. |
| GET | `/claims` | `radiant.claims.list.v1` | Retain; Harvester-owned claim references. |
| GET | `/predictions` | `radiant.predictions.list.v1` | Retain; require method and quality metadata. |

### RC additions requiring shared-plane approval

| Method | Route | Proposed operation ID | Purpose |
|---|---|---|---|
| GET | `/events/{event_id}/revisions` | `radiant.event.revisions.list.v1` | Immutable revision history. |
| GET | `/scenarios` | `radiant.scenarios.list.v1` | Versioned conditional future states. |
| GET | `/scenarios/{scenario_id}` | `radiant.scenario.get.v1` | Scenario detail and assumptions. |
| GET | `/predictions/{prediction_id}` | `radiant.prediction.get.v1` | Forecast detail and method metadata. |
| GET | `/resolutions` | `radiant.resolutions.list.v1` | Evidence-bound outcomes. |
| GET | `/resolutions/{resolution_id}` | `radiant.resolution.get.v1` | Resolution detail and correction state. |

No write endpoint is part of the public Testnet RC. Ingestion and review
workflows require a separate authenticated internal contract.

## 4. Common response metadata

```json
{
  "environment": "testnet",
  "lifecycle": "preview",
  "as_of": "2026-09-08T00:00:00Z",
  "quality": {
    "status": "preview",
    "missing_sources": [],
    "warnings": [],
    "provenance_complete": false
  }
}
```

Collection responses add `items` and `next_cursor`. Detail responses add
`data`. Error responses use:

```json
{
  "error": {
    "code": "stable_machine_code",
    "message": "bounded public message",
    "trace_id": "opaque-trace-id"
  }
}
```

## 5. EventSummary

Required fields:

- `event_id`
- `current_revision_id`
- `revision_number`
- `title`
- `event_type`
- `epistemic_status`
- `valid_time`
- `observed_at`
- `requires_verification`
- `entity_ids`
- `narrative_ids`
- `country_codes`
- `evidence_count`
- `quality`

## 6. Event detail

`GET /events/{event_id}` returns:

- stable Event identity and lifecycle;
- current EventRevision fields;
- bounded EvidenceRef objects;
- canonical claim, entity, narrative, country, and region IDs;
- revision-history link;
- quality, schema, method, projection, and as-of metadata.

The response must not imply that a story or evidence record is itself the
Event.

## 7. Revision history

`GET /events/{event_id}/revisions` returns revisions ordered by
`revision_number DESC`, with opaque pagination. Revisions are immutable and
include `supersedes_revision_id` and `content_digest`.

The endpoint supports `as_of`, which excludes revisions first observed after
the requested time. A missing historical projection must return an explicit
degraded/unavailable state rather than current truth disguised as historical.

## 8. Entity timeline

Required parameters:

- path `entity_id`;
- optional `from`, `to`, and `as_of` date-times;
- opaque cursor and bounded limit.

Items are EventSummary records linked to the canonical Entity. The endpoint
does not create or own Entity identity.

## 9. Graph read

Required parameters:

- `root_id`;
- optional root type, currently `UNKNOWN` pending ontology approval;
- `depth` from 1 to 3;
- `as_of`;
- optional allowlisted relation types;
- bounded node and edge limits.

Response:

```json
{
  "nodes": [],
  "edges": [],
  "truncated": false,
  "next_cursor": null,
  "projection_version": "contract-only",
  "environment": "testnet",
  "lifecycle": "preview",
  "as_of": "2026-09-08T00:00:00Z",
  "quality": {
    "status": "preview",
    "missing_sources": [],
    "warnings": [],
    "provenance_complete": false
  }
}
```

Every edge requires `relation_id`, `from`, `to`, `relation_type`, valid-time
metadata, epistemic status, evidence IDs, and assertion revision.

## 10. Facts and claims

Facts and Claims are Harvester-owned records exposed through stable references.
Required fields include their canonical ID, statement, verification/epistemic
status, evidence, source owner, and as-of metadata. RADIANT must not silently
rewrite upstream verification status or treat either record as Event truth.

## 11. Scenarios and predictions

Scenario responses require:

- `scenario_id`, revision, title, conditions, assumptions;
- related Event and Prediction IDs;
- horizon and resolution criteria;
- evidence and preview quality.

Prediction responses require:

- `prediction_id`, revision, subject IDs;
- probability between 0 and 1;
- nullable confidence;
- `input_as_of`, horizon, and resolution deadline;
- `method_version` and methodology status;
- supporting and contradicting evidence;
- assumptions, limitations, and preview quality.

## 12. Resolutions

Resolution responses require `resolution_id`, subject ID/type, outcome,
criteria, resolver identity, evidence, timestamps, method version, and dispute
or correction state.

## 13. Error contract

Minimum status behavior:

- `400` malformed cursor or parameters;
- `401` unauthenticated;
- `403` missing scope or entitlement;
- `404` canonical ID not found;
- `409` requested projection/revision conflict where applicable;
- `422` semantically invalid bounded graph query;
- `429` rate limit exceeded;
- `503` authoritative or required projection dependency unavailable.

Testnet must not return a successful empty response when a required dependency
failed.

## 14. Prototype compatibility

The current `/api/v1/maps` server and frontend `/event-flow/*`, `/kol-flow/*`,
and `/narrative-flow/*` client remain outside this v1 API. They must not be
mounted under canonical paths as an implementation shortcut.

## 15. Promotion gates

- Frozen shared owners and registered operation dispositions remain unchanged;
  shared governance accepts the expanded schemas and auth details.
- Generated OpenAPI validates and matches runtime OpenAPI byte-for-byte or by
  an accepted semantic fingerprint.
- Consumer fixtures validate against the accepted contract.
- Security and entitlement tests pass default-deny behavior.
- Exact-SHA Testnet smoke proves Event → Evidence → relationship → graph read.
- Runtime, deployment, readiness, trace, and rollback evidence is linked.
