import { forwardRef, useImperativeHandle, useRef } from "react";

export interface ScannerHandle {
  /** Move the line to a normalised x (0..1) and tint its glow. */
  setPosition: (x: number, color: string) => void;
}

/**
 * Scanner
 * A soft, glowing vertical line overlaid on the image. Its position is driven
 * imperatively from the scanner RAF (no per-frame React re-render) so motion
 * stays buttery even alongside audio + trails.
 */
export const Scanner = forwardRef<ScannerHandle, { active: boolean }>(function Scanner(
  { active },
  ref
) {
  const lineRef = useRef<HTMLDivElement | null>(null);

  useImperativeHandle(ref, () => ({
    setPosition: (x, color) => {
      const el = lineRef.current;
      if (!el) return;
      el.style.left = `${x * 100}%`;
      el.style.setProperty("--scan-color", color);
    },
  }));

  return (
    <div
      ref={lineRef}
      className={`scan-line ${active ? "is-active" : ""}`}
      aria-hidden="true"
    />
  );
});
