/* ═══════════════════════════════════════════════════════════════
   Edge derivation + graph traversal utilities
   ═══════════════════════════════════════════════════════════════ */

import type {
  EventNode, EventEdge, KolNode, NarrativeNode,
} from "../types";

// ─── Edge Derivation ────────────────────────────────────────────

/** Derive edges from EventNode.from[] fields */
export function deriveEventEdges(nodes: EventNode[]): EventEdge[] {
  const idSet = new Set(nodes.map((n) => n.id));
  return nodes.flatMap((node) =>
    (node.from || [])
      .filter((fid) => idSet.has(fid))
      .map((fid) => ({ from: fid, to: node.id, type: "causal" as const })),
  );
}

/** Derive KOL edges from .from[] + .influence[] */
export function deriveKolEdges(nodes: KolNode[]): EventEdge[] {
  const idSet = new Set(nodes.map((n) => n.id));
  const edges: EventEdge[] = [];

  for (const node of nodes) {
    for (const fid of node.from || []) {
      if (idSet.has(fid)) edges.push({ from: fid, to: node.id, type: "influence" });
    }
    for (const iid of node.influence || []) {
      if (idSet.has(iid)) edges.push({ from: node.id, to: iid, type: "influence" });
    }
  }

  return edges;
}

/** Derive edges from NarrativeNode.from[] fields + anchor influenceLinks */
export function deriveNarrativeEdges(nodes: NarrativeNode[]): EventEdge[] {
  const idSet = new Set(nodes.map((n) => n.id));
  const edges: EventEdge[] = [];

  for (const node of nodes) {
    // Standard causal edges from .from[]
    for (const fid of node.from || []) {
      if (!idSet.has(fid)) continue;
      // Check if this edge has detailed influence data from anchor's influenceLinks
      const link = node.influenceLinks?.find((l) => l.id === fid);
      if (link) {
        edges.push({ from: fid, to: node.id, type: "influence", influence: link.influence, mechanism: link.mechanism });
      } else {
        edges.push({ from: fid, to: node.id, type: "causal" });
      }
    }
    // Also derive edges from influenceLinks that may not be in .from[] (e.g., anchor nodes)
    if (node.influenceLinks) {
      for (const link of node.influenceLinks) {
        if (!idSet.has(link.id)) continue;
        // Only add if not already derived from .from[]
        if (!(node.from || []).includes(link.id)) {
          edges.push({ from: link.id, to: node.id, type: "influence", influence: link.influence, mechanism: link.mechanism });
        }
      }
    }
  }

  return edges;
}

// ─── Graph Traversal ────────────────────────────────────────────

/** Collect full upstream + downstream chain from a node */
export function getEventChain(nodeId: string, nodes: EventNode[]): Set<string> {
  const visited = new Set<string>([nodeId]);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  // Build reverse index for downstream lookups
  const childMap = new Map<string, string[]>();
  for (const n of nodes) {
    for (const fid of n.from || []) {
      const arr = childMap.get(fid);
      if (arr) arr.push(n.id);
      else childMap.set(fid, [n.id]);
    }
  }

  // Trace upstream
  const upStack = [nodeId];
  while (upStack.length) {
    const id = upStack.pop()!;
    for (const fid of nodeMap.get(id)?.from || []) {
      if (!visited.has(fid)) { visited.add(fid); upStack.push(fid); }
    }
  }
  // Trace downstream
  const downStack = [nodeId];
  while (downStack.length) {
    const id = downStack.pop()!;
    for (const cid of childMap.get(id) || []) {
      if (!visited.has(cid)) { visited.add(cid); downStack.push(cid); }
    }
  }

  return visited;
}

/** Collect full KOL influence chain (upstream + downstream + influenced) */
export function getKolChain(kolId: string, nodes: KolNode[]): Set<string> {
  const visited = new Set<string>([kolId]);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Build reverse indexes
  const childMap = new Map<string, string[]>();
  const influencedByMap = new Map<string, string[]>();
  for (const n of nodes) {
    for (const fid of n.from || []) {
      const arr = childMap.get(fid);
      if (arr) arr.push(n.id); else childMap.set(fid, [n.id]);
    }
    for (const iid of n.influence || []) {
      const arr = influencedByMap.get(iid);
      if (arr) arr.push(n.id); else influencedByMap.set(iid, [n.id]);
    }
  }

  const queue = [kolId];
  while (queue.length) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (!node) continue;
    for (const fid of node.from || []) {
      if (!visited.has(fid)) { visited.add(fid); queue.push(fid); }
    }
    for (const iid of node.influence || []) {
      if (!visited.has(iid)) { visited.add(iid); queue.push(iid); }
    }
    for (const cid of childMap.get(id) || []) {
      if (!visited.has(cid)) { visited.add(cid); queue.push(cid); }
    }
  }

  return visited;
}

/** Collect full upstream + downstream chain from a narrative node */
export function getNarrativeChain(nodeId: string, nodes: NarrativeNode[]): Set<string> {
  const visited = new Set<string>([nodeId]);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const childMap = new Map<string, string[]>();
  for (const n of nodes) {
    for (const fid of n.from || []) {
      const arr = childMap.get(fid);
      if (arr) arr.push(n.id);
      else childMap.set(fid, [n.id]);
    }
  }

  const upStack = [nodeId];
  while (upStack.length) {
    const id = upStack.pop()!;
    for (const fid of nodeMap.get(id)?.from || []) {
      if (!visited.has(fid)) { visited.add(fid); upStack.push(fid); }
    }
  }
  const downStack = [nodeId];
  while (downStack.length) {
    const id = downStack.pop()!;
    for (const cid of childMap.get(id) || []) {
      if (!visited.has(cid)) { visited.add(cid); downStack.push(cid); }
    }
  }

  return visited;
}

/** Get ordered ancestor chain ending at the given event (for detail panel) */
export function getEventChainList(eventId: string, nodes: EventNode[]): EventNode[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const list: EventNode[] = [];
  const visited = new Set<string>();

  const trace = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    const ev = nodeMap.get(id);
    if (!ev) return;
    for (const fid of ev.from || []) trace(fid);
    list.push(ev);
  };

  trace(eventId);
  return list;
}
