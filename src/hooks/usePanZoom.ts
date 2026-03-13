/* ═══════════════════════════════════════════════════════════════
   usePanZoom hook
   ═══════════════════════════════════════════════════════════════ */

import { useState, useRef, useCallback, useMemo } from "react";

export interface PanZoomState {
  zoom: number;
  pan: { x: number; y: number };
  isPanning: boolean;
  handlers: {
    onWheel: (e: React.WheelEvent) => void;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  /** Fit all content into the viewport. extraZoomOut < 1 zooms out further (e.g. 0.85 for mobile overview). */
  fitContent: (contentWidth: number, contentHeight: number, viewportWidth: number, viewportHeight: number, extraZoomOut?: number) => void;
  /** Pan + zoom to fit a specific bounding rect within the viewport */
  fitRect: (rect: { minX: number; minY: number; maxX: number; maxY: number }, viewportWidth: number, viewportHeight: number, padding?: number) => void;
}

export function usePanZoom(opts?: {
  minZoom?: number; maxZoom?: number; zoomStep?: number; nodeClassName?: string;
}): PanZoomState {
  const { minZoom = 0.35, maxZoom = 2.5, zoomStep = 0.15, nodeClassName = "nd" } = opts || {};
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const [isPanning, setIsPanning] = useState(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const panRef = useRef(pan);
  panRef.current = pan;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartZoom = useRef(1);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(minZoom, Math.min(maxZoom, z - e.deltaY * 0.001)));
  }, [minZoom, maxZoom]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(`.${nodeClassName}`)) return;
    isPanningRef.current = true;
    setIsPanning(true);
    dragStart.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
  }, [nodeClassName]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanningRef.current || !dragStart.current) return;
    setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  }, []);

  const onMouseUp = useCallback(() => {
    isPanningRef.current = false;
    setIsPanning(false);
    dragStart.current = null;
  }, []);

  // Touch: compute distance between two fingers
  const touchDist = (t: React.TouchList) => {
    if (t.length < 2) return 0;
    const dx = t[0].clientX - t[1].clientX;
    const dy = t[0].clientY - t[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch-to-zoom start
      pinchStartDist.current = touchDist(e.touches);
      pinchStartZoom.current = zoomRef.current;
    } else if (e.touches.length === 1) {
      if ((e.target as HTMLElement).closest(`.${nodeClassName}`)) return;
      isPanningRef.current = true;
      setIsPanning(true);
      dragStart.current = {
        x: e.touches[0].clientX - panRef.current.x,
        y: e.touches[0].clientY - panRef.current.y,
      };
    }
  }, [nodeClassName]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDist.current) {
      // Pinch-to-zoom
      const dist = touchDist(e.touches);
      const scale = dist / pinchStartDist.current;
      setZoom(Math.max(minZoom, Math.min(maxZoom, pinchStartZoom.current * scale)));
    } else if (e.touches.length === 1 && isPanningRef.current && dragStart.current) {
      // Pan
      setPan({
        x: e.touches[0].clientX - dragStart.current.x,
        y: e.touches[0].clientY - dragStart.current.y,
      });
    }
  }, [minZoom, maxZoom]);

  const onTouchEnd = useCallback(() => {
    isPanningRef.current = false;
    setIsPanning(false);
    dragStart.current = null;
    pinchStartDist.current = null;
  }, []);

  const handlers = useMemo(() => ({
    onWheel, onMouseDown, onMouseMove, onMouseUp, onMouseLeave: onMouseUp,
    onTouchStart, onTouchMove, onTouchEnd,
  }), [onWheel, onMouseDown, onMouseMove, onMouseUp, onTouchStart, onTouchMove, onTouchEnd]);

  const fitContent = useCallback((contentWidth: number, contentHeight: number, viewportWidth: number, viewportHeight: number, extraZoomOut = 1) => {
    if (contentWidth <= 0 || viewportWidth <= 0) return;
    const zx = viewportWidth / contentWidth;
    const zy = viewportHeight / contentHeight;
    const fitZoom = Math.max(minZoom, Math.min(1, Math.min(zx, zy) * extraZoomOut));
    setZoom(fitZoom);
    // Center content
    const scaledW = contentWidth * fitZoom;
    const offsetX = (viewportWidth - scaledW) / 2;
    const scaledH = contentHeight * fitZoom;
    const offsetY = (viewportHeight - scaledH) / 2;
    setPan({ x: Math.max(0, offsetX), y: Math.max(0, offsetY) });
  }, [minZoom]);

  const fitRect = useCallback((
    rect: { minX: number; minY: number; maxX: number; maxY: number },
    viewportWidth: number,
    viewportHeight: number,
    padding = 60,
  ) => {
    const rectW = rect.maxX - rect.minX + padding * 2;
    const rectH = rect.maxY - rect.minY + padding * 2;
    if (rectW <= 0 || rectH <= 0 || viewportWidth <= 0 || viewportHeight <= 0) return;
    const zx = viewportWidth / rectW;
    const zy = viewportHeight / rectH;
    const fitZoom = Math.max(minZoom, Math.min(maxZoom, Math.min(zx, zy)));
    setZoom(fitZoom);
    const cx = (rect.minX + rect.maxX) / 2;
    const cy = (rect.minY + rect.maxY) / 2;
    setPan({
      x: viewportWidth / 2 - cx * fitZoom,
      y: viewportHeight / 2 - cy * fitZoom,
    });
  }, [minZoom, maxZoom]);

  return {
    zoom, pan, isPanning,
    handlers,
    zoomIn: useCallback(() => setZoom((z) => Math.min(maxZoom, z + zoomStep)), [maxZoom, zoomStep]),
    zoomOut: useCallback(() => setZoom((z) => Math.max(minZoom, z - zoomStep)), [minZoom, zoomStep]),
    reset: useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []),
    fitContent,
    fitRect,
  };
}
