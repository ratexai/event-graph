/* ═══════════════════════════════════════════════════════════════
   useGraphSelection hook
   ═══════════════════════════════════════════════════════════════ */

import { useState, useCallback } from "react";

export function useGraphSelection() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const selectNode = useCallback((id: string) => { setSelected(id); setPanelOpen(true); }, []);
  const closePanel = useCallback(() => { setPanelOpen(false); setSelected(null); }, []);

  return { hovered, setHovered, selected, setSelected: selectNode, panelOpen, closePanel };
}
