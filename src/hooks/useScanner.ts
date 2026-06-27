import { useEffect, useRef } from "react";
import type { ScanMode } from "../types";

interface ScannerOptions {
  isPlaying: boolean;
  /** 0.05..1 — fraction of the image traversed per second. */
  speed: number;
  scanMode: ScanMode;
  reducedMotion: boolean;
  /** Called every animation frame with the current position (0..1) and dt seconds. */
  onFrame: (position: number, dt: number) => void;
}

/**
 * useScanner
 * Owns a single requestAnimationFrame loop that advances a normalised scan
 * position from 0..1 and loops. The loop is the heartbeat for both the visual
 * scan line and the audio clock; consumers react via `onFrame`.
 *
 * The RAF is always cleaned up on unmount / dependency change (no leaks).
 */
export function useScanner({ isPlaying, speed, scanMode, reducedMotion, onFrame }: ScannerOptions) {
  const positionRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  // Keep the latest onFrame without restarting the loop each render.
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
      return;
    }

    const tick = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      let dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      // Guard against huge dt after a tab is backgrounded.
      if (dt > 0.1) dt = 0.1;

      // Reduced motion: still progresses (so sound continues) but smoothly.
      const effectiveSpeed = reducedMotion ? Math.min(speed, 0.18) : speed;
      let pos = positionRef.current + effectiveSpeed * dt;
      if (pos >= 1) pos -= 1; // loop
      positionRef.current = pos;

      onFrameRef.current(pos, dt);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
    };
    // scanMode included so future axes restart cleanly.
  }, [isPlaying, speed, reducedMotion, scanMode]);

  return { positionRef };
}
