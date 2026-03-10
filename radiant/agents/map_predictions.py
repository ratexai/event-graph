#!/usr/bin/env python3
"""
Radiant Prediction Mapper -- auto-maps prediction anchors to causal events.

For each active Polymarket prediction anchor, this agent:
1. Analyzes all fact nodes in the graph
2. Determines which events are causally related
3. Classifies events as FOR or AGAINST resolution
4. Estimates effect magnitude for each causal link

Usage:
    python map_predictions.py <map_id>        # Map predictions for a single map
    python map_predictions.py --all           # Map predictions for all maps
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import anthropic
except ImportError:
    print("Error: 'anthropic' package required. Install with: pip install anthropic")
    sys.exit(1)

from config import MODEL, MAX_TOKENS

# -- Paths ---------------------------------------------------------

DATA_DIR = Path(__file__).parent.parent / "data" / "maps"
REGISTRY_PATH = Path(__file__).parent.parent / "data" / "registry.json"

# -- Prompt --------------------------------------------------------

PREDICTION_MAPPER_PROMPT = """You are a prediction analyst for RateXAI Radiant platform.

Given a Polymarket prediction and a list of events from the narrative graph,
determine the causal relationships between events and the prediction.

For each prediction anchor, output:

1. causalNodeIds: array of event IDs that are causally related to this prediction
2. forResolution: events that push FOR resolution (increase probability)
3. againstResolution: events that push AGAINST resolution (decrease probability)
4. ratexProb: your estimated probability based on causal chain analysis

RULES:
- Only include events with a genuine causal link to the prediction outcome
- Each causal link must have an "effect" (e.g., "+12%" or "-8%") and a "reason"
- Effects should sum to roughly explain the difference between market and model prob
- Maximum 15 causal nodes per prediction
- Be specific about WHY each event affects the prediction

OUTPUT FORMAT (JSON):
{
  "causalNodeIds": ["node_id_1", "node_id_2", ...],
  "forResolution": [
    {"node": "node_id", "effect": "+12%", "reason": "Brief explanation"}
  ],
  "againstResolution": [
    {"node": "node_id", "effect": "-8%", "reason": "Brief explanation"}
  ],
  "ratexProb": 45
}
"""


def load_map(map_id: str) -> dict:
    """Load a prediction map from JSON."""
    map_path = DATA_DIR / f"{map_id}.json"
    if not map_path.exists():
        print(f"[{map_id}] Map file not found: {map_path}")
        sys.exit(1)
    with open(map_path) as f:
        return json.load(f)


def save_map(map_id: str, data: dict):
    """Save a prediction map to JSON."""
    map_path = DATA_DIR / f"{map_id}.json"
    with open(map_path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def get_anchors(nodes: list[dict]) -> list[dict]:
    """Extract anchor nodes from the node list."""
    return [n for n in nodes if n.get("nodeType") == "anchor"]


def get_fact_nodes(nodes: list[dict]) -> list[dict]:
    """Extract fact nodes (non-anchor, non-scenario) from the node list."""
    return [
        n for n in nodes
        if n.get("nodeType") not in ("anchor", "scenario")
    ]


def build_mapping_input(anchor: dict, fact_nodes: list[dict]) -> str:
    """Build the input message for mapping a single prediction."""
    # Summarize recent fact nodes
    recent = fact_nodes[-30:] if len(fact_nodes) > 30 else fact_nodes
    node_summary = json.dumps(
        [
            {
                "id": n["id"],
                "label": n.get("label", ""),
                "category": n.get("category"),
                "signal": n.get("signal"),
                "sentiment": n.get("sentiment"),
                "weight": n.get("weight"),
                "oddsDelta": n.get("oddsDelta"),
                "desc": n.get("desc", "")[:200],
                "timestamp": n.get("timestamp"),
            }
            for n in recent
        ],
        indent=2,
        ensure_ascii=False,
    )

    return f"""PREDICTION:
Question: {anchor.get('marketQuestion', anchor.get('label', ''))}
Market Prob: {anchor.get('marketProb', 'unknown')}%
Expiry: {anchor.get('resolvesAt', 'unknown')}
Current RateXAI Prob: {anchor.get('rateXProb', 'unknown')}%

EVENTS ({len(recent)} most recent):
{node_summary}

TODAY: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}

Analyze and output the causal mapping JSON.
"""


def parse_mapping_response(text: str) -> dict | None:
    """Extract JSON from agent response."""
    if "```json" in text:
        start = text.index("```json") + 7
        end = text.index("```", start)
        text = text[start:end].strip()
    elif "```" in text:
        start = text.index("```") + 3
        end = text.index("```", start)
        text = text[start:end].strip()

    try:
        data = json.loads(text)
        if "causalNodeIds" in data:
            return data
    except json.JSONDecodeError:
        print("  Warning: Failed to parse JSON from response")
    return None


def map_single_prediction(
    client: anthropic.Anthropic,
    anchor: dict,
    fact_nodes: list[dict],
) -> dict | None:
    """Map a single prediction to its causal events using Claude."""
    user_msg = build_mapping_input(anchor, fact_nodes)

    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=PREDICTION_MAPPER_PROMPT,
        messages=[{"role": "user", "content": user_msg}],
    )

    result_text = ""
    for block in response.content:
        if block.type == "text":
            result_text += block.text

    return parse_mapping_response(result_text)


def map_predictions(map_id: str):
    """Map all prediction anchors in a map to their causal events."""
    data = load_map(map_id)
    nodes = data.get("nodes", [])
    anchors = get_anchors(nodes)
    fact_nodes = get_fact_nodes(nodes)

    if not anchors:
        print(f"[{map_id}] No anchor nodes found.")
        return

    print(f"[{map_id}] Found {len(anchors)} predictions, {len(fact_nodes)} fact nodes.")

    client = anthropic.Anthropic()
    updated = 0

    for anchor in anchors:
        label = anchor.get("marketQuestion", anchor.get("label", anchor["id"]))
        print(f"  Mapping: {label}...")

        mapping = map_single_prediction(client, anchor, fact_nodes)
        if not mapping:
            print(f"    Failed to parse mapping for {anchor['id']}")
            continue

        # Apply mapping to anchor node
        anchor["causalNodeIds"] = mapping["causalNodeIds"]
        anchor["forResolution"] = mapping["forResolution"]
        anchor["againstResolution"] = mapping["againstResolution"]

        # Update RateXAI prob if provided
        if "ratexProb" in mapping and mapping["ratexProb"] is not None:
            anchor["rateXProb"] = mapping["ratexProb"]
            pm = anchor.get("marketProb", 0)
            anchor["alpha"] = mapping["ratexProb"] - pm

        causal_count = len(mapping["causalNodeIds"])
        for_count = len(mapping["forResolution"])
        against_count = len(mapping["againstResolution"])
        print(f"    {causal_count} causal nodes, {for_count} for, {against_count} against")
        updated += 1

    if updated > 0:
        save_map(map_id, data)
        print(f"[{map_id}] Saved. Updated {updated}/{len(anchors)} predictions.")
    else:
        print(f"[{map_id}] No predictions updated.")


# -- CLI -----------------------------------------------------------

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python map_predictions.py <map_id> | --all")
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "--all":
        with open(REGISTRY_PATH) as f:
            registry = json.load(f)
        for m in registry["maps"]:
            if m.get("status") == "active":
                try:
                    map_predictions(m["id"])
                except Exception as e:
                    print(f"[{m['id']}] Error: {e}")
    else:
        map_predictions(cmd)
