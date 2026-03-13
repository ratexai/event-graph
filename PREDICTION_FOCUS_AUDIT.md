# Prediction Focus — Debug Audit

**Date:** 2026-03-13
**Status:** Fixed

---

## Problem

Clicking a prediction in the right panel opened the AnchorModal overlay instead of
filtering the graph. None of the prediction-first features (dimming, for/against
panel, focus badge) were reachable by the user.

---

## Root Cause Analysis

### Bug 1 (CRITICAL): MarketCard onClick always opens modal

**File:** `src/components/CuiBono/CuiBonoPanel.tsx:910`
**Symptom:** Click prediction card → modal opens, no graph filtering
**Cause:** `MarketCard.onClick` called `onMarketSelect(anchor.id)`, which was
bound to `handleMarketSelect` in EventGraph.tsx — a function that **always**
calls `setAnchorModalId(anchorId)` (opens modal).

The focus button existed as a tiny 26x26px absolute-positioned overlay on top
of the card, but was practically invisible and impossible to hit.

**Fix:** Made card click the **primary** focus action. If anchor has
`causalNodeIds`, clicking the card now calls `onPredictionFocus(anchor.id)`
instead of `onMarketSelect`. Anchors without causal data fall back to modal.
Removed the tiny overlay focus button entirely.

```
// BEFORE (line 910)
onClick={() => onMarketSelect?.(anchor.id)}  // always opens modal

// AFTER
onClick={() => {
  if (hasCausal && onPredictionFocus) {
    onPredictionFocus(anchor.id);   // focus graph
  } else {
    onMarketSelect?.(anchor.id);    // fallback: modal
  }
}}
```

### Bug 2 (CRITICAL): handleMarketSelect always opens modal

**File:** `src/components/EventGraph.tsx:188-192`
**Symptom:** `onMarketSelect` callback used for both "open modal" and
"navigate to node" — but always opened modal.
**Cause:** `handleMarketSelect` was also passed as `onNodeNavigate` into
`PredictionFocusDetail`, meaning clicking a causal link in the for/against
list also opened the modal instead of navigating to the node.

**Fix:** Split the logic — if the target is a fact node (not anchor), select
it on the graph + show detail panel. Only open modal for actual anchor nodes.

```
// BEFORE
const handleMarketSelect = (anchorId) => {
  selection.setHovered(anchorId);
  setAnchorModalId(anchorId);     // always modal
};

// AFTER
const handleMarketSelect = (anchorId) => {
  const node = narrativeById.get(anchorId);
  if (node && !isAnchorNode(node)) {
    selection.setSelected(anchorId);  // fact node → select
    setMobilePanel("detail");
    return;
  }
  selection.setHovered(anchorId);
  setAnchorModalId(anchorId);         // anchor → modal
};
```

### Bug 3 (MEDIUM): Graph anchor click opens modal during focus

**File:** `src/components/EventGraph.tsx:174-186`
**Symptom:** When prediction focus is active and user clicks an anchor node
on the SVG graph, the modal opens and covers the filtered view.
**Cause:** `handleNodeSelect` unconditionally opens modal for anchor nodes
with `if (node && isAnchorNode(node)) { setAnchorModalId(id); return; }`.

**Fix:** Added `predictionFocus` check — when focus is active, anchor clicks
on graph go to detail panel instead of modal.

```
// BEFORE
if (node && isAnchorNode(node)) {
  setAnchorModalId(id);     // always modal
  return;
}

// AFTER
if (node && isAnchorNode(node) && !predictionFocus) {
  setAnchorModalId(id);     // modal only when no focus
  return;
}
```

---

## Verification Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | `causalNodeIds` present in JSON (7 anchors, 6-11 nodes each) | OK |
| 2 | `predictionFocus` state created in EventGraph.tsx | OK |
| 3 | `handlePredictionFocus` creates Set from `anchor.causalNodeIds` | OK |
| 4 | `predictionFocusIds` passed to GraphCanvas | OK |
| 5 | `isNodeDimmed()` checks `predictionFocusIds` | OK |
| 6 | `isEdgeDimmed()` checks `predictionFocusIds` | OK |
| 7 | Nodes use `opacity={isDimmed ? 0.15 : 1}` with transition | OK |
| 8 | Edges use `opacity={isDimmed ? 0.04 : 1}` with transition | OK |
| 9 | MarketCard click → `onPredictionFocus` (not modal) | FIXED |
| 10 | CuiBonoPanel shows PredictionFocusDetail when focused | OK |
| 11 | TopBar shows focus badge with clear button | OK |
| 12 | handleNodeSelect respects predictionFocus | FIXED |
| 13 | handleMarketSelect routes fact nodes to selection | FIXED |
| 14 | TypeScript compiles cleanly | OK |
| 15 | All tests pass | OK |

---

## Data Flow (After Fix)

```
User clicks prediction card in CuiBonoPanel
  ↓
CuiBonoPanel: onClick → onPredictionFocus(anchor.id)
  ↓
EventGraph: handlePredictionFocus(anchorId)
  → narrativeById.get(anchorId)
  → new Set(anchor.causalNodeIds)
  → setPredictionFocus({ anchorId, causalNodeIds, anchor })
  ↓
Re-render:
  → TopBar receives predictionFocusLabel → shows badge
  → GraphCanvas receives predictionFocusIds → dims non-causal nodes
  → CuiBonoPanel receives predictionFocus → shows PredictionFocusDetail
```

```
User clicks causal link in PredictionFocusDetail
  ↓
PredictionFocusDetail: onClick → onNodeNavigate(link.node)
  ↓
EventGraph: handleMarketSelect(nodeId)
  → narrativeById.get(nodeId) → it's a fact node (not anchor)
  → selection.setSelected(nodeId) → detail panel opens for that node
```

```
User clicks ✕ on focus badge or PredictionFocusDetail
  ↓
handlePredictionClear() → setPredictionFocus(null)
  ↓
Re-render: all nodes restored to full opacity, badge removed
```

---

## Files Changed

| File | Change |
|------|--------|
| `CuiBonoPanel.tsx` | Card click → focus (not modal). Removed overlay focus button. |
| `EventGraph.tsx` | `handleMarketSelect` routes fact nodes to selection. `handleNodeSelect` skips modal when focus active. |

---

## Remaining Tasks (Completed)

- [x] Add for/against role indicator badges on graph nodes (green/red dot)
- [x] Animate camera pan to center causal cluster when focus activates
- [x] Add "View on Polymarket" button in PredictionFocusDetail
- [x] Persist prediction focus across mode switches (if returning to narratives)
- [x] E2E test: click prediction → verify dimming → verify for/against panel
