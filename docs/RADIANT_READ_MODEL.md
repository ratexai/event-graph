# RADIANT Read Model (read-only)

Status: **READ-ONLY IMPLEMENTATION — NO EVENT WRITER**
Runtime: library code only; not a deployed service.
Contract basis: RADIANT contract RC in PR #48
(`docs/RADIANT_EVENT_CONTRACT.md`, `docs/RADIANT_TESTNET_SEMANTICS.md`) and
`platform-api-contracts/RADIANT_TESTNET_API_CONTRACT.md`.

## Purpose

`src/read-model/` provides a typed, dependency-free read path for the first
RADIANT scenario:

1. event detail;
2. ordered evidence timeline;
3. T0/T1 revision comparison for the same event;
4. provider-neutral prediction-market binding;
5. evidence-only explanation.

It does not persist, project, publish, or forecast. `forecast` is the literal
`null`, and the explanation exposes `probability: null` and
`causality: "not_asserted"`.

## Public functions

| Function | Purpose |
|---|---|
| `buildEventDetail(input)` | Validate and build one immutable revision read. |
| `buildEvidenceTimeline(detail, { as_of? })` | Order evidence by `published_at`, then `observed_at`; undated last. |
| `compareEventRevisions(from, to)` | Field + evidence diff for two revisions of the same event. |
| `eventFromPrototypeMap(map, nodeId)` | Compatibility adapter over the legacy JSON map. |
| `marketBindingsForEvent(map, eventId)` | Reverse-lookup anchors; returns all candidates, never picks one. |
| `ReadModelError` | Stable validation error with `code`. |

## Invariants

- `valid_time` and `observed_at` are separate. A prototype `timestamp` becomes
  `valid_time`; it is never copied into `observed_at`.
- A canonical read requires `event_id` and `observed_at`; a prototype read is
  labelled `id_authority: "prototype_compatibility"` and has `event_id: null`.
- Revisions require `supersedes_revision_id` after revision 1 and reject
  duplicate evidence or relation IDs.
- T0/T1 comparison refuses different events and older/equal target revisions.
- Relations are labelled `temporal`, `associated`, `correlated`, `inferred`,
  etc. A derived prototype edge is `FOLLOWS`/`temporal` or
  `ASSOCIATED_WITH`/`associated`; it is never `IMPACTS` or causal.
- Market bindings expose missing identity and duplicate questions as
  `ambiguity.reasons`; missing freshness (`as_of`) and inconsistent
  probabilities are `quality_warnings`. The adapter never selects a winner.
- Missing evidence produces `quality.status: "insufficient_data"` and an empty
  timeline; nothing is fabricated.

## Prototype adapter limits

- Anchors and scenarios are rejected as Events (`market_anchor_is_not_event`,
  `scenario_is_not_event`).
- Prototype nodes are revision 1 only. T0/T1 requires explicit revision inputs;
  the map format has no revision history.
- `rateXProb`, `alpha`, factor arrays and numeric influence weights are **not**
  read. Market prices appear only as `probability_basis: "prototype_fixture"`.
- `market_id` is `null`. `marketSlug` is exposed as `external_market_id` with
  `id_authority: "prototype_compatibility"`.

## Residual writer blocker

The authoritative Event/EventRevision writer remains **UNRESOLVED**. The exact
owner question is:

> Which service/repository owns the append-only RADIANT Event/EventRevision
> store and its transactional outbox, and which owner accepts its physical
> schema, concurrency and replay contract?

`ADR-001` (PR #48) leaves the physical store and service repository unassigned.
`platform-api-contracts` names the role `radiant_product` and the runtime
profile `event-graph`, but not a named owner; runtime state is
`CONTRACT_RC_ACCEPTED_RUNTIME_NOT_IMPLEMENTED`. Until that decision is accepted,
this package must not add a writer, a database, or a Neo4j projector.

## Tests

`src/read-model/__tests__/read-model.test.ts` covers: canonical detail,
valid/observed time separation, invalid/range time, supersedes validation,
duplicate evidence, revision T0/T1 diff, contradicting evidence, removed
evidence, cross-event refusal, missing evidence, `as_of` timeline bounds,
prototype adapter, non-causal relation labels, anchor/scenario rejection,
ambiguous and single-complete market bindings, and fixture-only prices.
