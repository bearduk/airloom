import { useCallback, useEffect, useRef, useState } from "react";
import { analyseColumn } from "../utils/colourAnalysis";
import type { ColumnAnalysis } from "../types";

/** A source that can be analysed: a loaded image or a playing video. */
export type AnalysisSource =
  | { kind: "image"; element: HTMLImageElement }
  | { kind: "video"; element: HTMLVideoElement }
  | null;

const ANALYSIS_W = 256;
const ANALYSIS_H = 160;

/**
 * useImageCanvas
 * Maintains a small offscreen canvas used purely for pixel analysis.
 * - Static images are drawn once and their pixels cached.
 * - Video sources are re-drawn on each sample (camera mode).
 * Reads are kept cheap (256x160, coarse row sampling in analyseColumn).
 */
export function useImageCanvas(source: AnalysisSource) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const cachedData = useRef<Uint8ClampedArray | null>(null);
  const [isReady, setReady] = useState(false);

  // Lazily create the offscreen analysis canvas once.
  if (!canvasRef.current) {
    const c = document.createElement("canvas");
    c.width = ANALYSIS_W;
    c.height = ANALYSIS_H;
    canvasRef.current = c;
    ctxRef.current = c.getContext("2d", { willReadFrequently: true });
  }

  const drawSource = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx || !source) return false;
    try {
      if (source.kind === "image") {
        ctx.drawImage(source.element, 0, 0, ANALYSIS_W, ANALYSIS_H);
      } else {
        if (source.element.readyState < 2) return false; // not enough data yet
        ctx.drawImage(source.element, 0, 0, ANALYSIS_W, ANALYSIS_H);
      }
      return true;
    } catch {
      return false; // e.g. tainted canvas / not decoded yet
    }
  }, [source]);

  // When the source changes, (re)initialise. Cache pixels for static images.
  useEffect(() => {
    cachedData.current = null;
    setReady(false);
    if (!source) return;

    let cancelled = false;
    const prime = () => {
      if (cancelled) return;
      const ok = drawSource();
      if (!ok) {
        // retry shortly (image still decoding / video warming up)
        window.setTimeout(prime, 60);
        return;
      }
      if (source.kind === "image") {
        const ctx = ctxRef.current!;
        cachedData.current = ctx.getImageData(0, 0, ANALYSIS_W, ANALYSIS_H).data;
      }
      setReady(true);
    };
    prime();
    return () => {
      cancelled = true;
    };
  }, [source, drawSource]);

  /**
   * Sample the analysed slice at a normalised position (0..1) along the
   * horizontal axis. Returns null until the source is ready.
   */
  const sample = useCallback(
    (position: number): ColumnAnalysis | null => {
      const ctx = ctxRef.current;
      if (!ctx || !source) return null;

      let data: Uint8ClampedArray | null;
      if (source.kind === "video") {
        if (!drawSource()) return null;
        data = ctx.getImageData(0, 0, ANALYSIS_W, ANALYSIS_H).data;
      } else {
        data = cachedData.current;
      }
      if (!data) return null;

      const clamped = Math.max(0, Math.min(0.999, position));
      const x = Math.floor(clamped * ANALYSIS_W);
      return analyseColumn(data, ANALYSIS_W, ANALYSIS_H, x, clamped);
    },
    [source, drawSource]
  );

  return { isReady, sample, analysisWidth: ANALYSIS_W, analysisHeight: ANALYSIS_H };
}
