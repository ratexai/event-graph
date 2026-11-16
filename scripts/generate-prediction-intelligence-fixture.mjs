#!/usr/bin/env node
/**
 * Build the deterministic RADIANT prediction-intelligence fixture from the
 * existing Iran map. The fixture is static: it is never a live observation.
 *
 * Usage:
 *   npm run build
 *   node scripts/generate-prediction-intelligence-fixture.mjs
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildEventDetail } from "../dist/read-model/index.mjs";
import { composePredictionIntelligence } from "../dist/prediction-intelligence/index.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const mapPath = resolve(root, "radiant/data/maps/iran-war-2026.json");
const outputPath = resolve(root, "radiant/data/prediction-intelligence/example.json");

const RECORDED_AT = "2026-11-16T00:00:00Z";
const SOURCE_VERSION = "radiant.fixture/iran-war-2026@2026-11-16";

const map = JSON.parse(await readFile(mapPath, "utf8"));
const strike = map.nodes.find((node) => node.id === "n4_strikes");
const casualties = map.nodes.find((node) => node.id === "n20_losses_iran");
if (!strike) throw new Error("iran map is missing n4_strikes");

const validTime = {
  precision: "exact",
  starts_at: strike.timestamp,
  ends_at: null,
  local_date: null,
  timezone: "UTC",
};

const baseEvidence = {
  evidence_ref_id: "fixture:iran-war-2026:n4_strikes:source",
  evidence_id: null,
  source_id: null,
  canonical_url: strike.sourceUrl ?? null,
  published_at: null,
  observed_at: "2026-02-28T07:00:00Z",
  relation_type: "context",
  is_primary: true,
  identity_status: "prototype_only",
};

const addedEvidence = {
  evidence_ref_id: "fixture:iran-war-2026:n4_strikes:casualties",
  evidence_id: null,
  source_id: null,
  canonical_url: casualties?.sourceUrl ?? null,
  published_at: null,
  observed_at: "2026-03-03T12:15:00Z",
  relation_type: "context",
  is_primary: false,
  identity_status: "prototype_only",
};

const marketBinding = (probability, asOf) => ({
  market_id: "fixture:polymarket:us-strikes-iran-by",
  provider: "polymarket_international",
  external_market_id: "us-strikes-iran-by",
  question:
    "Will the US conduct additional airstrikes on Iran before March 15, 2026?",
  canonical_url: strike.marketUrl ?? null,
  closes_at: "2026-03-15T23:59:59Z",
  resolved_at: null,
  resolution: null,
  outcomes: [
    {
      outcome_id: "fixture-yes",
      label: "YES",
      probability,
      probability_basis: "prototype_fixture",
      as_of: asOf,
    },
    {
      outcome_id: "fixture-no",
      label: "NO",
      probability: 100 - probability,
      probability_basis: "prototype_fixture",
      as_of: asOf,
    },
  ],
  binding_type: "anchor",
  confidence: null,
  as_of: asOf,
  probability,
  probability_basis: "prototype_fixture",
  id_authority: "prototype_compatibility",
  ambiguity: { ambiguous: false, reasons: [] },
  quality_warnings: [],
});

const t0 = buildEventDetail({
  event_ref: "prototype:iran-war-2026:n4_strikes",
  event_id: null,
  id_authority: "prototype_compatibility",
  lifecycle_status: "active",
  revision_id: "prototype:iran-war-2026:n4_strikes@r1",
  revision_number: 1,
  supersedes_revision_id: null,
  title: strike.label,
  summary: strike.desc,
  event_type: "UNKNOWN",
  epistemic_status: "observed",
  valid_time: validTime,
  observed_at: "2026-02-28T07:10:00Z",
  last_observed_at: "2026-02-28T07:10:00Z",
  evidence: [baseEvidence],
  method_version: "fixture/iran-war-2026@2026-11-16",
  market_bindings: [marketBinding(67, "2026-02-28T07:10:00Z")],
  as_of: "2026-02-28T07:10:00Z",
  warnings: ["prototype_compatibility", "fixture_static_snapshot"],
});

const t1 = buildEventDetail({
  event_ref: "prototype:iran-war-2026:n4_strikes",
  event_id: null,
  id_authority: "prototype_compatibility",
  lifecycle_status: "active",
  revision_id: "prototype:iran-war-2026:n4_strikes@r2",
  revision_number: 2,
  supersedes_revision_id: "prototype:iran-war-2026:n4_strikes@r1",
  title: strike.label,
  summary:
    `${strike.desc} Revision 2 adds the later Al Jazeera casualty tracker ` +
    "(the map records ≥1,045 killed); it does not resolve damage or responsibility.",
  event_type: "UNKNOWN",
  epistemic_status: "observed",
  valid_time: validTime,
  observed_at: "2026-03-03T12:30:00Z",
  last_observed_at: "2026-03-03T12:30:00Z",
  evidence: [baseEvidence, addedEvidence],
  method_version: "fixture/iran-war-2026@2026-11-16",
  market_bindings: [marketBinding(72, "2026-03-03T12:00:00Z")],
  as_of: "2026-03-03T12:30:00Z",
  warnings: ["prototype_compatibility", "fixture_static_snapshot"],
});

const card = composePredictionIntelligence({
  event: t0,
  toRevision: t1,
  as_of: "2026-03-03T12:30:00Z",
  now: RECORDED_AT,
  source_version: SOURCE_VERSION,
  marketObservation: {
    venue: "polymarket_international",
    event: {
      venue_event_id: "fixture:polymarket:event-us-iran-strikes-2026",
      slug: "us-iran-strikes-2026",
      title: strike.label,
    },
    market: {
      venue_market_id: "us-strikes-iran-by",
      slug: "us-strikes-iran-by",
      question:
        "Will the US conduct additional airstrikes on Iran before March 15, 2026?",
      condition_id: "fixture:polymarket:condition-us-strikes-iran-by",
      market_version: "v1",
      market_state: "ACTIVE",
      resolution_state: "UNRESOLVED",
      end_date: "2026-03-15T23:59:59Z",
    },
    outcomes: [
      {
        label: "YES",
        outcome_index: 0,
        asset_id: "fixture:polymarket:token-yes",
        asset_id_kind: "CTF_TOKEN_ID",
        price: "0.72",
        best_bid: "0.71",
        best_ask: "0.73",
      },
      {
        label: "NO",
        outcome_index: 1,
        asset_id: "fixture:polymarket:token-no",
        asset_id_kind: "CTF_TOKEN_ID",
        price: "0.28",
        best_bid: "0.27",
        best_ask: "0.29",
      },
    ],
    quote: {
      source: "gamma_market",
      price_basis: "OUTCOME_PRICE",
      as_of: "2026-03-03T12:00:00Z",
      stale_after_seconds: 3600,
    },
    evidence: [
      {
        evidence_id: "fixture:polymarket:market-us-strikes-iran-by",
        kind: "VENUE_MARKET",
        url: strike.marketUrl ?? "https://polymarket.com",
        observed_at: "2026-03-03T12:00:00Z",
        source_version: "fixture:gamma_market@2026-03-03T12:00:00Z",
      },
    ],
    freshness: {
      state: "STALE",
      observed_at: "2026-03-03T12:00:00Z",
      age_seconds: null,
      reason: "STATIC_FIXTURE_SNAPSHOT",
    },
    source_version: "fixture:gamma_market@2026-03-03T12:00:00Z",
  },
});

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(card, null, 2)}\n`, "utf8");
console.log(`wrote ${outputPath}`);
