"""Read-only prediction-intelligence fixture access.

The fixture is a static RADIANT card; it is never a live observation. This
module has no write path and performs no network call.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "prediction-intelligence"
CONTRACT_VERSION = "prediction-intelligence/v1"
MARKET_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$")


class PredictionIntelligenceNotFound(LookupError):
    """Raised when no static fixture matches the requested market ID."""


def _binding(card: dict[str, Any]) -> dict[str, Any]:
    binding = card.get("market_binding")
    if not isinstance(binding, dict):
        return {}
    candidate = binding.get("binding")
    return candidate if isinstance(candidate, dict) else {}


def _matches(card: dict[str, Any], path: Path, market_id: str) -> bool:
    if path.stem == market_id:
        return True
    binding = _binding(card)
    return market_id in {
        binding.get("market_id"),
        binding.get("external_market_id"),
    }


def load_fixture_card(market_id: str) -> dict[str, Any]:
    """Load one static card by fixture name, canonical market ID or venue ID.

    Unknown, malformed or path-like IDs raise `PredictionIntelligenceNotFound`;
    the loader never guesses a market and never writes.
    """

    if not isinstance(market_id, str) or not MARKET_ID_RE.fullmatch(market_id):
        raise PredictionIntelligenceNotFound(f"Unknown prediction intelligence fixture: {market_id!r}")

    if not DATA_DIR.is_dir():
        raise PredictionIntelligenceNotFound("Prediction intelligence fixture directory is missing")

    matches: list[dict[str, Any]] = []
    for path in sorted(DATA_DIR.glob("*.json")):
        try:
            with path.open(encoding="utf-8") as handle:
                card = json.load(handle)
        except (OSError, json.JSONDecodeError):
            continue
        if not isinstance(card, dict) or card.get("contract_version") != CONTRACT_VERSION:
            continue
        if _matches(card, path, market_id):
            matches.append(card)

    if not matches:
        raise PredictionIntelligenceNotFound(f"Unknown prediction intelligence fixture: {market_id}")
    if len(matches) > 1:
        raise PredictionIntelligenceNotFound(
            f"Ambiguous prediction intelligence fixture: {market_id}"
        )
    return matches[0]


def fixture_source() -> str:
    """The only source this read route may claim."""

    return "fixture"
