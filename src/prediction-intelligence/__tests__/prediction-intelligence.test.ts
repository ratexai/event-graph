import { describe, expect, it } from "vitest";
import { buildEventDetail } from "../../read-model";
import type {
  EventRevisionInput,
  EvidenceRefRead,
  MarketBindingRead,
  ValidTime,
} from "../../read-model/types";
import { composePredictionIntelligence } from "../index";
import type {
  CanonicalModelOutputV1,
  PredictionEvidenceBundleV1,
  VenueMarketObservationV1,
} from "../types";

const validTime = (overrides: Partial<ValidTime> = {}): ValidTime => ({
  precision: "exact",
  starts_at: "2026-02-20T14:00:00Z",
  ends_at: null,
  local_date: null,
  timezone: "UTC",
  ...overrides,
});

const evidence = (overrides: Partial<EvidenceRefRead> = {}): EvidenceRefRead => ({
  evidence_ref_id: "e1",
  evidence_id: "item-1",
  source_id: "42",
  canonical_url: "https://example.com/report",
  published_at: "2026-02-20T15:00:00Z",
  observed_at: "2026-02-20T15:30:00Z",
  relation_type: "supports",
  is_primary: true,
  identity_status: "resolved",
  ...overrides,
});

const marketBinding = (overrides: Partial<MarketBindingRead> = {}): MarketBindingRead => ({
  market_id: "market-1",
  provider: "polymarket_international",
  external_market_id: "venue-market-1",
  question: "Will the strait reopen by March 15, 2026?",
  canonical_url: "https://example.com/market/market-1",
  closes_at: "2026-03-15T23:59:59Z",
  resolved_at: null,
  resolution: null,
  outcomes: [
    {
      outcome_id: "yes",
      label: "YES",
      probability: 62,
      probability_basis: "provider_price",
      as_of: "2026-02-21T12:00:00Z",
    },
    {
      outcome_id: "no",
      label: "NO",
      probability: 38,
      probability_basis: "provider_price",
      as_of: "2026-02-21T12:00:00Z",
    },
  ],
  binding_type: "anchor",
  confidence: 0.9,
  as_of: "2026-02-21T12:00:00Z",
  probability: 62,
  probability_basis: "provider_price",
  id_authority: "canonical",
  ambiguity: { ambiguous: false, reasons: [] },
  quality_warnings: [],
  ...overrides,
});

const revision = (overrides: Partial<EventRevisionInput> = {}): EventRevisionInput => ({
  event_ref: "radiant:event-1",
  event_id: "event-1",
  revision_id: "rev-1",
  revision_number: 1,
  supersedes_revision_id: null,
  title: "Strait closure",
  summary: "Commercial traffic stopped after the closure notice.",
  event_type: "geopolitical",
  epistemic_status: "observed",
  valid_time: validTime(),
  observed_at: "2026-02-20T16:00:00Z",
  last_observed_at: "2026-02-20T16:00:00Z",
  evidence: [evidence()],
  method_version: "test/v1",
  content_digest: "sha256:test-1",
  market_bindings: [marketBinding()],
  as_of: "2026-02-20T16:00:00Z",
  ...overrides,
});

const observation = (overrides: Partial<VenueMarketObservationV1> = {}): VenueMarketObservationV1 => ({
  venue: "polymarket_international",
  event: {
    venue_event_id: "venue-event-1",
    slug: "strait-closure",
    title: "Strait closure",
  },
  market: {
    venue_market_id: "venue-market-1",
    slug: "strait-reopen",
    question: "Will the strait reopen by March 15, 2026?",
    condition_id: "condition-1",
    market_version: "v1",
    market_state: "ACTIVE",
    resolution_state: "UNRESOLVED",
    end_date: "2026-03-15T23:59:59Z",
  },
  outcomes: [
    {
      label: "YES",
      outcome_index: 0,
      asset_id: "token-yes",
      asset_id_kind: "CTF_TOKEN_ID",
      price: "0.62",
      best_bid: "0.61",
      best_ask: "0.63",
    },
  ],
  quote: {
    source: "clob_price",
    price_basis: "OUTCOME_PRICE",
    as_of: "2026-02-21T12:00:00Z",
    stale_after_seconds: 3600,
  },
  evidence: [
    {
      evidence_id: "venue-evidence-1",
      kind: "VENUE_MARKET",
      url: "https://example.com/market/market-1",
      observed_at: "2026-02-21T12:00:00Z",
      source_version: "fixture-provider/v1",
    },
  ],
  freshness: {
    state: "FRESH",
    observed_at: "2026-02-21T12:00:00Z",
    age_seconds: 60,
    reason: null,
  },
  source_version: "fixture-provider/v1",
  ...overrides,
});

const bundle = (overrides: Partial<PredictionEvidenceBundleV1> = {}): PredictionEvidenceBundleV1 => ({
  contract_version: "prediction-evidence/v1",
  market_id: "market-1",
  as_of: "2026-02-21T12:05:00Z",
  source_version: "harvester-prediction-evidence/fixture",
  items: [
    {
      evidence_id: "bundle-evidence-1",
      kind: "SOURCE_ITEM",
      url: "https://example.com/bundle/1",
      observed_at: "2026-02-21T12:00:00Z",
      source_version: "harvester/fixture",
    },
  ],
  warnings: [],
  ...overrides,
});

describe("composePredictionIntelligence", () => {
  it("composes event detail, an ordered timeline and a T0/T1 diff", () => {
    const t0 = buildEventDetail(revision());
    const t1 = buildEventDetail(
      revision({
        revision_id: "rev-2",
        revision_number: 2,
        supersedes_revision_id: "rev-1",
        title: "Strait remains closed",
        observed_at: "2026-02-22T09:00:00Z",
        last_observed_at: "2026-02-22T09:00:00Z",
        evidence: [
          evidence(),
          evidence({
            evidence_ref_id: "e2",
            evidence_id: "item-2",
            source_id: "43",
            canonical_url: "https://example.com/follow-up",
            published_at: "2026-02-21T08:00:00Z",
            observed_at: "2026-02-21T09:00:00Z",
          }),
        ],
        as_of: "2026-02-22T09:00:00Z",
      }),
    );

    const card = composePredictionIntelligence({
      event: t0,
      toRevision: t1,
      now: "2026-02-22T10:00:00Z",
    });

    expect(card.contract_version).toBe("prediction-intelligence/v1");
    expect(card.event.revision_number).toBe(2);
    expect(card.revisions.from.revision_number).toBe(1);
    expect(card.revisions.to?.revision_number).toBe(2);
    expect(card.revisions.diff?.comparable).toBe(true);
    expect(card.revisions.diff?.changed_fields.map((change) => change.field)).toContain(
      "title",
    );
    expect(card.revisions.diff?.added_evidence.map((ref) => ref.evidence_ref_id)).toEqual([
      "e2",
    ]);
    expect(card.evidence_timeline.items.map((item) => item.sequence)).toEqual([1, 2]);
    expect(card.evidence_timeline.items[0].evidence.evidence_ref_id).toBe("e1");
    expect(card.evidence_timeline.revision_number).toBe(2);
  });

  it("binds one complete market and exposes its implied probability", () => {
    const card = composePredictionIntelligence({
      event: buildEventDetail(revision()),
      marketObservation: observation(),
      now: "2026-02-21T12:01:00Z",
    });

    expect(card.market_binding.state).toBe("BOUND");
    expect(card.market_binding.candidate_count).toBe(1);
    expect(card.market_binding.reasons).toEqual([]);
    expect(card.market_implied_probability).toEqual({
      value: 0.62,
      basis: "provider_price",
      as_of: "2026-02-21T12:00:00Z",
      source: "market_binding:polymarket_international",
    });
    expect(card.market_projection?.contract_version).toBe("prediction-market.read/v1");
    expect(card.market_projection?.venue).toBe("polymarket_international");
    expect(card.market_projection?.ownership_label).toBe("NOT_APPLICABLE");
    expect(card.market_projection_reason).toBeNull();
    expect(card.citations.some((citation) => citation.kind === "VENUE_MARKET")).toBe(true);
  });

  it("keeps multiple market bindings ambiguous and never picks a winner", () => {
    const card = composePredictionIntelligence({
      event: buildEventDetail(
        revision({
          market_bindings: [
            marketBinding(),
            marketBinding({ market_id: "market-2", external_market_id: "venue-market-2" }),
          ],
        }),
      ),
      marketObservation: observation(),
      now: "2026-02-21T12:01:00Z",
    });

    expect(card.market_binding.state).toBe("AMBIGUOUS");
    expect(card.market_binding.binding).toBeNull();
    expect(card.market_binding.candidate_count).toBe(2);
    expect(card.market_binding.reasons).toContain("MULTIPLE_MARKET_BINDINGS");
    expect(card.market_implied_probability).toBeNull();
    expect(card.market_projection).toBeNull();
    expect(card.market_projection_reason).toBe("MARKET_BINDING_AMBIGUOUS");
    expect(card.unknowns.join(" ")).toContain("binding is ambiguous");
  });

  it("keeps a single incomplete binding ambiguous and does not project it", () => {
    const card = composePredictionIntelligence({
      event: buildEventDetail(
        revision({
          market_bindings: [
            marketBinding({
              market_id: null,
              external_market_id: null,
              id_authority: "prototype_compatibility",
              ambiguity: {
                ambiguous: true,
                reasons: ["missing_external_market_id"],
              },
            }),
          ],
        }),
      ),
      marketObservation: observation(),
      now: "2026-02-21T12:01:00Z",
    });

    expect(card.market_binding.state).toBe("AMBIGUOUS");
    expect(card.market_binding.binding?.market_id).toBeNull();
    expect(card.market_binding.reasons).toContain("missing_external_market_id");
    expect(card.market_implied_probability).toBeNull();
    expect(card.market_projection).toBeNull();
    expect(card.market_projection_reason).toBe("MARKET_BINDING_AMBIGUOUS");
  });

  it("treats a missing canonical market id as ambiguous even when unflagged", () => {
    const card = composePredictionIntelligence({
      event: buildEventDetail(
        revision({
          market_bindings: [
            marketBinding({
              market_id: null,
              id_authority: "prototype_compatibility",
              ambiguity: { ambiguous: false, reasons: [] },
            }),
          ],
        }),
      ),
      marketObservation: observation(),
      now: "2026-02-21T12:01:00Z",
    });

    expect(card.market_binding.state).toBe("AMBIGUOUS");
    expect(card.market_binding.reasons).toContain("CANONICAL_MARKET_ID_MISSING");
    expect(card.market_projection).toBeNull();
    expect(card.market_projection_reason).toBe("MARKET_BINDING_AMBIGUOUS");
  });

  it("records a missing market binding without inventing identity", () => {
    const card = composePredictionIntelligence({
      event: buildEventDetail(revision({ market_bindings: [] })),
      now: "2026-02-21T12:01:00Z",
    });

    expect(card.market_binding.state).toBe("MISSING");
    expect(card.market_binding.binding).toBeNull();
    expect(card.market_binding.candidate_count).toBe(0);
    expect(card.market_binding.reasons).toEqual(["NO_MARKET_BINDING"]);
    expect(card.market_projection).toBeNull();
    expect(card.market_projection_reason).toBe("MARKET_BINDING_MISSING");
    expect(card.market_implied_probability).toBeNull();
  });

  it("never fabricates a model probability or forecast", () => {
    const card = composePredictionIntelligence({
      event: buildEventDetail(revision()),
      now: "2026-02-21T12:01:00Z",
    });

    expect(card.model_probability).toBeNull();
    expect(card.model_probability_reason).toBe("NO_CANONICAL_MODEL_OUTPUT");
    expect(card.model_probability_provenance).toBeNull();
    expect(card.event.forecast).toBeNull();
    expect(card.evidence_timeline.forecast).toBeNull();
    expect(card.revisions.diff).toBeNull();
    expect((card as unknown as Record<string, unknown>).forecast).toBeUndefined();
    expect(card.market_implied_probability?.value).toBe(0.62);
  });

  it("accepts a canonical model output only with provenance", () => {
    const supplied: CanonicalModelOutputV1 = {
      probability: 0.55,
      as_of: "2026-02-21T12:00:00Z",
      source_version: "model-service/v3",
      evidence_id: "model-run-1",
      model_id: "radiant-canonical-model",
    };

    const accepted = composePredictionIntelligence({
      event: buildEventDetail(revision()),
      canonicalModelOutput: supplied,
      now: "2026-02-21T12:01:00Z",
    });
    expect(accepted.model_probability).toBe(0.55);
    expect(accepted.model_probability_reason).toBeNull();
    expect(accepted.model_probability_provenance).toEqual({
      model_id: "radiant-canonical-model",
      evidence_id: "model-run-1",
      as_of: "2026-02-21T12:00:00Z",
      source_version: "model-service/v3",
    });

    const rejected = composePredictionIntelligence({
      event: buildEventDetail(revision()),
      canonicalModelOutput: { ...supplied, evidence_id: "" },
      now: "2026-02-21T12:01:00Z",
    });
    expect(rejected.model_probability).toBeNull();
    expect(rejected.model_probability_reason).toBe("INVALID_CANONICAL_MODEL_OUTPUT");
    expect(rejected.warnings).toContain("INVALID_CANONICAL_MODEL_OUTPUT");
  });

  it("keeps empty evidence empty and unavailable", () => {
    const card = composePredictionIntelligence({
      event: buildEventDetail(revision({ evidence: [] })),
      now: "2026-02-21T12:01:00Z",
    });

    expect(card.evidence_timeline.items).toEqual([]);
    expect(card.evidence_timeline.quality.status).toBe("insufficient_data");
    expect(card.evidence_timeline.quality.warnings).toContain("timeline_empty");
    expect(card.freshness.state).toBe("UNAVAILABLE");
    expect(card.freshness.reason).toBe("QUALITY_INSUFFICIENT_DATA");
    expect(card.citations).toEqual([]);
    expect(card.unknowns.join(" ")).toContain("No evidence references");
  });

  it("classifies stale, partial and unavailable freshness", () => {
    const stale = composePredictionIntelligence({
      event: buildEventDetail(revision()),
      stale_after_seconds: 60,
      now: "2026-02-21T13:00:00Z",
    });
    expect(stale.freshness.state).toBe("STALE");
    expect(stale.freshness.reason).toBe("AGE_EXCEEDS_STALE_AFTER");

    const partial = composePredictionIntelligence({
      event: buildEventDetail(
        revision({
          evidence: [
            evidence({ evidence_id: null, source_id: null, identity_status: "prototype_only" }),
          ],
        }),
      ),
      now: "2026-02-20T16:01:00Z",
    });
    expect(partial.freshness.state).toBe("PARTIAL");
    expect(partial.freshness.reason).toBe("QUALITY_PARTIAL");

    const unavailable = composePredictionIntelligence({
      event: buildEventDetail(revision({ evidence: [] })),
      now: "2026-02-20T16:01:00Z",
    });
    expect(unavailable.freshness.state).toBe("UNAVAILABLE");

    const future = composePredictionIntelligence({
      event: buildEventDetail(revision()),
      now: "2026-02-20T15:00:00Z",
    });
    expect(future.freshness.state).toBe("PARTIAL");
    expect(future.freshness.reason).toBe("AS_OF_IN_FUTURE");
  });

  it("records an absent evidence bundle with a reason and accepts a matching one", () => {
    const absent = composePredictionIntelligence({
      event: buildEventDetail(revision()),
      now: "2026-02-21T12:01:00Z",
    });
    expect(absent.evidence_bundle.state).toBe("NOT_SUPPLIED");
    expect(absent.evidence_bundle.items).toEqual([]);
    expect(absent.evidence_bundle.reason).toBe(
      "PREDICTION_EVIDENCE_BUNDLE_NOT_SUPPLIED",
    );

    const supplied = composePredictionIntelligence({
      event: buildEventDetail(revision()),
      evidenceBundle: bundle(),
      now: "2026-02-21T12:06:00Z",
    });
    expect(supplied.evidence_bundle.state).toBe("SUPPLIED");
    expect(supplied.evidence_bundle.items).toHaveLength(1);
    expect(
      supplied.citations.some((citation) => citation.kind === "PREDICTION_EVIDENCE_BUNDLE"),
    ).toBe(true);

    const mismatched = composePredictionIntelligence({
      event: buildEventDetail(revision()),
      evidenceBundle: bundle({ market_id: "another-market" }),
      now: "2026-02-21T12:06:00Z",
    });
    expect(mismatched.evidence_bundle.state).toBe("MISMATCHED_MARKET");
    expect(mismatched.evidence_bundle.items).toEqual([]);
    expect(mismatched.warnings).toContain("EVIDENCE_BUNDLE_MARKET_ID_MISMATCH");

    const unbound = composePredictionIntelligence({
      event: buildEventDetail(revision({ market_bindings: [] })),
      evidenceBundle: bundle({ market_id: null }),
      now: "2026-02-21T12:06:00Z",
    });
    expect(unbound.evidence_bundle.state).toBe("UNBOUND");
    expect(unbound.evidence_bundle.items).toEqual([]);
    expect(unbound.warnings).toContain("EVIDENCE_BUNDLE_WITHOUT_MARKET_BINDING");
  });

  it("rejects a revision target that is older or a different event", () => {
    const t1 = buildEventDetail(
      revision({
        revision_id: "rev-2",
        revision_number: 2,
        supersedes_revision_id: "rev-1",
        observed_at: "2026-02-21T09:00:00Z",
        last_observed_at: "2026-02-21T09:00:00Z",
        as_of: "2026-02-21T09:00:00Z",
      }),
    );

    const card = composePredictionIntelligence({
      event: t1,
      toRevision: buildEventDetail(revision()),
      now: "2026-02-21T10:00:00Z",
    });

    expect(card.revisions.to).toBeNull();
    expect(card.revisions.diff).toBeNull();
    expect(card.revisions.diff_reason).toBe("REVISION_TARGET_REJECTED");
    expect(card.warnings).toContain("REVISION_TARGET_REJECTED");
    expect(card.event.revision_number).toBe(2);
  });
});
