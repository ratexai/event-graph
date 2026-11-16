/* ═══════════════════════════════════════════════════════════════
   Prediction intelligence — card types
   Composes the RADIANT read model into a market-facing, evidence-only
   projection. It never writes, prices or forecasts.
   ═══════════════════════════════════════════════════════════════ */

import type {
  EventDetailRead,
  EvidenceTimelineRead,
  MarketBindingRead,
  ProbabilityBasis,
  RevisionDiffRead,
} from "../read-model/types";
import type {
  PredictionEvidenceRefV1,
  PredictionFreshnessV1,
  PredictionMarketReadProjectionV1,
  PredictionOutcomeV1,
  PredictionQuoteV1,
  PredictionVenue,
  VenueEventIdentityV1,
  VenueMarketIdentityV1,
} from "./contract";

export const PREDICTION_INTELLIGENCE_VERSION = "prediction-intelligence/v1" as const;

export type PredictionIntelligenceVersion = typeof PREDICTION_INTELLIGENCE_VERSION;

export interface PredictionRevisionRefV1 {
  revision_id: string;
  revision_number: number;
  as_of: string | null;
}

export interface PredictionRevisionSetV1 {
  /** Older revision (T0). */
  from: PredictionRevisionRefV1;
  /** Newer revision (T1), null when only one revision is read. */
  to: PredictionRevisionRefV1 | null;
  /** T0/T1 diff, null when no newer revision was supplied. */
  diff: RevisionDiffRead | null;
  diff_reason: string | null;
}

export type MarketBindingStateV1 = "BOUND" | "AMBIGUOUS" | "MISSING";

/**
 * Selection over the read model's bindings. Multiple candidates are never
 * collapsed into one; an ambiguous single binding is still labelled ambiguous.
 */
export interface MarketBindingProjectionV1 {
  state: MarketBindingStateV1;
  /** Present only when exactly one candidate exists. Never a winner-pick. */
  binding: MarketBindingRead | null;
  candidates: MarketBindingRead[];
  candidate_count: number;
  reasons: string[];
}

/**
 * Market-observed implied probability. `value` is normalised to 0..1 from the
 * provider-backed percentage in `MarketBindingRead.probability`; it is not a
 * model estimate and is null when the binding or price is missing.
 */
export interface MarketImpliedProbabilityV1 {
  value: number;
  basis: ProbabilityBasis;
  as_of: string | null;
  source: string;
}

/**
 * A canonical model output may only enter the card when its producer and
 * provenance are supplied. The read model ships no such output.
 */
export interface CanonicalModelOutputV1 {
  probability: number;
  as_of: string;
  source_version: string;
  evidence_id: string;
  model_id: string;
}

export interface ModelProbabilityProvenanceV1 {
  model_id: string;
  evidence_id: string;
  as_of: string;
  source_version: string;
}

export type PredictionCitationKindV1 =
  | "RADIANT_EVIDENCE"
  | "VENUE_MARKET"
  | "PREDICTION_EVIDENCE_BUNDLE";

export interface PredictionCitationV1 {
  /** Harvester evidence ID when the reference is resolved; null otherwise. */
  evidence_id: string | null;
  /** Always-present read-model reference key. */
  evidence_ref_id: string;
  kind: PredictionCitationKindV1;
  url: string | null;
  observed_at: string | null;
  source_version: string;
}

export interface PredictionIntelligenceFreshnessV1 {
  state: "FRESH" | "STALE" | "PARTIAL" | "UNAVAILABLE";
  as_of: string | null;
  age_seconds: number | null;
  stale_after_seconds: number;
  reason: string | null;
}

/**
 * Provisional intake for the optional W4-B2 bundle. No B2 implementation was
 * present at the time of writing, so this shape is deliberately structural and
 * tolerant; absent input is recorded as `NOT_SUPPLIED`, never fabricated.
 */
export interface PredictionEvidenceBundleItemV1 {
  evidence_id: string;
  kind: string;
  url: string | null;
  observed_at: string | null;
  source_version: string;
}

export interface PredictionEvidenceBundleV1 {
  contract_version: string;
  market_id: string | null;
  as_of: string | null;
  source_version: string;
  items: PredictionEvidenceBundleItemV1[];
  warnings: string[];
}

export type PredictionEvidenceBundleStateV1 =
  | "NOT_SUPPLIED"
  | "SUPPLIED"
  | "MISMATCHED_MARKET"
  | "UNBOUND";

export interface PredictionEvidenceBundleProjectionV1 {
  state: PredictionEvidenceBundleStateV1;
  as_of: string | null;
  source_version: string | null;
  items: PredictionEvidenceBundleItemV1[];
  reason: string | null;
}

/** A supplied venue observation. Nothing here is inferred from a display question. */
export interface VenueMarketObservationV1 {
  venue: PredictionVenue;
  event: VenueEventIdentityV1;
  market: VenueMarketIdentityV1;
  outcomes: readonly PredictionOutcomeV1[];
  quote: PredictionQuoteV1 | null;
  evidence: readonly PredictionEvidenceRefV1[];
  freshness: PredictionFreshnessV1;
  source_version: string;
}

export interface PredictionIntelligenceInputV1 {
  /** Older / only revision, as read by `src/read-model`. */
  event: EventDetailRead;
  /** Optional newer revision for T0/T1. Must be the same event, newer number. */
  toRevision?: EventDetailRead | null;
  /** Optional supplied W4-B2 bundle. Never required. */
  evidenceBundle?: PredictionEvidenceBundleV1 | null;
  /** Optional venue observation used to build the BFF-shaped read projection. */
  marketObservation?: VenueMarketObservationV1 | null;
  /** Optional producer-supplied canonical model output with provenance. */
  canonicalModelOutput?: CanonicalModelOutputV1 | null;
  as_of?: string | null;
  /** Evaluation instant for freshness. Injectable for deterministic tests. */
  now?: string | null;
  stale_after_seconds?: number | null;
  source_version?: string | null;
}

export interface PredictionIntelligenceCardV1 {
  contract_version: PredictionIntelligenceVersion;
  as_of: string | null;
  event: EventDetailRead;
  revisions: PredictionRevisionSetV1;
  evidence_timeline: EvidenceTimelineRead;
  market_binding: MarketBindingProjectionV1;
  /** BFF-shaped read projection. Null when identity or venue data is unresolved. */
  market_projection: PredictionMarketReadProjectionV1 | null;
  market_projection_reason: string | null;
  market_implied_probability: MarketImpliedProbabilityV1 | null;
  /** Literal null unless `CanonicalModelOutputV1` with provenance was supplied. */
  model_probability: number | null;
  model_probability_reason: string | null;
  model_probability_provenance: ModelProbabilityProvenanceV1 | null;
  citations: PredictionCitationV1[];
  freshness: PredictionIntelligenceFreshnessV1;
  unknowns: string[];
  warnings: string[];
  source_version: string;
  /** Optional W4-B2 evidence, empty-with-reason when not supplied. */
  evidence_bundle: PredictionEvidenceBundleProjectionV1;
}
