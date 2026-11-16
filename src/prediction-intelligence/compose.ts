/* ═══════════════════════════════════════════════════════════════
   Prediction intelligence — composition
   Pure functions over the read model. No persistence, no network,
   no forecast, no market-ID inference.
   ═══════════════════════════════════════════════════════════════ */

import { buildEvidenceTimeline, compareEventRevisions } from "../read-model";
import type {
  EventDetailRead,
  EvidenceRefRead,
  RevisionDiffRead,
} from "../read-model/types";
import type {
  PredictionMarketReadProjectionV1,
  PredictionVenue,
  VenueEventIdentityV1,
  VenueMarketIdentityV1,
} from "./contract";
import { PREDICTION_MARKET_READ_VERSION } from "./contract";
import type {
  CanonicalModelOutputV1,
  MarketBindingProjectionV1,
  MarketImpliedProbabilityV1,
  ModelProbabilityProvenanceV1,
  PredictionCitationV1,
  PredictionEvidenceBundleItemV1,
  PredictionEvidenceBundleProjectionV1,
  PredictionEvidenceBundleV1,
  PredictionIntelligenceCardV1,
  PredictionIntelligenceFreshnessV1,
  PredictionIntelligenceInputV1,
  PredictionRevisionRefV1,
  PredictionRevisionSetV1,
  VenueMarketObservationV1,
} from "./types";
import { PREDICTION_INTELLIGENCE_VERSION } from "./types";

const DEFAULT_STALE_AFTER_SECONDS = 86_400;
const VENUES: readonly PredictionVenue[] = ["polymarket_international", "polymarket_us"];
const INSTANT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

function isInstant(value: unknown): value is string {
  return typeof value === "string" && INSTANT_RE.test(value) && !Number.isNaN(Date.parse(value));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function uniquePreserve(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function revisionRef(detail: EventDetailRead): PredictionRevisionRefV1 {
  return {
    revision_id: detail.revision_id,
    revision_number: detail.revision_number,
    as_of: detail.as_of,
  };
}

function selectMarketBinding(detail: EventDetailRead): MarketBindingProjectionV1 {
  const candidates = detail.market_bindings.map((binding) => ({
    ...binding,
    outcomes: binding.outcomes.map((outcome) => ({ ...outcome })),
    ambiguity: {
      ambiguous: binding.ambiguity.ambiguous,
      reasons: [...binding.ambiguity.reasons],
    },
    quality_warnings: [...binding.quality_warnings],
  }));

  if (candidates.length === 0) {
    return {
      state: "MISSING",
      binding: null,
      candidates: [],
      candidate_count: 0,
      reasons: ["NO_MARKET_BINDING"],
    };
  }

  if (candidates.length === 1) {
    const only = candidates[0];
    const reasons = [...only.ambiguity.reasons];
    if (!isNonEmptyString(only.market_id)) reasons.push("CANONICAL_MARKET_ID_MISSING");
    if (only.ambiguity.ambiguous || reasons.length > 0) {
      return {
        state: "AMBIGUOUS",
        binding: only,
        candidates,
        candidate_count: 1,
        reasons:
          reasons.length > 0
            ? [...new Set(reasons)].sort((a, b) => a.localeCompare(b))
            : ["BINDING_FLAGGED_AMBIGUOUS"],
      };
    }
    return {
      state: "BOUND",
      binding: only,
      candidates,
      candidate_count: 1,
      reasons: [],
    };
  }

  const reasons = new Set<string>(["MULTIPLE_MARKET_BINDINGS"]);
  for (const candidate of candidates) {
    for (const reason of candidate.ambiguity.reasons) reasons.add(reason);
  }

  return {
    state: "AMBIGUOUS",
    binding: null,
    candidates,
    candidate_count: candidates.length,
    reasons: [...reasons].sort((a, b) => a.localeCompare(b)),
  };
}

function venueFromProvider(provider: string | null): PredictionVenue | null {
  if (provider === null) return null;
  return VENUES.includes(provider as PredictionVenue) ? (provider as PredictionVenue) : null;
}

function projectionIdentityComplete(
  event: VenueEventIdentityV1,
  market: VenueMarketIdentityV1,
): boolean {
  return (
    isNonEmptyString(event.venue_event_id) &&
    isNonEmptyString(event.slug) &&
    isNonEmptyString(event.title) &&
    isNonEmptyString(market.venue_market_id) &&
    isNonEmptyString(market.slug) &&
    isNonEmptyString(market.question) &&
    isNonEmptyString(market.condition_id) &&
    isNonEmptyString(market.end_date)
  );
}

interface ProjectionResult {
  projection: PredictionMarketReadProjectionV1 | null;
  reason: string | null;
  warnings: string[];
}

function buildMarketProjection(
  bindingProjection: MarketBindingProjectionV1,
  observation: VenueMarketObservationV1 | null | undefined,
): ProjectionResult {
  const warnings: string[] = [];
  if (bindingProjection.state === "MISSING") {
    return { projection: null, reason: "MARKET_BINDING_MISSING", warnings };
  }
  if (bindingProjection.state === "AMBIGUOUS" || bindingProjection.binding === null) {
    return { projection: null, reason: "MARKET_BINDING_AMBIGUOUS", warnings };
  }

  const binding = bindingProjection.binding;
  if (!isNonEmptyString(binding.market_id)) {
    return { projection: null, reason: "CANONICAL_MARKET_ID_MISSING", warnings };
  }

  const venue = venueFromProvider(binding.provider);
  if (venue === null) {
    return { projection: null, reason: "MARKET_VENUE_UNMAPPED", warnings };
  }
  if (!isNonEmptyString(binding.external_market_id)) {
    return { projection: null, reason: "EXTERNAL_MARKET_ID_UNRESOLVED", warnings };
  }
  if (!observation) {
    return { projection: null, reason: "VENUE_OBSERVATION_NOT_SUPPLIED", warnings };
  }
  if (observation.venue !== venue) {
    return { projection: null, reason: "VENUE_MISMATCH", warnings };
  }
  if (observation.market.venue_market_id !== binding.external_market_id) {
    return { projection: null, reason: "VENUE_MARKET_ID_MISMATCH", warnings };
  }
  if (!projectionIdentityComplete(observation.event, observation.market)) {
    return { projection: null, reason: "VENUE_OBSERVATION_INCOMPLETE", warnings };
  }
  if (!Array.isArray(observation.outcomes) || observation.outcomes.length === 0) {
    return { projection: null, reason: "VENUE_OUTCOMES_MISSING", warnings };
  }

  const projection: PredictionMarketReadProjectionV1 = {
    contract_version: PREDICTION_MARKET_READ_VERSION,
    venue,
    event: {
      venue_event_id: observation.event.venue_event_id,
      slug: observation.event.slug,
      title: observation.event.title,
    },
    market: {
      venue_market_id: observation.market.venue_market_id,
      slug: observation.market.slug,
      question: observation.market.question,
      condition_id: observation.market.condition_id,
      market_version: observation.market.market_version,
      market_state: observation.market.market_state,
      resolution_state: observation.market.resolution_state,
      end_date: observation.market.end_date,
    },
    outcomes: observation.outcomes.map((outcome) => ({ ...outcome })),
    quote: observation.quote ? { ...observation.quote } : null,
    evidence: observation.evidence.map((ref) => ({ ...ref })),
    freshness: { ...observation.freshness },
    source_version: observation.source_version,
    ownership_label: "NOT_APPLICABLE",
  };

  if (observation.freshness.state !== "FRESH") {
    warnings.push(`VENUE_FRESHNESS_${observation.freshness.state}`);
  }
  return { projection, reason: null, warnings };
}

interface ImpliedProbabilityResult {
  probability: MarketImpliedProbabilityV1 | null;
  warnings: string[];
}

function buildImpliedProbability(
  bindingProjection: MarketBindingProjectionV1,
): ImpliedProbabilityResult {
  const warnings: string[] = [];
  if (bindingProjection.state !== "BOUND" || bindingProjection.binding === null) {
    return { probability: null, warnings };
  }
  const binding = bindingProjection.binding;
  if (binding.probability === null || binding.probability_basis === "missing") {
    return { probability: null, warnings };
  }
  if (
    !Number.isFinite(binding.probability) ||
    binding.probability < 0 ||
    binding.probability > 100
  ) {
    warnings.push("MARKET_PROBABILITY_OUT_OF_RANGE");
    return { probability: null, warnings };
  }
  if (binding.as_of === null) {
    warnings.push("MARKET_PROBABILITY_AS_OF_MISSING");
  }

  return {
    probability: {
      value: binding.probability / 100,
      basis: binding.probability_basis,
      as_of: binding.as_of,
      source: `market_binding:${binding.provider ?? "unknown"}`,
    },
    warnings,
  };
}

function buildEvidenceBundleProjection(
  bundle: PredictionEvidenceBundleV1 | null | undefined,
  bindingProjection: MarketBindingProjectionV1,
): { projection: PredictionEvidenceBundleProjectionV1; warnings: string[] } {
  if (!bundle) {
    return {
      projection: {
        state: "NOT_SUPPLIED",
        as_of: null,
        source_version: null,
        items: [],
        reason: "PREDICTION_EVIDENCE_BUNDLE_NOT_SUPPLIED",
      },
      warnings: [],
    };
  }

  const binding = bindingProjection.binding;
  const bindingMarketId = binding?.market_id ?? null;
  if (!isNonEmptyString(bindingMarketId)) {
    return {
      projection: {
        state: "UNBOUND",
        as_of: bundle.as_of,
        source_version: bundle.source_version,
        items: [],
        reason: "EVIDENCE_BUNDLE_WITHOUT_MARKET_BINDING",
      },
      warnings: ["EVIDENCE_BUNDLE_WITHOUT_MARKET_BINDING"],
    };
  }
  if (
    isNonEmptyString(bundle.market_id) &&
    bindingMarketId !== bundle.market_id
  ) {
    return {
      projection: {
        state: "MISMATCHED_MARKET",
        as_of: bundle.as_of,
        source_version: bundle.source_version,
        items: [],
        reason: "EVIDENCE_BUNDLE_MARKET_ID_MISMATCH",
      },
      warnings: ["EVIDENCE_BUNDLE_MARKET_ID_MISMATCH"],
    };
  }

  const warnings = [...(bundle.warnings ?? [])];
  const items: PredictionEvidenceBundleItemV1[] = [];
  let dropped = 0;
  for (const item of bundle.items ?? []) {
    if (!isNonEmptyString(item?.evidence_id)) {
      dropped += 1;
      continue;
    }
    items.push({
      evidence_id: item.evidence_id,
      kind: isNonEmptyString(item.kind) ? item.kind : "UNKNOWN",
      url: isNonEmptyString(item.url) ? item.url : null,
      observed_at: isInstant(item.observed_at) ? item.observed_at : null,
      source_version: isNonEmptyString(item.source_version)
        ? item.source_version
        : "UNKNOWN",
    });
  }
  if (dropped > 0) warnings.push(`EVIDENCE_BUNDLE_ITEMS_DROPPED:${dropped}`);
  if (!isInstant(bundle.as_of)) warnings.push("EVIDENCE_BUNDLE_AS_OF_MISSING");

  return {
    projection: {
      state: "SUPPLIED",
      as_of: isInstant(bundle.as_of) ? bundle.as_of : null,
      source_version: isNonEmptyString(bundle.source_version)
        ? bundle.source_version
        : null,
      items,
      reason: items.length === 0 ? "EVIDENCE_BUNDLE_EMPTY" : null,
    },
    warnings,
  };
}

function buildCitations(
  detail: EventDetailRead,
  projection: PredictionMarketReadProjectionV1 | null,
  observation: VenueMarketObservationV1 | null | undefined,
  bundle: PredictionEvidenceBundleProjectionV1,
): PredictionCitationV1[] {
  const citations: PredictionCitationV1[] = [];
  const seen = new Set<string>();

  const push = (citation: PredictionCitationV1): void => {
    const key = `${citation.kind}|${citation.evidence_id ?? ""}|${citation.evidence_ref_id}|${citation.url ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    citations.push(citation);
  };

  for (const ref of detail.evidence as EvidenceRefRead[]) {
    push({
      evidence_id: ref.evidence_id,
      evidence_ref_id: ref.evidence_ref_id,
      kind: "RADIANT_EVIDENCE",
      url: ref.canonical_url,
      observed_at: ref.observed_at ?? ref.published_at,
      source_version: detail.method_version,
    });
  }

  if (projection && observation) {
    push({
      evidence_id: projection.market.venue_market_id,
      evidence_ref_id: `venue:${projection.venue}:${projection.market.venue_market_id}`,
      kind: "VENUE_MARKET",
      url: observation.evidence.find((ref) => ref.kind === "VENUE_MARKET")?.url ?? null,
      observed_at: observation.quote?.as_of ?? observation.freshness.observed_at,
      source_version: observation.source_version,
    });
  }

  for (const item of bundle.items) {
    push({
      evidence_id: item.evidence_id,
      evidence_ref_id: `bundle:${item.evidence_id}`,
      kind: "PREDICTION_EVIDENCE_BUNDLE",
      url: item.url,
      observed_at: item.observed_at,
      source_version: item.source_version,
    });
  }

  return citations;
}

function buildFreshness(
  detail: EventDetailRead,
  asOf: string | null,
  now: string,
  staleAfterSeconds: number,
): PredictionIntelligenceFreshnessV1 {
  if (asOf === null || !isInstant(asOf)) {
    return {
      state: "UNAVAILABLE",
      as_of: null,
      age_seconds: null,
      stale_after_seconds: staleAfterSeconds,
      reason: asOf === null ? "AS_OF_MISSING" : "AS_OF_INVALID",
    };
  }

  const ageSeconds = (Date.parse(now) - Date.parse(asOf)) / 1000;
  if (detail.quality.status === "unavailable" || detail.quality.status === "insufficient_data") {
    return {
      state: "UNAVAILABLE",
      as_of: asOf,
      age_seconds: ageSeconds,
      stale_after_seconds: staleAfterSeconds,
      reason: "QUALITY_INSUFFICIENT_DATA",
    };
  }
  if (ageSeconds < 0) {
    return {
      state: "PARTIAL",
      as_of: asOf,
      age_seconds: ageSeconds,
      stale_after_seconds: staleAfterSeconds,
      reason: "AS_OF_IN_FUTURE",
    };
  }
  if (ageSeconds > staleAfterSeconds) {
    return {
      state: "STALE",
      as_of: asOf,
      age_seconds: ageSeconds,
      stale_after_seconds: staleAfterSeconds,
      reason: "AGE_EXCEEDS_STALE_AFTER",
    };
  }
  if (detail.quality.status === "partial") {
    return {
      state: "PARTIAL",
      as_of: asOf,
      age_seconds: ageSeconds,
      stale_after_seconds: staleAfterSeconds,
      reason: "QUALITY_PARTIAL",
    };
  }

  return {
    state: "FRESH",
    as_of: asOf,
    age_seconds: ageSeconds,
    stale_after_seconds: staleAfterSeconds,
    reason: null,
  };
}

function resolveRevisionSet(input: {
  event: EventDetailRead;
  toRevision: EventDetailRead | null | undefined;
}): { latest: EventDetailRead; revisions: PredictionRevisionSetV1; warnings: string[] } {
  const { event } = input;
  const warnings: string[] = [];
  const toRevision = input.toRevision ?? null;

  if (!toRevision) {
    return {
      latest: event,
      revisions: {
        from: revisionRef(event),
        to: null,
        diff: null,
        diff_reason: "SINGLE_REVISION",
      },
      warnings,
    };
  }

  const comparableTarget =
    toRevision.event_ref === event.event_ref &&
    toRevision.revision_number > event.revision_number;

  if (!comparableTarget) {
    warnings.push("REVISION_TARGET_REJECTED");
    return {
      latest: event,
      revisions: {
        from: revisionRef(event),
        to: null,
        diff: null,
        diff_reason: "REVISION_TARGET_REJECTED",
      },
      warnings,
    };
  }

  const diff: RevisionDiffRead = compareEventRevisions(event, toRevision);
  if (!diff.comparable) {
    warnings.push(`REVISION_DIFF_NOT_COMPARABLE:${diff.reason ?? "unknown"}`);
  }

  return {
    latest: toRevision,
    revisions: {
      from: revisionRef(event),
      to: revisionRef(toRevision),
      diff,
      diff_reason: diff.comparable ? null : (diff.reason ?? "not_comparable"),
    },
    warnings,
  };
}

function validateCanonicalModelOutput(
  output: CanonicalModelOutputV1 | null | undefined,
): {
  probability: number | null;
  provenance: ModelProbabilityProvenanceV1 | null;
  reason: string | null;
  warnings: string[];
} {
  if (!output) {
    return {
      probability: null,
      provenance: null,
      reason: "NO_CANONICAL_MODEL_OUTPUT",
      warnings: [],
    };
  }

  const valid =
    typeof output.probability === "number" &&
    Number.isFinite(output.probability) &&
    output.probability >= 0 &&
    output.probability <= 1 &&
    isInstant(output.as_of) &&
    isNonEmptyString(output.source_version) &&
    isNonEmptyString(output.evidence_id) &&
    isNonEmptyString(output.model_id);

  if (!valid) {
    return {
      probability: null,
      provenance: null,
      reason: "INVALID_CANONICAL_MODEL_OUTPUT",
      warnings: ["INVALID_CANONICAL_MODEL_OUTPUT"],
    };
  }

  return {
    probability: output.probability,
    provenance: {
      model_id: output.model_id,
      evidence_id: output.evidence_id,
      as_of: output.as_of,
      source_version: output.source_version,
    },
    reason: null,
    warnings: [],
  };
}

/**
 * Compose one market-facing intelligence card from the read model.
 * The function is pure apart from the injectable `now` clock.
 */
export function composePredictionIntelligence(
  input: PredictionIntelligenceInputV1,
): PredictionIntelligenceCardV1 {
  if (!input?.event) {
    throw new TypeError("composePredictionIntelligence requires an event detail read");
  }

  const now = input.now ?? new Date().toISOString();
  if (!isInstant(now)) {
    throw new RangeError("now must be an ISO-8601 instant with an explicit timezone");
  }
  const staleAfterSeconds = input.stale_after_seconds ?? DEFAULT_STALE_AFTER_SECONDS;
  if (!Number.isFinite(staleAfterSeconds) || staleAfterSeconds <= 0) {
    throw new RangeError("stale_after_seconds must be a positive number");
  }

  const { latest, revisions, warnings: revisionWarnings } = resolveRevisionSet({
    event: input.event,
    toRevision: input.toRevision,
  });

  const requestedAsOf = input.as_of ?? latest.as_of ?? latest.observed_at ?? null;
  const asOf = isInstant(requestedAsOf) ? requestedAsOf : null;
  const freshnessWarnings: string[] = [];
  if (requestedAsOf !== null && asOf === null) freshnessWarnings.push("AS_OF_INVALID");

  const timeline =
    asOf !== null
      ? buildEvidenceTimeline(latest, { as_of: asOf })
      : buildEvidenceTimeline(latest);

  const bindingProjection = selectMarketBinding(latest);
  const projectionResult = buildMarketProjection(
    bindingProjection,
    input.marketObservation,
  );
  const impliedResult = buildImpliedProbability(bindingProjection);
  const bundleResult = buildEvidenceBundleProjection(input.evidenceBundle, bindingProjection);
  const model = validateCanonicalModelOutput(input.canonicalModelOutput);

  const citations = buildCitations(
    latest,
    projectionResult.projection,
    input.marketObservation,
    bundleResult.projection,
  );

  const freshness = buildFreshness(
    latest,
    asOf,
    now,
    staleAfterSeconds,
  );

  const unknowns = uniquePreserve([
    ...latest.explanation.unknowns,
    ...(bindingProjection.state === "MISSING"
      ? ["No prediction-market binding is present; no market identity is inferred."]
      : []),
    ...(bindingProjection.state === "AMBIGUOUS"
      ? ["The prediction-market binding is ambiguous; no market identity is selected."]
      : []),
    ...(bindingProjection.state === "BOUND" && impliedResult.probability === null
      ? ["Market-implied probability is not available for the bound market."]
      : []),
    ...(model.probability === null
      ? ["No canonical model output with provenance was supplied; model probability is null."]
      : []),
    ...(projectionResult.projection === null
      ? [`Market read projection is unavailable: ${projectionResult.reason ?? "UNKNOWN"}.`]
      : []),
    ...(bundleResult.projection.state !== "SUPPLIED"
      ? [
          `Prediction evidence bundle: ${bundleResult.projection.reason ?? bundleResult.projection.state}.`,
        ]
      : []),
    ...(revisions.diff === null ? ["No T0/T1 revision diff was produced."] : []),
  ]);

  const warnings = uniqueSorted([
    ...latest.warnings,
    ...timeline.quality.warnings,
    ...revisionWarnings,
    ...freshnessWarnings,
    ...projectionResult.warnings,
    ...impliedResult.warnings,
    ...bundleResult.warnings,
    ...model.warnings,
    ...(bindingProjection.state !== "BOUND"
      ? [`MARKET_BINDING_${bindingProjection.state}`]
      : []),
    ...(revisions.diff !== null && !revisions.diff.comparable
      ? [`REVISION_DIFF_NOT_COMPARABLE:${revisions.diff.reason ?? "unknown"}`]
      : []),
  ]);

  return {
    contract_version: PREDICTION_INTELLIGENCE_VERSION,
    as_of: asOf,
    event: latest,
    revisions,
    evidence_timeline: timeline,
    market_binding: bindingProjection,
    market_projection: projectionResult.projection,
    market_projection_reason: projectionResult.reason,
    market_implied_probability: impliedResult.probability,
    model_probability: model.probability,
    model_probability_reason: model.reason,
    model_probability_provenance: model.provenance,
    citations,
    freshness,
    unknowns,
    warnings,
    source_version:
      input.source_version ??
      `${PREDICTION_INTELLIGENCE_VERSION}+${latest.schema_version}`,
    evidence_bundle: bundleResult.projection,
  };
}
