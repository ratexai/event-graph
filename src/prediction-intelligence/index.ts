/* ═══════════════════════════════════════════════════════════════
   Prediction intelligence — public surface
   Read-only composition over `src/read-model`. No writer, DB, registry,
   scoring engine or second graph.
   ═══════════════════════════════════════════════════════════════ */

export { composePredictionIntelligence } from "./compose";
export {
  PREDICTION_INTELLIGENCE_VERSION,
  type PredictionIntelligenceVersion,
} from "./types";
export {
  PREDICTION_MARKET_READ_VERSION,
  type PredictionVenue,
  type PredictionMarketState,
  type PredictionResolutionState,
  type PredictionAssetIdKind,
  type PredictionFreshnessState,
  type VenueEventIdentityV1,
  type VenueMarketIdentityV1,
  type PredictionOutcomeV1,
  type PredictionQuoteV1,
  type PredictionEvidenceRefV1,
  type PredictionFreshnessV1,
  type PredictionMarketReadProjectionV1,
} from "./contract";

export type {
  PredictionRevisionRefV1,
  PredictionRevisionSetV1,
  MarketBindingStateV1,
  MarketBindingProjectionV1,
  MarketImpliedProbabilityV1,
  CanonicalModelOutputV1,
  ModelProbabilityProvenanceV1,
  PredictionCitationKindV1,
  PredictionCitationV1,
  PredictionIntelligenceFreshnessV1,
  PredictionEvidenceBundleItemV1,
  PredictionEvidenceBundleV1,
  PredictionEvidenceBundleStateV1,
  PredictionEvidenceBundleProjectionV1,
  VenueMarketObservationV1,
  PredictionIntelligenceInputV1,
  PredictionIntelligenceCardV1,
} from "./types";
