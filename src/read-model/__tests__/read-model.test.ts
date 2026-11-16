import { describe, it, expect } from "vitest";
import {
  buildEventDetail,
  buildEvidenceTimeline,
  compareEventRevisions,
  eventFromPrototypeMap,
  marketBindingsForEvent,
  ReadModelError,
} from "../index";
import type {
  EventRevisionInput,
  EvidenceRefRead,
  PrototypeMap,
  ValidTime,
} from "../types";

const exactTime = (overrides: Partial<ValidTime> = {}): ValidTime => ({
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
  valid_time: exactTime(),
  observed_at: "2026-02-20T16:00:00Z",
  last_observed_at: "2026-02-20T16:00:00Z",
  evidence: [evidence()],
  method_version: "test/v1",
  content_digest: "sha256:test-1",
  ...overrides,
});

function expectCode(fn: () => unknown, code: string): void {
  try {
    fn();
    throw new Error(`expected ReadModelError(${code})`);
  } catch (error) {
    expect(error).toBeInstanceOf(ReadModelError);
    expect((error as ReadModelError).code).toBe(code);
  }
}

const prototypeMap: PrototypeMap = {
  id: "fixture-map",
  nodes: [
    {
      id: "e0",
      label: "Ultimatum issued",
      desc: "A deadline was announced.",
      timestamp: "2026-02-19T10:00:00Z",
      sourceUrl: "https://example.com/e0",
      nodeType: "fact",
    },
    {
      id: "e1",
      label: "Strait closed",
      desc: "Commercial traffic stopped.",
      timestamp: "2026-02-20T14:00:00Z",
      sourceUrl: "https://example.com/e1",
      nodeType: "fact",
      from: ["e0"],
    },
    {
      id: "a1",
      label: "PM: Strait reopens?",
      timestamp: "2026-03-15T00:00:00Z",
      nodeType: "anchor",
      marketPlatform: "polymarket",
      marketQuestion: "Will the strait reopen by March 15?",
      marketUrl: "https://polymarket.com/market/a1",
      marketSlug: "strait-reopen",
      marketProb: 48,
      resolvesAt: "2026-03-15T23:59:59Z",
      causalNodeIds: ["e1"],
      outcomes: [
        { label: "YES", polymarketProb: 48 },
        { label: "NO", polymarketProb: 52 },
      ],
    },
    {
      id: "a2",
      label: "PM: Strait reopens? (duplicate)",
      timestamp: "2026-03-15T00:00:00Z",
      nodeType: "anchor",
      marketPlatform: "polymarket",
      marketQuestion: "Will the strait reopen by March 15?",
      marketUrl: "https://polymarket.com/market/a2",
      marketSlug: "strait-reopen-2",
      marketProb: 52,
      resolvesAt: "2026-03-15T23:59:59Z",
      causalNodeIds: ["e1"],
      outcomes: [
        { label: "YES", polymarketProb: 48 },
        { label: "NO", polymarketProb: 52 },
      ],
    },
    {
      id: "s1",
      label: "Scenario: prolonged closure",
      nodeType: "scenario",
      desc: "Conditional future state.",
    },
  ],
};

describe("RADIANT event detail read", () => {
  it("builds a canonical detail with no forecast", () => {
    const detail = buildEventDetail(revision());

    expect(detail.event_id).toBe("event-1");
    expect(detail.id_authority).toBe("canonical");
    expect(detail.forecast).toBeNull();
    expect(detail.explanation.probability).toBeNull();
    expect(detail.explanation.forecast).toBeNull();
    expect(detail.explanation.causality).toBe("not_asserted");
    expect(detail.quality.status).toBe("preview");
    expect(detail.quality.provenance_complete).toBe(true);
    expect(detail.evidence).toHaveLength(1);
  });

  it("accepts unknown occurrence time without substituting observed time", () => {
    const detail = buildEventDetail(
      revision({
        valid_time: {
          precision: "unknown",
          starts_at: null,
          ends_at: null,
          local_date: null,
          timezone: null,
        },
      }),
    );

    expect(detail.valid_time.precision).toBe("unknown");
    expect(detail.observed_at).toBe("2026-02-20T16:00:00Z");
    expect(detail.valid_time.starts_at).toBeNull();
  });

  it("rejects exact valid time without starts_at", () => {
    expectCode(
      () => buildEventDetail(revision({ valid_time: exactTime({ starts_at: null }) })),
      "invalid_valid_time",
    );
  });

  it("rejects a range whose end precedes its start", () => {
    expectCode(
      () =>
        buildEventDetail(
          revision({
            valid_time: {
              precision: "range",
              starts_at: "2026-02-22T00:00:00Z",
              ends_at: "2026-02-21T00:00:00Z",
              local_date: null,
              timezone: "UTC",
            },
          }),
        ),
      "invalid_valid_time",
    );
  });

  it("requires supersedes after revision 1", () => {
    expectCode(
      () =>
        buildEventDetail(
          revision({ revision_id: "rev-2", revision_number: 2, supersedes_revision_id: null }),
        ),
      "invalid_supersedes",
    );
  });

  it("rejects duplicate evidence bindings", () => {
    expectCode(
      () => buildEventDetail(revision({ evidence: [evidence(), evidence()] })),
      "duplicate_evidence_ref",
    );
  });
});

describe("RADIANT revision comparison", () => {
  it("compares two revisions of the same event", () => {
    const from = buildEventDetail(revision());
    const to = buildEventDetail(
      revision({
        revision_id: "rev-2",
        revision_number: 2,
        supersedes_revision_id: "rev-1",
        title: "Strait closure (updated)",
        observed_at: "2026-02-21T10:00:00Z",
        last_observed_at: "2026-02-21T10:00:00Z",
        content_digest: "sha256:test-2",
        valid_time: exactTime({
          precision: "range",
          starts_at: "2026-02-20T14:00:00Z",
          ends_at: "2026-02-21T09:00:00Z",
        }),
        evidence: [
          evidence(),
          evidence({
            evidence_ref_id: "e2",
            evidence_id: "item-2",
            relation_type: "contradicts",
            canonical_url: "https://example.com/denial",
          }),
        ],
      }),
    );

    const diff = compareEventRevisions(from, to);

    expect(diff.comparable).toBe(true);
    expect(diff.forecast).toBeNull();
    expect(diff.changed_fields.map((change) => change.field)).toEqual(
      expect.arrayContaining(["title", "valid_time"]),
    );
    expect(diff.added_evidence).toHaveLength(1);
    expect(diff.added_evidence[0]?.relation_type).toBe("contradicts");
    expect(diff.summary).toContain("Contradicting evidence added: 1.");
    expect(diff.from_revision).toBe(1);
    expect(diff.to_revision).toBe(2);
  });

  it("reports removed evidence and an evidence-free target", () => {
    const from = buildEventDetail(revision());
    const to = buildEventDetail(
      revision({
        revision_id: "rev-2",
        revision_number: 2,
        supersedes_revision_id: "rev-1",
        observed_at: "2026-02-21T10:00:00Z",
        last_observed_at: "2026-02-21T10:00:00Z",
        content_digest: "sha256:test-2",
        evidence: [],
      }),
    );

    const diff = compareEventRevisions(from, to);

    expect(diff.removed_evidence).toHaveLength(1);
    expect(diff.summary).toContain("Evidence removed: 1.");
    expect(diff.summary).toContain(
      "The target revision has no evidence and cannot be presented as observed.",
    );
  });

  it("refuses to compare revisions of different events", () => {
    const from = buildEventDetail(revision());
    const to = buildEventDetail(
      revision({
        event_ref: "radiant:event-2",
        event_id: "event-2",
        revision_id: "rev-2",
        revision_number: 2,
        supersedes_revision_id: "rev-1",
      }),
    );

    const diff = compareEventRevisions(from, to);

    expect(diff.comparable).toBe(false);
    expect(diff.reason).toBe("different_event");
    expect(diff.summary).toEqual(["Cannot compare revisions of different events."]);
  });
});

describe("RADIANT evidence timeline", () => {
  it("keeps missing evidence explicit and empty", () => {
    const detail = buildEventDetail(revision({ evidence: [] }));
    const timeline = buildEvidenceTimeline(detail);

    expect(detail.quality.status).toBe("insufficient_data");
    expect(detail.quality.warnings).toContain("evidence_missing");
    expect(detail.explanation.unknowns.join(" ")).toContain("No evidence references");
    expect(timeline.items).toHaveLength(0);
    expect(timeline.quality.status).toBe("insufficient_data");
    expect(timeline.forecast).toBeNull();
  });

  it("orders by publication time and honours as_of", () => {
    const detail = buildEventDetail(
      revision({
        evidence: [
          evidence({ evidence_ref_id: "e-late", published_at: "2026-02-22T15:00:00Z" }),
          evidence({ evidence_ref_id: "e-undated", published_at: null, observed_at: null }),
          evidence({ evidence_ref_id: "e-early", published_at: "2026-02-20T15:00:00Z" }),
        ],
      }),
    );

    const timeline = buildEvidenceTimeline(detail, { as_of: "2026-02-21T00:00:00Z" });

    expect(timeline.items.map((item) => item.evidence.evidence_ref_id)).toEqual([
      "e-early",
      "e-undated",
    ]);
    expect(timeline.items[0]?.time_basis).toBe("published_at");
    expect(timeline.items[1]?.time_basis).toBe("none");
    expect(timeline.quality.warnings).toContain("timeline_bounded_by_as_of");
    expect(timeline.quality.warnings).toContain("undated_evidence_included");
  });
});

describe("RADIANT prototype adapter", () => {
  it("keeps valid_time and observed_time separate", () => {
    const detail = eventFromPrototypeMap(prototypeMap, "e1");

    expect(detail.id_authority).toBe("prototype_compatibility");
    expect(detail.event_id).toBeNull();
    expect(detail.valid_time.precision).toBe("exact");
    expect(detail.valid_time.starts_at).toBe("2026-02-20T14:00:00Z");
    expect(detail.observed_at).toBeNull();
    expect(detail.quality.warnings).toContain("observed_time_missing");
    expect(detail.quality.warnings).toContain("prototype_compatibility");
    expect(detail.forecast).toBeNull();
  });

  it("labels derived ordering as temporal, never causal", () => {
    const detail = eventFromPrototypeMap(prototypeMap, "e1");
    const relation = detail.relations[0];

    expect(relation?.relation_type).toBe("FOLLOWS");
    expect(relation?.epistemic_status).toBe("temporal");
    expect(relation?.assertion_source).toBe("derived_temporal");
    expect(relation?.evidence_ref_ids).toEqual([]);
  });

  it("rejects market anchors and scenarios as events", () => {
    expectCode(() => eventFromPrototypeMap(prototypeMap, "a1"), "market_anchor_is_not_event");
    expectCode(() => eventFromPrototypeMap(prototypeMap, "s1"), "scenario_is_not_event");
  });

  it("surfaces ambiguous market bindings without choosing one", () => {
    const bindings = marketBindingsForEvent(prototypeMap, "e1");

    expect(bindings).toHaveLength(2);
    expect(bindings.every((binding) => binding.ambiguity.ambiguous)).toBe(true);
    expect(bindings[0]?.market_id).toBeNull();
    expect(bindings[0]?.id_authority).toBe("prototype_compatibility");
    expect(bindings[0]?.ambiguity.reasons).toContain("multiple_market_bindings");
    expect(bindings[0]?.ambiguity.reasons).toContain("duplicate_question_in_map");
    expect(bindings[0]?.ambiguity.reasons).not.toContain("missing_as_of");
    expect(bindings[0]?.quality_warnings).toContain("missing_as_of");
  });

  it("does not call a single complete binding ambiguous", () => {
    const single: PrototypeMap = {
      id: "single-anchor-map",
      nodes: [
        prototypeMap.nodes[1]!,
        {
          id: "a1",
          label: "PM: Strait reopens?",
          nodeType: "anchor",
          marketPlatform: "polymarket",
          marketQuestion: "Will the strait reopen by March 15?",
          marketUrl: "https://polymarket.com/market/a1",
          marketSlug: "strait-reopen",
          marketProb: 48,
          resolvesAt: "2026-03-15T23:59:59Z",
          causalNodeIds: ["e1"],
          outcomes: [
            { label: "YES", polymarketProb: 48 },
            { label: "NO", polymarketProb: 52 },
          ],
        },
      ],
    };

    const [binding] = marketBindingsForEvent(single, "e1");

    expect(binding?.ambiguity.ambiguous).toBe(false);
    expect(binding?.ambiguity.reasons).toEqual([]);
    expect(binding?.quality_warnings).toContain("missing_as_of");
  });

  it("exposes prototype prices only as fixtures", () => {
    const [binding] = marketBindingsForEvent(prototypeMap, "e1");

    expect(binding?.probability).toBe(48);
    expect(binding?.probability_basis).toBe("prototype_fixture");
    expect(binding?.outcomes[0]?.probability_basis).toBe("prototype_fixture");
  });
});
