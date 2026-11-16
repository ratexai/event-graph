/* ═══════════════════════════════════════════════════════════════
   RADIANT read model — types
   Read-only contracts for event detail, evidence timeline, revisions
   and prediction-market bindings. No writer is implemented here.
   ═══════════════════════════════════════════════════════════════ */

/** Epistemic strength of an event, claim or relation. */
export type EpistemicStatus =
  | "observed"
  | "temporal"
  | "associated"
  | "correlated"
  | "inferred"
  | "hypothesized"
  | "causal_candidate";

/** How one evidence reference relates to the revision it supports. */
export type EvidenceRelationType = "supports" | "contradicts" | "context" | "resolution";

/**
 * Reconciled Event-to-Event relation vocabulary.
 * `CAUSES` is deliberately absent; causality is an epistemic status.
 */
export type RelationType =
  | "FOLLOWS"
  | "CONTINUES"
  | "RESPONDS_TO"
  | "CONFIRMS"
  | "CONTRADICTS"
  | "CORRECTS"
  | "SUPERSEDES"
  | "ESCALATES"
  | "DEESCALATES"
  | "RESOLVES"
  | "IMPACTS"
  | "ASSOCIATED_WITH";

export type EventLifecycleStatus = "active" | "retracted" | "archived" | "unknown";

export type QualityStatus = "preview" | "partial" | "insufficient_data" | "unavailable";

export type IdAuthority = "canonical" | "prototype_compatibility";

export type ValidTimePrecision = "exact" | "estimated" | "day" | "range" | "unknown";

/** Occurrence-time semantics. Ingestion time must never be substituted here. */
export interface ValidTime {
  precision: ValidTimePrecision;
  starts_at: string | null;
  ends_at: string | null;
  local_date: string | null;
  timezone: string | null;
}

export type EvidenceIdentityStatus = "resolved" | "prototype_only" | "missing";

export interface EvidenceRefRead {
  evidence_ref_id: string;
  /** Harvester-owned evidence/item ID. Null means the binding is unresolved. */
  evidence_id: string | null;
  /** Harvester-owned source ID. */
  source_id: string | null;
  canonical_url: string | null;
  published_at: string | null;
  observed_at: string | null;
  relation_type: EvidenceRelationType;
  is_primary: boolean;
  /** `prototype_only` means the reference came from a legacy `sourceUrl` string. */
  identity_status: EvidenceIdentityStatus;
}

export interface QualityEnvelope {
  status: QualityStatus;
  as_of: string | null;
  missing_sources: string[];
  warnings: string[];
  provenance_complete: boolean;
}

export type ProbabilityBasis = "provider_price" | "prototype_fixture" | "missing";

export interface MarketOutcomeRead {
  outcome_id: string | null;
  label: string;
  probability: number | null;
  probability_basis: ProbabilityBasis;
  as_of: string | null;
}

export interface MarketBindingAmbiguity {
  ambiguous: boolean;
  reasons: string[];
}

/**
 * Provider-neutral binding to a prediction market.
 * Identity is never derived from a display question or a prototype node ID.
 */
export interface MarketBindingRead {
  market_id: string | null;
  provider: string | null;
  external_market_id: string | null;
  question: string;
  canonical_url: string | null;
  closes_at: string | null;
  resolved_at: string | null;
  resolution: string | null;
  outcomes: MarketOutcomeRead[];
  binding_type: "anchor" | "scenario" | "unknown";
  confidence: number | null;
  as_of: string | null;
  probability: number | null;
  probability_basis: ProbabilityBasis;
  id_authority: IdAuthority | "missing";
  ambiguity: MarketBindingAmbiguity;
  /** Freshness/data-quality gaps that do not change market identity. */
  quality_warnings: string[];
}

export interface RelationRead {
  relation_id: string;
  from_event_ref: string;
  to_event_ref: string;
  relation_type: RelationType;
  epistemic_status: EpistemicStatus;
  valid_from: string | null;
  valid_to: string | null;
  evidence_ref_ids: string[];
  assertion_revision: number;
  assertion_source: "source" | "derived_temporal" | "derived_association";
}

export interface EvidenceClaimRead {
  statement: string;
  evidence_ref_ids: string[];
  epistemic_status: EpistemicStatus;
}

/**
 * Evidence-only explanation. Probability and forecast are literal null:
 * this read model never produces or copies a calibrated forecast.
 */
export interface EvidenceExplanationRead {
  evidence_only: true;
  probability: null;
  forecast: null;
  causality: "not_asserted";
  claims: EvidenceClaimRead[];
  unknowns: string[];
}

export interface EventDetailRead {
  /** Stable read key. Canonical `event_id` when available, otherwise a namespaced prototype key. */
  event_ref: string;
  /** Canonical RADIANT ID only. Null for prototype compatibility data. */
  event_id: string | null;
  id_authority: IdAuthority;
  lifecycle_status: EventLifecycleStatus;
  revision_id: string;
  revision_number: number;
  supersedes_revision_id: string | null;
  title: string;
  summary: string;
  /** `UNKNOWN` when no accepted taxonomy value exists. */
  event_type: string;
  epistemic_status: EpistemicStatus;
  valid_time: ValidTime;
  observed_at: string | null;
  last_observed_at: string | null;
  evidence: EvidenceRefRead[];
  entity_ids: string[];
  narrative_ids: string[];
  country_codes: string[];
  requires_verification: boolean;
  quality: QualityEnvelope;
  as_of: string | null;
  schema_version: string;
  method_version: string;
  content_digest: string | null;
  market_bindings: MarketBindingRead[];
  relations: RelationRead[];
  /** Always null. This read model does not produce forecasts. */
  forecast: null;
  explanation: EvidenceExplanationRead;
  warnings: string[];
}

export type TimelineTimeBasis = "published_at" | "observed_at" | "none";

export interface EvidenceTimelineItem {
  sequence: number;
  evidence: EvidenceRefRead;
  display_time: string | null;
  time_basis: TimelineTimeBasis;
  label: string;
}

export interface EvidenceTimelineRead {
  event_ref: string;
  revision_id: string;
  revision_number: number;
  as_of: string | null;
  items: EvidenceTimelineItem[];
  quality: QualityEnvelope;
  /** Always null. */
  forecast: null;
}

export interface RevisionFieldChange {
  field: string;
  from: unknown;
  to: unknown;
}

export interface RevisionEvidenceChange {
  evidence_ref_id: string;
  from: EvidenceRefRead;
  to: EvidenceRefRead;
}

export interface RevisionDiffRead {
  event_ref: string;
  from_revision: number;
  to_revision: number;
  comparable: boolean;
  reason: string | null;
  changed_fields: RevisionFieldChange[];
  added_evidence: EvidenceRefRead[];
  removed_evidence: EvidenceRefRead[];
  changed_evidence: RevisionEvidenceChange[];
  unchanged_fields: string[];
  summary: string[];
  /** Always null. */
  forecast: null;
}

export interface EvidenceClaimInput {
  statement: string;
  evidence_ref_ids: string[];
  epistemic_status: EpistemicStatus;
}

/** Input for one immutable revision. Read-only: it is never persisted here. */
export interface EventRevisionInput {
  event_ref: string;
  event_id?: string | null;
  id_authority?: IdAuthority;
  lifecycle_status?: EventLifecycleStatus;
  revision_id: string;
  revision_number: number;
  supersedes_revision_id?: string | null;
  title: string;
  summary: string;
  event_type?: string;
  epistemic_status: EpistemicStatus;
  valid_time: ValidTime;
  observed_at: string | null;
  last_observed_at?: string | null;
  evidence: EvidenceRefRead[];
  entity_ids?: string[];
  narrative_ids?: string[];
  country_codes?: string[];
  requires_verification?: boolean;
  method_version?: string;
  content_digest?: string | null;
  market_bindings?: MarketBindingRead[];
  relations?: RelationRead[];
  claims?: EvidenceClaimInput[];
  warnings?: string[];
  as_of?: string | null;
}

/** Minimal prototype-map shape accepted by the compatibility adapter. */
export interface PrototypeEvidenceInput {
  evidence_ref_id?: string;
  evidence_id?: string | null;
  source_id?: string | null;
  canonical_url?: string | null;
  published_at?: string | null;
  observed_at?: string | null;
  relation_type?: EvidenceRelationType;
  is_primary?: boolean;
  identity_status?: EvidenceIdentityStatus;
}

export interface PrototypeMapNode {
  id: string;
  col?: number;
  label?: string;
  desc?: string;
  category?: string;
  signal?: string;
  sentiment?: string;
  weight?: number;
  timestamp?: string;
  observed_at?: string;
  last_observed_at?: string;
  as_of?: string;
  sourceName?: string;
  sourceUrl?: string;
  nodeType?: "fact" | "anchor" | "scenario" | string;
  temporal?: "past" | "present" | "future";
  marketPlatform?: string;
  marketQuestion?: string;
  marketUrl?: string;
  marketSlug?: string;
  marketProb?: number | null;
  probHistory?: number[];
  resolvesAt?: string;
  outcomes?: Array<{
    label?: string;
    polymarketProb?: number | null;
    rateXProb?: number | null;
    alpha?: number | null;
    alphaSignal?: string;
    scenarioId?: string;
  }>;
  influenceLinks?: Array<{ id: string; influence?: number; mechanism?: string }>;
  from?: string[];
  causalNodeIds?: string[];
  evidence?: PrototypeEvidenceInput[];
  content_digest?: string;
  [key: string]: unknown;
}

export interface PrototypeMap {
  id: string;
  title?: string;
  nodes: PrototypeMapNode[];
  timeSlots?: Array<{
    index: number;
    label: string;
    startDate?: string;
    endDate?: string;
    type?: string;
    anchorId?: string;
  }>;
  [key: string]: unknown;
}
