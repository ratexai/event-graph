# RADIANT Event and EventRevision Contract

Status: **CONTRACT RC — TESTNET ONLY**

Runtime state: **NOT IMPLEMENTED**

Ownership freeze: `platform-api-contracts@e3afd68578817f280afd3329cc2de1c8ece8f10d`

## 1. Contract scope

This contract defines the minimum authoritative representation for canonical
RADIANT Events and their immutable revisions. It is independent of storage
technology and does not authorize a production deployment.

## 2. Event record

`Event` is the stable aggregate locator. It contains no mutable event truth
beyond lifecycle pointers that can be rebuilt from revisions.

| Field | Type | Required | Semantics |
|---|---|---:|---|
| `event_id` | string | yes | Opaque canonical RADIANT ID. |
| `created_at` | date-time | yes | First accepted creation time. |
| `current_revision_id` | string | yes | Derived pointer to the latest accepted revision. |
| `current_revision_number` | integer | yes | Positive monotonic revision number. |
| `lifecycle_status` | enum | yes | `active`, `retracted`, or `archived`. |

Event lifecycle changes are represented by new EventRevisions. The pointer may
change transactionally, but the referenced revision may not be overwritten.

## 3. EventRevision record

| Field | Type | Required | Semantics |
|---|---|---:|---|
| `revision_id` | string | yes | Immutable revision identity. |
| `event_id` | string | yes | Parent Event identity. |
| `revision_number` | integer | yes | Positive and unique per Event. |
| `supersedes_revision_id` | string or null | yes | Previous revision; null only for revision 1. |
| `title` | string | yes | Human-readable title, not identity. |
| `summary` | string | yes | Bounded factual summary. |
| `event_type` | string | yes | Versioned taxonomy value; taxonomy is currently `UNKNOWN`. |
| `epistemic_status` | enum | yes | See section 5. |
| `valid_time` | object | yes | Occurrence time semantics; see section 4. |
| `observed_at` | date-time | yes | When RADIANT accepted this revision input. |
| `last_observed_at` | date-time | yes | Latest identical replay observation; not semantic truth. |
| `evidence` | EvidenceRef[] | yes | Non-empty for a published Testnet revision. |
| `claim_ids` | string[] | yes | Canonical Harvester claim IDs; may be empty. |
| `entity_ids` | string[] | yes | Canonical shared entity IDs; may be empty. |
| `narrative_ids` | string[] | yes | Canonical shared narrative IDs; may be empty. |
| `country_codes` | string[] | yes | Unique ISO 3166-1 alpha-2 codes where supported. |
| `region_ids` | string[] | yes | Canonical region IDs; owner remains `UNKNOWN`. |
| `requires_verification` | boolean | yes | True when corroboration remains incomplete. |
| `quality` | QualityEnvelope | yes | Honest completeness and provenance state. |
| `schema_version` | string | yes | Event contract version. |
| `method_version` | string | yes | Canonicalization method or workflow version. |
| `content_digest` | string | yes | SHA-256 of canonical semantic content. |
| `created_at` | date-time | yes | Immutable persistence timestamp. |

Arrays use deterministic ordering for digest computation. Reordering a
semantic set does not create a revision.

## 4. Valid-time contract

```json
{
  "precision": "exact | estimated | day | range | unknown",
  "starts_at": "date-time or null",
  "ends_at": "date-time or null",
  "local_date": "date or null",
  "timezone": "IANA timezone or null"
}
```

Rules:

- `exact` and `estimated` require a timezone-aware `starts_at`.
- `range` requires `starts_at` and `ends_at`, with end not earlier than start.
- `day` requires `local_date`; clock fields may be null.
- `unknown` keeps all occurrence-time values null.
- Ingestion or observation time must not be substituted for unknown valid time.

These rules are grounded in Harvester's proven calendar revision validation,
which separates local date, clock time, timezone, precision, and observation
time.

## 5. Epistemic status

The current target OpenAPI vocabulary is preserved for compatibility:

- `observed`
- `temporal`
- `associated`
- `correlated`
- `inferred`
- `hypothesized`
- `causal_candidate`

Only `observed` may be presented as a confirmed real-world occurrence in
Testnet. Other values must display their status and remain `PREVIEW`. A
Scenario or Prediction must not be silently promoted into an Event.

## 6. EvidenceRef

| Field | Type | Required | Semantics |
|---|---|---:|---|
| `evidence_ref_id` | string | yes | Stable RADIANT-owned binding ID. |
| `evidence_id` | string | yes | Stable upstream evidence or intelligence-item ID. |
| `source_id` | string | yes | Canonical Harvester source identity. |
| `canonical_url` | URI or null | yes | Canonical locator where applicable. |
| `published_at` | date-time or null | yes | Source publication time if known. |
| `observed_at` | date-time | yes | Time the upstream evidence was observed. |
| `relation_type` | enum | yes | `supports`, `contradicts`, `context`, or `resolution`. |
| `is_primary` | boolean | yes | Whether this is primary evidence. |

RADIANT owns and stores the `EvidenceRef` binding. Harvester remains the owner
of the referenced Evidence, Claim, source, and source provenance. An
`EvidenceRef` must not be used as a copied Evidence authority.

## 7. QualityEnvelope

```json
{
  "status": "preview | partial | insufficient_data | unavailable",
  "as_of": "date-time",
  "missing_sources": [],
  "warnings": [],
  "provenance_complete": false
}
```

Testnet does not expose a `production` quality value. Missing values remain
null or explicitly insufficient; they are never rendered as zero.

## 8. Revision algorithm

1. Validate stable upstream IDs, time fields, evidence, and quality.
2. Acquire serialization for the canonical `event_id`.
3. Canonicalize semantic fields and compute `content_digest`.
4. If the digest equals the latest revision, record only replay observation
   metadata and create no semantic revision.
5. Otherwise append revision `N + 1`, linking `supersedes_revision_id`.
6. Update the current-revision pointer in the same transaction.
7. Append the matching outbox message in the same transaction.
8. Never publish the Neo4j projection before the authoritative revision and
   outbox record commit.

The exact replay-observation storage is `UNKNOWN`; it must not require mutation
of immutable semantic fields.

## 9. Candidate and publication rules

- Model output first becomes a `CANDIDATE`, not an EventRevision.
- A candidate requires schema validation and evidence resolution before
  Testnet publication.
- Evidence-free candidates remain unavailable to public Event reads.
- Published revisions are immutable.
- Retraction creates a new revision; it does not delete history.
- Direct JSON-map mutation and automated Git commits are not authoritative
  publication mechanisms.

## 10. Minimal example

```json
{
  "revision_id": "opaque-revision-id",
  "event_id": "opaque-event-id",
  "revision_number": 1,
  "supersedes_revision_id": null,
  "title": "Example observed occurrence",
  "summary": "A bounded factual summary.",
  "event_type": "UNKNOWN",
  "epistemic_status": "observed",
  "valid_time": {
    "precision": "unknown",
    "starts_at": null,
    "ends_at": null,
    "local_date": null,
    "timezone": null
  },
  "observed_at": "2026-09-08T00:00:00Z",
  "last_observed_at": "2026-09-08T00:00:00Z",
  "evidence": [
    {
      "evidence_ref_id": "opaque-evidence-binding-id",
      "evidence_id": "upstream-evidence-id",
      "source_id": "42",
      "canonical_url": null,
      "published_at": null,
      "observed_at": "2026-09-08T00:00:00Z",
      "relation_type": "supports",
      "is_primary": false
    }
  ],
  "claim_ids": [],
  "entity_ids": [],
  "narrative_ids": [],
  "country_codes": [],
  "region_ids": [],
  "requires_verification": true,
  "quality": {
    "status": "preview",
    "as_of": "2026-09-08T00:00:00Z",
    "missing_sources": [],
    "warnings": ["Example only"],
    "provenance_complete": false
  },
  "schema_version": "ratex.radiant.event/v1-rc",
  "method_version": "UNKNOWN",
  "content_digest": "sha256-placeholder",
  "created_at": "2026-09-08T00:00:00Z"
}
```

## 11. Acceptance gates

- Storage-independent schema validation.
- Deterministic digest and replay tests.
- Concurrent revision allocation tests.
- Non-empty evidence enforcement for published revisions.
- Retraction-with-history test.
- Transactional outbox atomicity test.
- Contract fixtures shared with Graph Updater and read adapters.
- Provenance, quality, and null-semantics tests.
- Exact-SHA integration evidence before any Testnet readiness claim.
