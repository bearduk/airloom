import type { ColumnAnalysis } from "../types";

/**
 * Convert an RGB triple (0..255) to HSL.
 * Returns hue 0..360, saturation 0..1, lightness 0..1.
 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return [h, s, l];
}

/**
 * Analyse a single vertical slice of image data into perceptual + channel values.
 * `data` is RGBA from a downscaled canvas of width `w` and height `h`.
 * `x` is the column index, `position` is its normalised location 0..1.
 *
 * Sampling is deliberately coarse (every few rows) to keep reads cheap.
 */
export function analyseColumn(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  position: number
): ColumnAnalysis {
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;
  let prevLum = -1;
  let contrastSum = 0;
  let contrastCount = 0;

  const step = Math.max(1, Math.floor(h / 48)); // sample ~48 rows max
  for (let y = 0; y < h; y += step) {
    const i = (y * w + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    rSum += r;
    gSum += g;
    bSum += b;
    count++;
    // Perceptual luminance for contrast / transient detection.
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (prevLum >= 0) {
      contrastSum += Math.abs(lum - prevLum);
      contrastCount++;
    }
    prevLum = lum;
  }

  const r = rSum / count;
  const g = gSum / count;
  const b = bSum / count;
  const [hue, saturation, brightness] = rgbToHsl(r, g, b);
  const contrast = contrastCount > 0 ? Math.min(1, contrastSum / contrastCount / 128) : 0;

  return {
    position,
    hue,
    saturation,
    brightness,
    red: r / 255,
    green: g / 255,
    blue: b / 255,
    contrast,
    cssColor: `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`,
  };
}
