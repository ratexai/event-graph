/* ═══════════════════════════════════════════════════════════════
   Prediction intelligence — BFF read-contract mirror
   Structural copy of `platform-bff/src/prediction-market/contract.ts`
   (`ratex-infra/platform-bff@cee03f6`), kept dependency-free.

   This is a READ shape only. It carries no order, ticket, receipt,
   funding, signature, wallet or session authority.
   ═══════════════════════════════════════════════════════════════ */

export const PREDICTION_MARKET_READ_VERSION = "prediction-market.read/v1" as const;

export type PredictionVenue = "polymarket_international" | "polymarket_us";

export type PredictionMarketState =
  | "UNKNOWN"
  | "ACTIVE"
  | "PAUSED"
  | "CANCEL_ONLY"
  | "CLOSED"
  | "RESOLVED"
  | "CANCELLED";

export type PredictionResolutionState =
  | "UNRESOLVED"
  | "PROPOSED"
  | "DISPUTED"
  | "RESOLVED"
  | "INVALID";

export type PredictionAssetIdKind = "CTF_TOKEN_ID" | "V2_POSITION_ID";

export type PredictionFreshnessState = "FRESH" | "STALE" | "PARTIAL" | "UNAVAILABLE";

export interface VenueEventIdentityV1 {
  readonly venue_event_id: string;
  readonly slug: string;
  readonly title: string;
}

export interface VenueMarketIdentityV1 {
  readonly venue_market_id: string;
  readonly slug: string;
  readonly question: string;
  readonly condition_id: string;
  readonly market_version: "v1" | "v2";
  readonly market_state: PredictionMarketState;
  readonly resolution_state: PredictionResolutionState;
  readonly end_date: string;
}

export interface PredictionOutcomeV1 {
  readonly label: string;
  readonly outcome_index: 0 | 1;
  readonly asset_id: string;
  readonly asset_id_kind: PredictionAssetIdKind;
  readonly price: string | null;
  readonly best_bid: string | null;
  readonly best_ask: string | null;
}

export interface PredictionQuoteV1 {
  readonly source: "clob_book" | "clob_price" | "clob_midpoint" | "gamma_market" | "data_api_positions";
  readonly price_basis: "MIDPOINT" | "BEST_BID" | "BEST_ASK" | "LAST_TRADE" | "OUTCOME_PRICE";
  readonly as_of: string;
  readonly stale_after_seconds: number;
  readonly book_hash?: string;
  readonly spread?: string | null;
}

export interface PredictionEvidenceRefV1 {
  readonly evidence_id: string;
  readonly kind:
    | "VENUE_MARKET"
    | "VENUE_BOOK"
    | "RADIANT_ANCHOR"
    | "RADIANT_REVISION"
    | "KROS_TOOL"
    | "PORTFOLIO_OBSERVATION";
  readonly url?: string;
  readonly observed_at: string;
  readonly source_version: string;
}

export interface PredictionFreshnessV1 {
  readonly state: PredictionFreshnessState;
  readonly observed_at: string | null;
  readonly age_seconds: number | null;
  readonly reason: string | null;
}

/** Exactly the BFF `PredictionMarketReadProjectionV1` shape, locally mirrored. */
export interface PredictionMarketReadProjectionV1 {
  readonly contract_version: typeof PREDICTION_MARKET_READ_VERSION;
  readonly venue: PredictionVenue;
  readonly event: VenueEventIdentityV1;
  readonly market: VenueMarketIdentityV1;
  readonly outcomes: readonly PredictionOutcomeV1[];
  readonly quote: PredictionQuoteV1 | null;
  readonly evidence: readonly PredictionEvidenceRefV1[];
  readonly freshness: PredictionFreshnessV1;
  readonly source_version: string;
  /** Market data is observed, never owned by the viewer. */
  readonly ownership_label: "NOT_APPLICABLE";
}
