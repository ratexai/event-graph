# RADIANT Contract Reconciliation

Date: 2026-11-16
Status: **CONTRACT RC — TESTNET ONLY**
Runtime state: **NOT IMPLEMENTED**
Baseline: `event-graph@e1401895f97f2c10e06fa44970329fd0f893276c`
Original RC commit: `2e44fefb2634da48d161932a5d7f5474cda9ff08` (2026-09-08)

## 1. Purpose and provenance

This note records the review of the RADIANT Wave 1 contract RC before it is
proposed for merge. It resolves documentation drift against the already-accepted
shared contract plane without deleting or rewriting the original RC content.

Sources:

- `docs/RADIANT_DOMAIN_CANON.md`, `docs/RADIANT_EVENT_CONTRACT.md`,
  `docs/RADIANT_GRAPH_PROJECTION_CONTRACT.md`, `docs/RADIANT_OPENAPI_V1_RC.md`,
  `docs/RADIANT_TESTNET_SEMANTICS.md`, `docs/ADR-001-RADIANT-EVENT-TRUTH-AND-GRAPH-PROJECTION-OWNERSHIP.md`
  at `2e44fef`.
- `platform-api-contracts/RADIANT_TESTNET_API_CONTRACT.md` (snapshot
  2026-09-09) and `platform-api-contracts/GRAPH_ONTOLOGY_OWNERSHIP_MATRIX.md`,
  which cite `2e44fef` as their contract source.
- `platform-api-contracts/openapi/public/radiant.v1.yaml`, the promoted
  operation surface of record.
- `core/docs/projects/universal-catalog-platform/RADIANT_DATA_PLANE_ASIS_AUDIT.md`
  (2026-09-09) for the independent as-is verdict.

Original author and commit metadata are preserved in Git history. The original
relation vocabulary remains quoted in section 3 for traceability.

## 2. Drift found

| ID | Drift | Severity | Resolution |
|---|---|---|---|
| D1 | The RC canon allowed `PRECEDES`, `CO_OCCURS_WITH`, `CORRELATED_WITH`, `CAUSAL_CANDIDATE` as relation types; the shared Testnet contract uses `FOLLOWS`, `CONTINUES`, `RESPONDS_TO`, `CONFIRMS`, `CONTRADICTS`, `CORRECTS`, `SUPERSEDES`, `ESCALATES`, `DEESCALATES`, `RESOLVES`, `IMPACTS`, `ASSOCIATED_WITH` and excludes `CAUSES`. Only `ASSOCIATED_WITH` and `CONTRADICTS` overlapped. | **High** — a ledger cannot be built on two vocabularies | Canon now uses the shared vocabulary. Causality remains an epistemic status, not a relation type. Mapping in section 3. |
| D2 | The promoted `radiant.v1.yaml` schemas omit `supersedes_revision_id`, `content_digest`, full `valid_time`, `observed_at`, `last_observed_at`, lifecycle, quality, and market binding. | **High** — the promoted contract cannot represent the RC invariants | `RADIANT_OPENAPI_V1_RC.md` §16 lists the exact amendments required before implementation. No runtime claim is added. |
| D3 | The RC cites evidence snapshots (`Harvester@a86116b`, Graph Updater `276c34f`) that are older than current heads. | Low — provenance, not semantics | SHAs remain as dated evidence; they are not restated as current heads. The ownership freeze is unchanged. |
| D4 | The repository had no public read-model proof for event detail, evidence timeline, revisions, or market binding. | Medium — implementation could accidentally read JSON as truth | A separate, read-only, typed read model is proposed in `src/read-model/` with explicit prototype/compatibility labels and `forecast: null`. It does not write or publish. |

## 3. Relation vocabulary mapping

| Superseded RC term | Reconciled term | Rule |
|---|---|---|
| `PRECEDES` | `FOLLOWS` | Temporal ordering only; no causation. |
| `CO_OCCURS_WITH` | `ASSOCIATED_WITH` | Association; may be cyclic. |
| `CORRELATED_WITH` | `ASSOCIATED_WITH` | Correlation is carried by the epistemic status `correlated`, not a separate relation type. |
| `CONTRADICTS` | `CONTRADICTS` | Unchanged. |
| `CAUSAL_CANDIDATE` | `ASSOCIATED_WITH` or `IMPACTS` | Causality is the epistemic status `causal_candidate`; `CAUSES` stays forbidden. |
| `ASSOCIATED_WITH` | `ASSOCIATED_WITH` | Unchanged. |

Rules:

- `FOLLOWS` is the only relation type declared acyclic; associative relations
  may form cycles.
- `IMPACTS` is not proof of causation.
- `causal_candidate` must never be rendered as proven causation.
- No relation may be silently promoted to a stronger epistemic class.

## 4. What this review does not do

- It does not claim a runtime, deployment, Testnet availability, or public API.
- It does not promote or edit the shared `platform-api-contracts` repository.
- It does not assign a named owner or a physical Event store.
- It does not make Neo4j an Event authority.
- It does not authorize the prototype JSON maps, the scheduled GitHub Action,
  or `:GraphEvent` as Event publication.

## 5. Review checklist

- [x] Runtime remains labelled **NOT IMPLEMENTED**.
- [x] Ownership freeze and frozen relationship names unchanged.
- [x] One relation vocabulary, reconciled to the shared contract.
- [x] Original RC vocabulary retained for provenance.
- [x] Promoted-OpenAPI gaps listed as required amendments.
- [x] No new graph, database, or entity identity proposed.
- [x] No secrets, credentials, or raw provider data added.
