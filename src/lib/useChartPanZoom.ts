'use client';
import { useState, useRef, useCallback, useEffect } from 'react';

const MIN_ZOOM = 0.05;
const PAN_PX   = 6;

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function pinchDist(t: TouchList) {
  const dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export interface PanZoomResult {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  domain:    [number, number] | ['dataMin', 'dataMax'];
  isZoomed:  boolean;
  resetZoom: () => void;
}

export function useChartPanZoom(dataMin: number, dataMax: number): PanZoomResult {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const domainRef  = useRef<[number, number]>([dataMin, dataMax]);

  const [state, setState] = useState<{
    domain: [number, number] | ['dataMin', 'dataMax'];
    isZoomed: boolean;
  }>({ domain: ['dataMin', 'dataMax'], isZoomed: false });

  // Reset on data-bounds change
  const prevMin = useRef(dataMin), prevMax = useRef(dataMax);
  useEffect(() => {
    if (prevMin.current !== dataMin || prevMax.current !== dataMax) {
      prevMin.current = dataMin; prevMax.current = dataMax;
      domainRef.current = [dataMin, dataMax];
      setState({ domain: ['dataMin', 'dataMax'], isZoomed: false });
    }
  }, [dataMin, dataMax]);

  const totalRange = (dataMax - dataMin) || 1;

  const commit = useCallback((lo: number, hi: number) => {
    const minW = totalRange * MIN_ZOOM;
    if (hi - lo < minW) { const c = (lo + hi) / 2; lo = c - minW / 2; hi = c + minW / 2; }
    if (lo < dataMin) { hi = Math.min(dataMax, hi + (dataMin - lo)); lo = dataMin; }
    if (hi > dataMax) { lo = Math.max(dataMin, lo - (hi - dataMax)); hi = dataMax; }
    const full = hi - lo >= totalRange * 0.99;
    domainRef.current = [lo, hi];
    setState(full ? { domain: ['dataMin', 'dataMax'], isZoomed: false }
                  : { domain: [lo, hi],               isZoomed: true  });
  }, [dataMin, dataMax, totalRange]);

  const resetZoom = useCallback(() => {
    domainRef.current = [dataMin, dataMax];
    setState({ domain: ['dataMin', 'dataMax'], isZoomed: false });
  }, [dataMin, dataMax]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    // Redeclare as non-nullable so TypeScript is happy inside nested functions.
    // The null check above guarantees safety at runtime.
    const node: HTMLDivElement = el as HTMLDivElement;

    let startX = 0, lastX = 0, isPanning = false, lastPinch = 0;

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 1) {
        startX = lastX = e.touches[0].clientX; isPanning = false; lastPinch = 0;
      } else if (e.touches.length === 2) {
        lastPinch = pinchDist(e.touches); isPanning = false;
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 2) {
        e.preventDefault(); e.stopPropagation();
        const dist = pinchDist(e.touches);
        if (lastPinch > 0) {
          const scale = lastPinch / dist;
          const [lo, hi] = domainRef.current;
          const range = hi - lo;
          const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const rect = node.getBoundingClientRect();
          const ratio = clamp((cx - rect.left) / rect.width, 0, 1);
          const focus = lo + ratio * range;
          commit(focus - ratio * range * scale, focus + (1 - ratio) * range * scale);
        }
        lastPinch = dist;
      } else if (e.touches.length === 1) {
        const moved = e.touches[0].clientX - startX;
        if (!isPanning && Math.abs(moved) > PAN_PX) isPanning = true;
        if (isPanning) {
          e.preventDefault(); e.stopPropagation();
          const dx = e.touches[0].clientX - lastX;
          const [lo, hi] = domainRef.current;
          const msPx = (hi - lo) / (node.offsetWidth || 1);
          commit(lo - dx * msPx, hi - dx * msPx);
        }
        lastX = e.touches[0].clientX;
      }
    }

    function onTouchEnd() { isPanning = false; lastPinch = 0; }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = node.getBoundingClientRect();
      const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      const factor = e.deltaY > 0 ? 1.2 : 1 / 1.2;
      const [lo, hi] = domainRef.current;
      const range = hi - lo;
      const focus = lo + ratio * range;
      commit(focus - ratio * range * factor, focus + (1 - ratio) * range * factor);
    }

    node.addEventListener('touchstart', onTouchStart, { passive: true  });
    node.addEventListener('touchmove',  onTouchMove,  { passive: false });
    node.addEventListener('touchend',   onTouchEnd,   { passive: true  });
    node.addEventListener('wheel',      onWheel,      { passive: false });

    return () => {
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove',  onTouchMove);
      node.removeEventListener('touchend',   onTouchEnd);
      node.removeEventListener('wheel',      onWheel);
    };
  }, [commit]);

  return { wrapperRef, domain: state.domain, isZoomed: state.isZoomed, resetZoom };
}
