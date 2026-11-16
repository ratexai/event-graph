# RADIANT Prediction Intelligence (read-only)

Status: **READ-ONLY PROJECTION — STATIC FIXTURE ENDPOINT**
Contract: `prediction-intelligence/v1`
Input contract: `ratex.radiant.read/v1` (`src/read-model/`)
Market read shape: `prediction-market.read/v1` mirrored from
`ratex-infra/platform-bff@cee03f6` (`src/prediction-market/contract.ts`).
Writer: **UNRESOLVED** — see [RADIANT_READ_MODEL.md](./RADIANT_READ_MODEL.md).

## Purpose

`src/prediction-intelligence/` composes the existing RADIANT read model into one
market-facing card for Polymarket-style intelligence. It does not persist,
publish, price or forecast.

The card contains:

1. one `EventDetailRead` (the latest revision);
2. an ordered evidence timeline;
3. a T0/T1 `RevisionDiffRead` when a newer revision is supplied;
4. the provider-neutral `MarketBindingRead` selection;
5. a BFF-shaped `PredictionMarketReadProjectionV1`, only from a supplied venue
   observation;
6. an optional W4-B2 `PredictionEvidenceBundleV1` intake;
7. citations, freshness, unknowns and warnings.

## Non-negotiable rules

- `model_probability` is literal `null` unless a canonical model output with
  `model_id`, `evidence_id`, `as_of` and `source_version` is supplied.
  Otherwise `model_probability_reason` is `NO_CANONICAL_MODEL_OUTPUT`.
- `market_implied_probability` comes only from
  `MarketBindingRead.probability`, is normalised to 0..1, and is null when the
  binding is missing, ambiguous, price-less or out of range.
- A missing or unresolved market ID stays `null`. The composition never derives
  a market ID from a display question, slug or prototype node.
- Multiple bindings stay `AMBIGUOUS`; no winner is selected.
- `market_projection` is null unless a canonical market ID, an explicit
  `polymarket_international` / `polymarket_us` provider, a matching external
  market ID and a supplied venue observation exist.
- No `forecast` field is emitted. Evidence-only explanation remains
  `probability: null`, `forecast: null`, `causality: "not_asserted"`.
- No writer, event store, database, registry, scoring engine or second graph is
  added.

## Public surface

```ts
import { composePredictionIntelligence } from "@ratexai/event-graph/prediction-intelligence";

const card = composePredictionIntelligence({ event, toRevision, marketObservation });
```

`now`, `as_of`, `stale_after_seconds` and `source_version` are injectable for
deterministic tests. The default clock is only used when `now` is omitted.

## Fixture and endpoint

- Fixture: `radiant/data/prediction-intelligence/example.json`
- Source label: `radiant.fixture/iran-war-2026@2026-11-16`
- Basis: Iran map node `n4_strikes`, with a fixture T1 revision and the
  `us-strikes-iran-by` market from the map's market anchor.
- Recorded/static: `as_of: 2026-03-03T12:30:00Z`; the card is `STALE`.
- Endpoint: `GET /api/v1/prediction-intelligence/{market_id}`
  - wraps the card as `{ "state": "OK", "source": "fixture", "data": card }`;
  - returns `404 { "state": "NOT_FOUND", "reason": ... }` for unknown IDs;
  - has no write route.

Regenerate the fixture after changing the composition:

```bash
npm run build
node scripts/generate-prediction-intelligence-fixture.mjs
```

## Tests

```bash
npm test
npm run typecheck
npm run build
npm run lint
python3 -m unittest discover -s radiant/tests -t . -v
```

`src/prediction-intelligence/__tests__/readonly-boundary.test.ts` fails if the
module imports a non-local package or contains a writer/DB/network call.

## Residual blocker

The authoritative Event/EventRevision writer is still unresolved. This
projection reads only what `src/read-model/` exposes; it does not create or
update events, revisions, market identities or scores.
