/* ═══════════════════════════════════════════════════════════════
   RADIANT read model — builders
   Pure functions. Nothing here writes, persists or forecasts.
   ═══════════════════════════════════════════════════════════════ */

import type {
  EventDetailRead,
  EventRevisionInput,
  EvidenceExplanationRead,
  EvidenceRefRead,
  EvidenceTimelineItem,
  EvidenceTimelineRead,
  QualityEnvelope,
  RevisionDiffRead,
  RevisionEvidenceChange,
  RevisionFieldChange,
} from "./types";
import {
  ReadModelError,
  validateInstant,
  validateRevisionIdentity,
  validateValidTime,
} from "./validate";

const SCHEMA_VERSION = "ratex.radiant.read/v1";

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function jsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((value, index) => jsonEqual(value, b[index]));
  }
  if (typeof a === "object" && typeof b === "object") {
    const aRecord = a as Record<string, unknown>;
    const bRecord = b as Record<string, unknown>;
    const aKeys = Object.keys(aRecord).sort();
    const bKeys = Object.keys(bRecord).sort();
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key, index) => key === bKeys[index] && jsonEqual(aRecord[key], bRecord[key]));
  }
  return false;
}

function evidenceKey(ref: EvidenceRefRead): string {
  return ref.evidence_ref_id;
}

function computeQuality(
  input: EventRevisionInput,
  idAuthority: EventDetailRead["id_authority"],
): QualityEnvelope {
  const warnings = new Set(input.warnings ?? []);
  const evidence = input.evidence;
  const observedAt = input.observed_at;

  if (evidence.length === 0) warnings.add("evidence_missing");
  if (observedAt === null) warnings.add("observed_time_missing");
  if (evidence.some((ref) => ref.identity_status !== "resolved")) {
    warnings.add("evidence_identity_incomplete");
  }
  if (input.market_bindings?.some((binding) => binding.ambiguity.ambiguous)) {
    warnings.add("market_binding_ambiguous");
  }
  if (input.market_bindings?.some((binding) => binding.quality_warnings.length > 0)) {
    warnings.add("market_binding_quality_incomplete");
  }
  if (input.relations?.some((relation) => relation.evidence_ref_ids.length === 0)) {
    warnings.add("relation_evidence_missing");
  }
  if (idAuthority === "canonical" && !input.content_digest) {
    warnings.add("content_digest_missing");
  }
  if (input.event_type === undefined || input.event_type === "UNKNOWN") {
    warnings.add("event_type_unclassified");
  }

  const missingSources = uniqueSorted(
    evidence
      .filter((ref) => ref.identity_status !== "resolved")
      .map((ref) => ref.source_id ?? ref.canonical_url ?? ref.evidence_ref_id),
  );
  if (evidence.length === 0) missingSources.push("evidence");

  const provenanceComplete =
    evidence.length > 0 &&
    evidence.every((ref) => ref.identity_status === "resolved") &&
    observedAt !== null;

  let status: QualityEnvelope["status"];
  if (evidence.length === 0) status = "insufficient_data";
  else if (!provenanceComplete || warnings.size > 0) status = "partial";
  else status = "preview";

  return {
    status,
    as_of: input.as_of ?? observedAt,
    missing_sources: uniqueSorted(missingSources),
    warnings: [...warnings].sort((a, b) => a.localeCompare(b)),
    provenance_complete: provenanceComplete,
  };
}

function buildExplanation(
  input: EventRevisionInput,
  quality: QualityEnvelope,
): EvidenceExplanationRead {
  const evidenceRefIds = input.evidence.map((ref) => ref.evidence_ref_id);
  const claims =
    input.claims && input.claims.length > 0
      ? input.claims.map((claim) => ({
          statement: claim.statement,
          evidence_ref_ids: [...claim.evidence_ref_ids],
          epistemic_status: claim.epistemic_status,
        }))
      : evidenceRefIds.length > 0
        ? [
            {
              statement: input.title,
              evidence_ref_ids: evidenceRefIds,
              epistemic_status: input.epistemic_status,
            },
          ]
        : [];

  const unknowns: string[] = [];
  if (input.evidence.length === 0) {
    unknowns.push("No evidence references are attached to this revision.");
  }
  if (input.observed_at === null) {
    unknowns.push("The observation time is not recorded; ingestion time is not substituted.");
  }
  if (input.evidence.some((ref) => ref.identity_status !== "resolved")) {
    unknowns.push("At least one evidence source identity is unresolved.");
  }
  if (quality.missing_sources.includes("evidence")) {
    unknowns.push("Evidence is missing, so no claim may be presented as observed.");
  }
  if (input.market_bindings?.some((binding) => binding.ambiguity.ambiguous)) {
    unknowns.push("The prediction-market binding is ambiguous and is not resolved by this read.");
  }
  unknowns.push("No calibrated forecast is produced by this read model.");

  return {
    evidence_only: true,
    probability: null,
    forecast: null,
    causality: "not_asserted",
    claims,
    unknowns,
  };
}

/** Build one immutable event-detail read. Never persists or forecasts. */
export function buildEventDetail(input: EventRevisionInput): EventDetailRead {
  const idAuthority: EventDetailRead["id_authority"] =
    input.id_authority ?? (input.event_id ? "canonical" : "prototype_compatibility");

  if (idAuthority === "canonical") {
    if (!input.event_id || input.event_id.trim().length === 0) {
      throw new ReadModelError("invalid_revision", "canonical reads require event_id");
    }
    if (input.observed_at === null) {
      throw new ReadModelError("observed_at_required", "canonical reads require observed_at");
    }
  }

  validateRevisionIdentity({
    revision_number: input.revision_number,
    supersedes_revision_id: input.supersedes_revision_id ?? null,
    revision_id: input.revision_id,
  });
  const validTime = validateValidTime(input.valid_time);
  if (input.observed_at !== null) validateInstant(input.observed_at, "observed_at");
  if (input.last_observed_at) validateInstant(input.last_observed_at, "last_observed_at");
  if (input.as_of) validateInstant(input.as_of, "as_of");
  if (
    input.observed_at !== null &&
    input.last_observed_at &&
    Date.parse(input.last_observed_at) < Date.parse(input.observed_at)
  ) {
    throw new ReadModelError(
      "invalid_revision",
      "last_observed_at must not precede observed_at",
    );
  }

  const evidence = input.evidence.map((ref) => ({ ...ref }));
  const evidenceIds = new Set<string>();
  for (const ref of evidence) {
    if (ref.evidence_ref_id.trim().length === 0) {
      throw new ReadModelError("invalid_revision", "evidence_ref_id must be non-empty");
    }
    if (evidenceIds.has(evidenceKey(ref))) {
      throw new ReadModelError(
        "duplicate_evidence_ref",
        `duplicate evidence_ref_id: ${ref.evidence_ref_id}`,
      );
    }
    evidenceIds.add(evidenceKey(ref));
    if (ref.published_at) validateInstant(ref.published_at, "evidence.published_at");
    if (ref.observed_at) validateInstant(ref.observed_at, "evidence.observed_at");
    if (ref.identity_status === "resolved" && (!ref.evidence_id || !ref.source_id)) {
      throw new ReadModelError(
        "invalid_revision",
        `resolved evidence ${ref.evidence_ref_id} requires evidence_id and source_id`,
      );
    }
  }

  const relationIds = new Set<string>();
  const relations = (input.relations ?? []).map((relation) => {
    if (relationIds.has(relation.relation_id)) {
      throw new ReadModelError(
        "duplicate_relation_id",
        `duplicate relation_id: ${relation.relation_id}`,
      );
    }
    relationIds.add(relation.relation_id);
    if (relation.valid_from) validateInstant(relation.valid_from, "relation.valid_from");
    if (relation.valid_to) validateInstant(relation.valid_to, "relation.valid_to");
    return {
      ...relation,
      evidence_ref_ids: [...relation.evidence_ref_ids],
    };
  });

  const marketBindings = (input.market_bindings ?? []).map((binding) => ({
    ...binding,
    outcomes: binding.outcomes.map((outcome) => ({ ...outcome })),
    ambiguity: {
      ambiguous: binding.ambiguity.ambiguous,
      reasons: [...binding.ambiguity.reasons],
    },
  }));

  const quality = computeQuality(input, idAuthority);
  const normalizedInput: EventRevisionInput = {
    ...input,
    valid_time: validTime,
    evidence,
    relations,
    market_bindings: marketBindings,
    supersedes_revision_id: input.supersedes_revision_id ?? null,
    last_observed_at: input.last_observed_at ?? null,
    content_digest: input.content_digest ?? null,
    as_of: input.as_of ?? quality.as_of,
  };

  return {
    event_ref: input.event_ref,
    event_id: input.event_id ?? null,
    id_authority: idAuthority,
    lifecycle_status: input.lifecycle_status ?? "unknown",
    revision_id: input.revision_id,
    revision_number: input.revision_number,
    supersedes_revision_id: input.supersedes_revision_id ?? null,
    title: input.title,
    summary: input.summary,
    event_type: input.event_type ?? "UNKNOWN",
    epistemic_status: input.epistemic_status,
    valid_time: validTime,
    observed_at: input.observed_at,
    last_observed_at: input.last_observed_at ?? null,
    evidence,
    entity_ids: uniqueSorted(input.entity_ids ?? []),
    narrative_ids: uniqueSorted(input.narrative_ids ?? []),
    country_codes: uniqueSorted(input.country_codes ?? []),
    requires_verification: input.requires_verification ?? true,
    quality,
    as_of: quality.as_of,
    schema_version: SCHEMA_VERSION,
    method_version: input.method_version ?? "UNKNOWN",
    content_digest: input.content_digest ?? null,
    market_bindings: marketBindings,
    relations,
    forecast: null,
    explanation: buildExplanation(normalizedInput, quality),
    warnings: [...quality.warnings],
  };
}

function timelineTime(ref: EvidenceRefRead): { value: string | null; basis: EvidenceTimelineItem["time_basis"] } {
  if (ref.published_at) return { value: ref.published_at, basis: "published_at" };
  if (ref.observed_at) return { value: ref.observed_at, basis: "observed_at" };
  return { value: null, basis: "none" };
}

/** Ordered evidence timeline. Optionally bounded by an `as_of` instant. */
export function buildEvidenceTimeline(
  detail: EventDetailRead,
  options: { as_of?: string | null } = {},
): EvidenceTimelineRead {
  const asOf = options.as_of ?? detail.as_of;
  if (asOf) validateInstant(asOf, "timeline.as_of");

  const warnings = new Set(detail.quality.warnings);
  let excluded = 0;
  let undated = 0;

  const rows = detail.evidence
    .map((evidence) => {
      const time = timelineTime(evidence);
      if (time.value === null) undated += 1;
      return { evidence, ...time };
    })
    .filter((row) => {
      if (asOf && row.value !== null && Date.parse(row.value) > Date.parse(asOf)) {
        excluded += 1;
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.value === null && b.value === null) {
        return a.evidence.evidence_ref_id.localeCompare(b.evidence.evidence_ref_id);
      }
      if (a.value === null) return 1;
      if (b.value === null) return -1;
      const delta = Date.parse(a.value) - Date.parse(b.value);
      if (delta !== 0) return delta;
      return a.evidence.evidence_ref_id.localeCompare(b.evidence.evidence_ref_id);
    });

  if (rows.length === 0) warnings.add("timeline_empty");
  if (undated > 0) warnings.add("undated_evidence_included");
  if (excluded > 0) warnings.add("timeline_bounded_by_as_of");

  const items: EvidenceTimelineItem[] = rows.map((row, index) => ({
    sequence: index + 1,
    evidence: { ...row.evidence },
    display_time: row.value,
    time_basis: row.basis,
    label:
      row.evidence.source_id ??
      row.evidence.canonical_url ??
      row.evidence.evidence_id ??
      row.evidence.evidence_ref_id,
  }));

  const status: QualityEnvelope["status"] =
    items.length === 0 && detail.quality.status !== "unavailable"
      ? "insufficient_data"
      : detail.quality.status;

  return {
    event_ref: detail.event_ref,
    revision_id: detail.revision_id,
    revision_number: detail.revision_number,
    as_of: asOf ?? null,
    items,
    quality: {
      ...detail.quality,
      status,
      warnings: [...warnings].sort((a, b) => a.localeCompare(b)),
      missing_sources:
        items.length === 0 ? uniqueSorted([...detail.quality.missing_sources, "evidence"]) : detail.quality.missing_sources,
    },
    forecast: null,
  };
}

const COMPARED_FIELDS = [
  "title",
  "summary",
  "event_type",
  "epistemic_status",
  "valid_time",
  "lifecycle_status",
  "requires_verification",
  "entity_ids",
  "narrative_ids",
  "country_codes",
  "market_bindings",
  "relations",
] as const;

function fieldSummary(field: string, from: EventDetailRead, to: EventDetailRead): string {
  switch (field) {
    case "title":
      return `Title changed: "${from.title}" → "${to.title}".`;
    case "valid_time":
      return `Valid time changed (${from.valid_time.precision} → ${to.valid_time.precision}).`;
    case "epistemic_status":
      return `Epistemic status changed (${from.epistemic_status} → ${to.epistemic_status}).`;
    case "market_bindings":
      return "Prediction-market binding changed.";
    case "relations":
      return "Event relations changed.";
    case "entity_ids":
      return "Entity references changed.";
    case "narrative_ids":
      return "Narrative references changed.";
    default:
      return `${field} changed.`;
  }
}

/**
 * Compare two revisions of the same event.
 * Cross-event comparison is refused rather than approximated.
 */
export function compareEventRevisions(
  from: EventDetailRead,
  to: EventDetailRead,
): RevisionDiffRead {
  const base = {
    event_ref: from.event_ref,
    from_revision: from.revision_number,
    to_revision: to.revision_number,
    changed_fields: [] as RevisionFieldChange[],
    added_evidence: [] as EvidenceRefRead[],
    removed_evidence: [] as EvidenceRefRead[],
    changed_evidence: [] as RevisionEvidenceChange[],
    unchanged_fields: [] as string[],
    forecast: null,
  } as const;

  if (from.event_ref !== to.event_ref) {
    return {
      ...base,
      comparable: false,
      reason: "different_event",
      summary: ["Cannot compare revisions of different events."],
    };
  }
  if (to.revision_number <= from.revision_number) {
    return {
      ...base,
      comparable: false,
      reason: "revision_order",
      summary: ["The target revision must be newer than the source revision."],
    };
  }

  const changedFields: RevisionFieldChange[] = [];
  const unchangedFields: string[] = [];
  const summary: string[] = [];

  if (to.supersedes_revision_id !== from.revision_id) {
    summary.push("Compared revisions are not direct successors.");
  }

  for (const field of COMPARED_FIELDS) {
    const fromValue = from[field];
    const toValue = to[field];
    if (jsonEqual(fromValue, toValue)) {
      unchangedFields.push(field);
    } else {
      changedFields.push({ field, from: fromValue, to: toValue });
      summary.push(fieldSummary(field, from, to));
    }
  }

  const fromEvidence = new Map(from.evidence.map((ref) => [ref.evidence_ref_id, ref]));
  const toEvidence = new Map(to.evidence.map((ref) => [ref.evidence_ref_id, ref]));
  const added: EvidenceRefRead[] = [];
  const removed: EvidenceRefRead[] = [];
  const changed: RevisionEvidenceChange[] = [];

  for (const [id, ref] of toEvidence) {
    if (!fromEvidence.has(id)) added.push({ ...ref });
  }
  for (const [id, ref] of fromEvidence) {
    const next = toEvidence.get(id);
    if (!next) removed.push({ ...ref });
    else if (!jsonEqual(ref, next)) changed.push({ evidence_ref_id: id, from: { ...ref }, to: { ...next } });
  }
  added.sort((a, b) => a.evidence_ref_id.localeCompare(b.evidence_ref_id));
  removed.sort((a, b) => a.evidence_ref_id.localeCompare(b.evidence_ref_id));
  changed.sort((a, b) => a.evidence_ref_id.localeCompare(b.evidence_ref_id));

  if (added.length > 0) summary.push(`Evidence added: ${added.length}.`);
  if (removed.length > 0) summary.push(`Evidence removed: ${removed.length}.`);
  if (changed.length > 0) summary.push(`Evidence updated: ${changed.length}.`);

  const contradictingAdded = added.filter((ref) => ref.relation_type === "contradicts").length;
  if (contradictingAdded > 0) {
    summary.push(`Contradicting evidence added: ${contradictingAdded}.`);
  }
  if (to.evidence.length === 0) {
    summary.push("The target revision has no evidence and cannot be presented as observed.");
  }
  if (summary.length === 0) {
    summary.push("No semantic change detected between the two revisions.");
  }

  return {
    event_ref: from.event_ref,
    from_revision: from.revision_number,
    to_revision: to.revision_number,
    comparable: true,
    reason: null,
    changed_fields: changedFields,
    added_evidence: added,
    removed_evidence: removed,
    changed_evidence: changed,
    unchanged_fields: unchangedFields,
    summary,
    forecast: null,
  };
}
