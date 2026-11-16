"""
Radiant API -- serves prediction map JSON data.

Run:
    cd radiant && uvicorn api.server:app --port 8000
    # or from repo root:
    python -m uvicorn radiant.api.server:app --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pathlib import Path
import json

from .prediction_intelligence import (
    PredictionIntelligenceNotFound,
    fixture_source,
    load_fixture_card,
)

app = FastAPI(title="Radiant API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).parent.parent / "data"
MAPS_DIR = DATA_DIR / "maps"


@app.get("/api/v1/maps")
def list_maps():
    """List all prediction maps (registry)."""
    registry_path = DATA_DIR / "registry.json"
    if not registry_path.exists():
        return {"maps": []}
    with open(registry_path) as f:
        return json.load(f)


@app.get("/api/v1/maps/{map_id}")
def get_map(map_id: str):
    """Get full prediction map data by ID."""
    # Sanitize: only allow alphanumeric, hyphens, underscores
    safe_id = "".join(c for c in map_id if c.isalnum() or c in "-_")
    if safe_id != map_id:
        raise HTTPException(400, "Invalid map ID")

    path = MAPS_DIR / f"{safe_id}.json"
    if not path.exists():
        raise HTTPException(404, f"Map '{map_id}' not found")
    with open(path) as f:
        return json.load(f)


@app.get("/api/v1/search")
def search(q: str = ""):
    """Simple search across maps."""
    if not q:
        return {"maps": [], "projects": []}

    q_lower = q.lower()
    registry_path = DATA_DIR / "registry.json"
    if not registry_path.exists():
        return {"maps": [], "projects": []}

    with open(registry_path) as f:
        registry = json.load(f)

    matches = [
        m
        for m in registry.get("maps", [])
        if q_lower in m.get("title", "").lower() or q_lower in m.get("id", "")
    ]

    return {"maps": matches, "projects": []}


@app.get("/api/v1/prediction-intelligence/{market_id}")
def get_prediction_intelligence(market_id: str):
    """Serve a static prediction-intelligence fixture. Read-only, no live data."""
    try:
        card = load_fixture_card(market_id)
    except PredictionIntelligenceNotFound:
        return JSONResponse(
            status_code=404,
            content={
                "state": "NOT_FOUND",
                "reason": f"Prediction intelligence fixture '{market_id}' not found",
            },
        )
    return {"state": "OK", "source": fixture_source(), "data": card}


@app.get("/health")
def health():
    return {"status": "ok"}
