"""Read-only tests for the static prediction-intelligence route and fixture."""

from __future__ import annotations

import asyncio
import json
import unittest
from pathlib import Path
from typing import Any

from radiant.api.prediction_intelligence import (
    PredictionIntelligenceNotFound,
    fixture_source,
    load_fixture_card,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
FIXTURE = REPO_ROOT / "radiant" / "data" / "prediction-intelligence" / "example.json"
SERVER = REPO_ROOT / "radiant" / "api" / "server.py"
ROUTE = "/api/v1/prediction-intelligence/{market_id}"

try:  # FastAPI is in radiant/requirements.txt but not guaranteed in the test env.
    from radiant.api.server import app as fastapi_app
except ImportError:  # pragma: no cover - depends on the local environment
    fastapi_app = None


def _asgi_get(path: str) -> tuple[int, dict[str, Any]]:
    """Minimal stdlib ASGI request; avoids the httpx/TestClient dependency."""

    if fastapi_app is None:
        raise unittest.SkipTest("FastAPI is not installed")

    parsed = path.split("?", 1)
    query = parsed[1] if len(parsed) > 1 else ""
    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "GET",
        "scheme": "http",
        "path": parsed[0],
        "raw_path": parsed[0].encode(),
        "query_string": query.encode(),
        "root_path": "",
        "headers": [(b"host", b"testserver")],
        "client": ("127.0.0.1", 12345),
        "server": ("testserver", 80),
    }
    messages: list[dict[str, Any]] = []

    async def receive() -> dict[str, Any]:
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message: dict[str, Any]) -> None:
        messages.append(message)

    asyncio.run(fastapi_app(scope, receive, send))
    status = next(m["status"] for m in messages if m["type"] == "http.response.start")
    body = b"".join(
        m.get("body", b"") for m in messages if m["type"] == "http.response.body"
    )
    return status, json.loads(body)


class PredictionIntelligenceFixtureTest(unittest.TestCase):
    def setUp(self) -> None:
        self.card = load_fixture_card("example")

    def test_fixture_is_static_and_labelled(self) -> None:
        self.assertTrue(FIXTURE.is_file())
        card = self.card
        self.assertEqual(card["contract_version"], "prediction-intelligence/v1")
        self.assertTrue(card["source_version"].startswith("radiant.fixture/"))
        self.assertEqual(card["as_of"], "2026-03-03T12:30:00Z")
        self.assertEqual(card["freshness"]["state"], "STALE")
        self.assertEqual(card["freshness"]["reason"], "AGE_EXCEEDS_STALE_AFTER")

    def test_card_has_no_forecast_and_no_model_probability(self) -> None:
        card = self.card
        self.assertNotIn("forecast", card)
        self.assertIsNone(card["event"]["forecast"])
        self.assertIsNone(card["model_probability"])
        self.assertEqual(card["model_probability_reason"], "NO_CANONICAL_MODEL_OUTPUT")
        self.assertIsNone(card["evidence_timeline"]["forecast"])

    def test_market_and_revision_fields_are_present(self) -> None:
        card = self.card
        self.assertEqual(card["market_binding"]["state"], "BOUND")
        self.assertEqual(
            card["market_binding"]["binding"]["external_market_id"],
            "us-strikes-iran-by",
        )
        self.assertAlmostEqual(card["market_implied_probability"]["value"], 0.72)
        self.assertEqual(card["evidence_bundle"]["state"], "NOT_SUPPLIED")
        self.assertEqual(card["evidence_bundle"]["items"], [])
        self.assertTrue(card["market_projection"]["ownership_label"] == "NOT_APPLICABLE")
        self.assertTrue(card["revisions"]["diff"]["comparable"])
        self.assertEqual(card["revisions"]["from"]["revision_number"], 1)
        self.assertEqual(card["revisions"]["to"]["revision_number"], 2)
        self.assertEqual(len(card["evidence_timeline"]["items"]), 2)
        self.assertGreaterEqual(len(card["citations"]), 2)

    def test_loads_by_fixture_name_market_id_and_venue_id(self) -> None:
        for key in ("example", "fixture:polymarket:us-strikes-iran-by", "us-strikes-iran-by"):
            with self.subTest(key=key):
                self.assertEqual(load_fixture_card(key)["contract_version"], "prediction-intelligence/v1")

    def test_unknown_and_path_like_ids_are_not_found(self) -> None:
        for key in ("does-not-exist", "../example", "example/../example", "", "a" * 200):
            with self.subTest(key=key):
                with self.assertRaises(PredictionIntelligenceNotFound):
                    load_fixture_card(key)

    def test_source_is_always_fixture(self) -> None:
        self.assertEqual(fixture_source(), "fixture")


class PredictionIntelligenceRouteTest(unittest.TestCase):
    def test_route_is_get_only(self) -> None:
        source = SERVER.read_text(encoding="utf-8")
        self.assertIn(f'@app.get("{ROUTE}")', source)
        for verb in ("post", "put", "patch", "delete"):
            self.assertNotIn(f"@app.{verb}", source)
        self.assertNotIn("/api/v1/prediction-intelligence", source.split(ROUTE)[0])

    def test_asgi_serves_fixture_with_source_fixture(self) -> None:
        status, body = _asgi_get("/api/v1/prediction-intelligence/example")
        self.assertEqual(status, 200)
        self.assertEqual(body["state"], "OK")
        self.assertEqual(body["source"], "fixture")
        self.assertEqual(body["data"]["contract_version"], "prediction-intelligence/v1")

    def test_asgi_returns_explicit_404_for_unknown(self) -> None:
        status, body = _asgi_get("/api/v1/prediction-intelligence/unknown-market")
        self.assertEqual(status, 404)
        self.assertEqual(body["state"], "NOT_FOUND")
        self.assertIn("not found", body["reason"])


if __name__ == "__main__":
    unittest.main()
