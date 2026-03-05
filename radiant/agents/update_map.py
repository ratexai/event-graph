#!/usr/bin/env python3
"""
Radiant Map Agent -- updates prediction maps with new events.

Usage:
    python update_map.py <map_id>        # Update single map
    python update_map.py --all           # Update all maps
    python update_map.py --list          # List available maps
"""

import json
import sys
import os
from datetime import datetime, timezone
from pathlib import Path

try:
    import anthropic
except ImportError:
    print("Error: 'anthropic' package required. Install with: pip install anthropic")
    sys.exit(1)

from config import MODEL, MAX_TOKENS, MAX_NEW_NODES

# -- Paths ---------------------------------------------------------

DATA_DIR = Path(__file__).parent.parent / "data" / "maps"
REGISTRY_PATH = Path(__file__).parent.parent / "data" / "registry.json"
PROMPTS_DIR = Path(__file__).parent / "prompts"


# -- Helpers --------------------------------------------------------

def load_registry() -> dict:
    with open(REGISTRY_PATH) as f:
        return json.load(f)


def save_registry(registry: dict):
    with open(REGISTRY_PATH, "w") as f:
        json.dump(registry, f, indent=2, ensure_ascii=False)


def load_prompt(name: str) -> str:
    with open(PROMPTS_DIR / name) as f:
        return f.read()


def create_empty_map(map_id: str) -> dict:
    """Create empty map template."""
    registry = load_registry()
    map_info = next((m for m in registry["maps"] if m["id"] == map_id), {})
    return {
        "id": map_id,
        "title": map_info.get("title", map_id),
        "currentProb": None,
        "probHistory": [],
        "timeSlots": [],
        "nodes": [],
        "branches": [],
        "cuiBono": {"benefits": [], "loses": []},
        "rightPanel": {
            "states": [],
            "corps": [],
            "indices": [],
            "polymarketAnchors": [],
        },
    }


# -- Agent Input Builder -------------------------------------------

def build_agent_input(map_id: str, current: dict) -> str:
    """Build the input message for the agent."""
    nodes = current.get("nodes", [])
    recent = nodes[-20:] if len(nodes) > 20 else nodes

    recent_summary = json.dumps(
        [
            {
                "id": n["id"],
                "col": n["col"],
                "label": n["label"],
                "signal": n.get("signal"),
                "weight": n.get("weight"),
                "timestamp": n.get("timestamp"),
                "from": n.get("from", []),
            }
            for n in recent
        ],
        indent=2,
        ensure_ascii=False,
    )

    timeslots = json.dumps(
        current.get("timeSlots", []), indent=2, ensure_ascii=False
    )

    return f"""MAP ID: {map_id}
CURRENT STATE:
- Total nodes: {len(nodes)}
- Current probability: {current.get('currentProb', 'unknown')}%
- Probability history: {current.get('probHistory', [])}
- Last node timestamp: {nodes[-1].get('timestamp', 'unknown') if nodes else 'none'}

TIMESLOTS:
{timeslots}

RECENT NODES (last 20):
{recent_summary}

TODAY'S DATE: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}

TASK: Search for new events since the last node. Add them to the graph.
Output a JSON object with new_nodes, new_timeSlots, updated_prob, and summary.
Maximum {MAX_NEW_NODES} new nodes.
"""


# -- Response Parser -----------------------------------------------

def parse_agent_response(text: str) -> dict | None:
    """Extract JSON from agent response."""
    # Try to find JSON block in markdown
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
        if "new_nodes" in data:
            return data
    except json.JSONDecodeError:
        print("  Warning: Failed to parse JSON from response")
    return None


def merge_update(current: dict, update: dict) -> dict:
    """Merge agent's update into current dataset."""
    # Add new time slots
    existing_ts_indices = {ts["index"] for ts in current.get("timeSlots", [])}
    for ts in update.get("new_timeSlots", []):
        if ts["index"] not in existing_ts_indices:
            current.setdefault("timeSlots", []).append(ts)

    # Add new nodes (dedup by id)
    existing_ids = {n["id"] for n in current.get("nodes", [])}
    added = 0
    for node in update.get("new_nodes", []):
        if node["id"] not in existing_ids:
            current.setdefault("nodes", []).append(node)
            existing_ids.add(node["id"])
            added += 1

    # Update probability
    if "updated_prob" in update and update["updated_prob"] is not None:
        old_prob = current.get("currentProb")
        current["currentProb"] = update["updated_prob"]
        history = current.get("probHistory", [])
        if old_prob is not None and (not history or history[-1] != old_prob):
            history.append(old_prob)
        history.append(update["updated_prob"])
        current["probHistory"] = history

    return current


# -- Main Update Function ------------------------------------------

def update_map(map_id: str):
    """Update a single prediction map."""
    map_path = DATA_DIR / f"{map_id}.json"

    # Load current data (or empty template)
    if map_path.exists():
        with open(map_path) as f:
            current = json.load(f)
    else:
        current = create_empty_map(map_id)

    # Load agent prompt
    system_prompt = load_prompt("map_agent.txt")

    # Build user message with current state
    user_msg = build_agent_input(map_id, current)

    # Call Claude
    client = anthropic.Anthropic()  # uses ANTHROPIC_API_KEY env var
    print(f"[{map_id}] Calling Claude for updates...")

    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=system_prompt,
        messages=[{"role": "user", "content": user_msg}],
        tools=[{"type": "web_search_20250305", "name": "web_search"}],
    )

    # Extract text response
    result_text = ""
    for block in response.content:
        if block.type == "text":
            result_text += block.text

    # Parse JSON from response
    update = parse_agent_response(result_text)

    if update:
        new_count = len(update.get("new_nodes", []))
        summary = update.get("summary", "")
        print(f"[{map_id}] Agent found {new_count} new nodes. {summary}")

        if new_count > 0:
            current = merge_update(current, update)

            # Save updated map
            with open(map_path, "w") as f:
                json.dump(current, f, indent=2, ensure_ascii=False)

            # Update registry
            update_registry(map_id, current)

            node_count = len(current.get("nodes", []))
            print(f"[{map_id}] Saved. {node_count} nodes total.")
        else:
            print(f"[{map_id}] No new events. Data unchanged.")
    else:
        print(f"[{map_id}] Warning: Could not parse agent response.")


def update_registry(map_id: str, data: dict):
    """Update registry.json with fresh metadata."""
    registry = load_registry()
    for m in registry["maps"]:
        if m["id"] == map_id:
            m["lastUpdated"] = datetime.now(timezone.utc).isoformat()
            m["nodeCount"] = len(data.get("nodes", []))
            m["headlineProb"] = data.get("currentProb")
            break
    save_registry(registry)


# -- CLI -----------------------------------------------------------

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python update_map.py <map_id> | --all | --list")
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "--list":
        registry = load_registry()
        for m in registry["maps"]:
            status = m.get("nodeCount", 0)
            print(f"  {m['id']:25s}  {status:>4} nodes  [{m['status']}]")
        sys.exit(0)

    if cmd == "--all":
        registry = load_registry()
        for m in registry["maps"]:
            try:
                update_map(m["id"])
            except Exception as e:
                print(f"[{m['id']}] Error: {e}")
    else:
        update_map(cmd)
