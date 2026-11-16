/* ═══════════════════════════════════════════════════════════════
   RADIANT read model — prototype compatibility adapter
   Reads the existing JSON-map shape without treating it as truth.
   ═══════════════════════════════════════════════════════════════ */

import type {
  EventDetailRead,
  EvidenceRefRead,
  MarketBindingRead,
  MarketOutcomeRead,
  PrototypeMap,
  PrototypeMapNode,
  RelationRead,
  ValidTime,
} from "./types";
import { buildEventDetail } from "./build";
import { ReadModelError, isTimezoneAwareInstant } from "./validate";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const NAIVE_INSTANT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;

function eventRef(map: PrototypeMap, nodeId: string): string {
  return `prototype:${map.id}:${nodeId}`;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeInstant(value: unknown): string | null {
  return typeof value === "string" && isTimezoneAwareInstant(value) ? value : null;
}

function validTimeFromNode(node: PrototypeMapNode): { validTime: ValidTime; warnings: string[] } {
  const warnings: string[] = [];
  const timestamp = typeof node.timestamp === "string" ? node.timestamp : null;

  if (!timestamp) {
    return {
      validTime: {
        precision: "unknown",
        starts_at: null,
        ends_at: null,
        local_date: null,
        timezone: null,
      },
      warnings: ["valid_time_unknown"],
    };
  }

  if (DATE_RE.test(timestamp)) {
    return {
      validTime: {
        precision: "day",
        starts_at: null,
        ends_at: null,
        local_date: timestamp,
        timezone: null,
      },
      warnings: [],
    };
  }

  if (isTimezoneAwareInstant(timestamp)) {
    return {
      validTime: {
        precision: "exact",
        starts_at: timestamp,
        ends_at: null,
        local_date: null,
        timezone: timestamp.endsWith("Z") ? "UTC" : null,
      },
      warnings: timestamp.endsWith("Z") ? [] : ["timezone_not_iana"],
    };
  }

  if (NAIVE_INSTANT_RE.test(timestamp)) {
    warnings.push("timestamp_not_timezone_aware");
  } else {
    warnings.push("timestamp_unparseable");
  }
  return {
    validTime: {
      precision: "unknown",
      starts_at: null,
      ends_at: null,
      local_date: null,
      timezone: null,
    },
    warnings,
  };
}

function observedAtFromNode(
  node: PrototypeMapNode,
  warning: string,
): { value: string | null; warnings: string[] } {
  const value = typeof node.observed_at === "string" ? node.observed_at : null;
  if (!value) return { value: null, warnings: [] };
  if (!isTimezoneAwareInstant(value)) return { value: null, warnings: [warning] };
  return { value, warnings: [] };
}

function evidenceFromNode(map: PrototypeMap, node: PrototypeMapNode): EvidenceRefRead[] {
  if (Array.isArray(node.evidence) && node.evidence.length > 0) {
    return node.evidence.map((ref, index) => ({
      evidence_ref_id:
        ref.evidence_ref_id ?? `prototype:${map.id}:${node.id}:evidence:${index + 1}`,
      evidence_id: ref.evidence_id ?? null,
      source_id: ref.source_id ?? null,
      canonical_url: ref.canonical_url ?? null,
      published_at: safeInstant(ref.published_at),
      observed_at: safeInstant(ref.observed_at),
      relation_type: ref.relation_type ?? "context",
      is_primary: ref.is_primary ?? index === 0,
      identity_status:
        ref.identity_status ??
        (ref.evidence_id && ref.source_id ? "resolved" : "prototype_only"),
    }));
  }

  if (typeof node.sourceUrl === "string" && node.sourceUrl.length > 0) {
    return [
      {
        evidence_ref_id: `prototype:${map.id}:${node.id}:source`,
        evidence_id: null,
        source_id: null,
        canonical_url: node.sourceUrl,
        published_at: null,
        observed_at: safeInstant(node.observed_at),
        relation_type: "context",
        is_primary: true,
        identity_status: "prototype_only",
      },
    ];
  }

  return [];
}

function nodeInstant(node: PrototypeMapNode): number | null {
  if (typeof node.timestamp !== "string" || !isTimezoneAwareInstant(node.timestamp)) return null;
  return Date.parse(node.timestamp);
}

function relationsFromNode(map: PrototypeMap, node: PrototypeMapNode): RelationRead[] {
  const parentIds = new Set<string>();
  for (const parent of node.from ?? []) parentIds.add(parent);
  for (const link of node.influenceLinks ?? []) parentIds.add(link.id);
  parentIds.delete(node.id);

  const nodeTime = nodeInstant(node);
  return [...parentIds]
    .sort((a, b) => a.localeCompare(b))
    .map((parentId) => {
      const parent = map.nodes.find((candidate) => candidate.id === parentId);
      const parentTime = parent ? nodeInstant(parent) : null;
      const ordered = parentTime !== null && nodeTime !== null && parentTime < nodeTime;
      const sameTime = parentTime !== null && nodeTime !== null && parentTime === nodeTime;
      const status = ordered ? "temporal" : "associated";
      return {
        relation_id: `prototype:${map.id}:${parentId}->${node.id}`,
        from_event_ref: eventRef(map, parentId),
        to_event_ref: eventRef(map, node.id),
        relation_type: ordered ? "FOLLOWS" : "ASSOCIATED_WITH",
        epistemic_status: status,
        valid_from: ordered ? (parent?.timestamp ?? null) : sameTime ? (parent?.timestamp ?? null) : null,
        valid_to: ordered || sameTime ? (node.timestamp ?? null) : null,
        evidence_ref_ids: [],
        assertion_revision: 1,
        assertion_source: ordered ? "derived_temporal" : "derived_association",
      };
    });
}

function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function outcomeFromPrototype(outcome: NonNullable<PrototypeMapNode["outcomes"]>[number]): MarketOutcomeRead {
  const probability = asNumber(outcome.polymarketProb);
  return {
    outcome_id: null,
    label: outcome.label ?? "UNKNOWN",
    probability,
    probability_basis: probability === null ? "missing" : "prototype_fixture",
    as_of: null,
  };
}

function bindingFromAnchor(
  node: PrototypeMapNode,
  siblings: PrototypeMapNode[],
): MarketBindingRead {
  const outcomes = (node.outcomes ?? []).map(outcomeFromPrototype);
  const question = node.marketQuestion ?? "";
  const identityReasons: string[] = [];
  const qualityWarnings: string[] = [];

  if (question.trim().length === 0) identityReasons.push("missing_question");
  if (!node.marketUrl && !node.marketSlug) identityReasons.push("missing_market_reference");
  if (!node.marketPlatform) identityReasons.push("missing_provider");
  if (!node.marketSlug) identityReasons.push("missing_external_market_id");
  const asOf = safeInstant(node.as_of);
  if (asOf === null) qualityWarnings.push("missing_as_of");

  const labels = outcomes.map((outcome) => outcome.label);
  if (labels.some((label) => label === "UNKNOWN")) identityReasons.push("outcome_label_missing");
  if (new Set(labels).size !== labels.length) identityReasons.push("duplicate_outcome_label");

  const knownProbabilities = outcomes
    .map((outcome) => outcome.probability)
    .filter((value): value is number => value !== null);
  if (knownProbabilities.some((value) => value < 0 || value > 100)) {
    qualityWarnings.push("outcome_probability_out_of_range");
  }
  if (knownProbabilities.length >= 2) {
    const total = knownProbabilities.reduce((sum, value) => sum + value, 0);
    if (Math.abs(total - 100) > 0.5) qualityWarnings.push("outcome_probability_sum_invalid");
  }

  const marketProbability = asNumber(node.marketProb);
  if (marketProbability !== null && (marketProbability < 0 || marketProbability > 100)) {
    qualityWarnings.push("market_probability_out_of_range");
  }
  const yes = outcomes.find((outcome) => outcome.label.toUpperCase() === "YES");
  const yesProbability = yes?.probability;
  if (
    marketProbability !== null &&
    typeof yesProbability === "number" &&
    Math.abs(marketProbability - yesProbability) > 0.5
  ) {
    qualityWarnings.push("probability_outcome_mismatch");
  }

  const normalized = normalizeQuestion(question);
  if (
    normalized.length > 0 &&
    siblings.filter((sibling) => normalizeQuestion(sibling.marketQuestion ?? "") === normalized).length > 1
  ) {
    identityReasons.push("duplicate_question_in_map");
  }

  return {
    market_id: null,
    provider: node.marketPlatform ?? null,
    external_market_id: node.marketSlug ?? null,
    question,
    canonical_url: node.marketUrl ?? null,
    closes_at: node.resolvesAt ?? null,
    resolved_at: null,
    resolution: null,
    outcomes,
    binding_type: "anchor",
    confidence: null,
    as_of: asOf,
    probability: marketProbability,
    probability_basis: marketProbability === null ? "missing" : "prototype_fixture",
    id_authority: node.marketSlug ? "prototype_compatibility" : "missing",
    ambiguity: {
      ambiguous: identityReasons.length > 0,
      reasons: [...new Set(identityReasons)].sort(),
    },
    quality_warnings: [...new Set(qualityWarnings)].sort(),
  };
}

/**
 * Find market anchors that reference an event through `from[]`,
 * `causalNodeIds[]` or `influenceLinks[]`. Never picks a winner.
 */
export function marketBindingsForEvent(
  map: PrototypeMap,
  eventId: string,
): MarketBindingRead[] {
  const anchors = map.nodes.filter(
    (node) =>
      node.nodeType === "anchor" &&
      ((node.from ?? []).includes(eventId) ||
        (node.causalNodeIds ?? []).includes(eventId) ||
        (node.influenceLinks ?? []).some((link) => link.id === eventId)),
  );

  const bindings = anchors.map((anchor) => bindingFromAnchor(anchor, anchors));
  if (bindings.length > 1) {
    for (const binding of bindings) {
      binding.ambiguity.reasons = [...new Set([...binding.ambiguity.reasons, "multiple_market_bindings"])].sort();
      binding.ambiguity.ambiguous = true;
    }
  }
  return bindings;
}

/**
 * Build an event-detail read from a prototype map node.
 * Anchors and scenarios are rejected: they are not Events.
 */
export function eventFromPrototypeMap(
  map: PrototypeMap,
  nodeId: string,
): EventDetailRead {
  const node = map.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) {
    throw new ReadModelError("node_not_found", `node not found in map ${map.id}: ${nodeId}`);
  }
  if (node.nodeType === "anchor") {
    throw new ReadModelError(
      "market_anchor_is_not_event",
      "a prediction-market anchor is not an Event",
    );
  }
  if (node.nodeType === "scenario") {
    throw new ReadModelError("scenario_is_not_event", "a scenario is not an Event");
  }

  const time = validTimeFromNode(node);
  const observed = observedAtFromNode(node, "observed_at_not_timezone_aware");
  const lastObserved = observedAtFromNode(node, "last_observed_at_not_timezone_aware");
  const evidence = evidenceFromNode(map, node);
  const relations = relationsFromNode(map, node);
  const marketBindings = marketBindingsForEvent(map, node.id);

  const warnings = [
    "prototype_compatibility",
    ...time.warnings,
    ...observed.warnings,
    ...lastObserved.warnings,
  ];
  if (evidence.length === 0) warnings.push("observed_requires_evidence");
  if (marketBindings.length > 1) warnings.push("multiple_market_bindings");

  return buildEventDetail({
    event_ref: eventRef(map, node.id),
    event_id: null,
    id_authority: "prototype_compatibility",
    lifecycle_status: "active",
    revision_id: `${eventRef(map, node.id)}@r1`,
    revision_number: 1,
    supersedes_revision_id: null,
    title: node.label ?? node.id,
    summary: node.desc ?? "",
    event_type: "UNKNOWN",
    epistemic_status: "observed",
    valid_time: time.validTime,
    observed_at: observed.value,
    last_observed_at: lastObserved.value,
    evidence,
    entity_ids: [],
    narrative_ids: [],
    country_codes: [],
    requires_verification: true,
    method_version: "prototype-adapter/v1",
    content_digest: typeof node.content_digest === "string" ? node.content_digest : null,
    market_bindings: marketBindings,
    relations,
    warnings,
  });
}
