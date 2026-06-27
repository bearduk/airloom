import type { ColumnAnalysis } from "../types";

/**
 * ====================================================================
 *  SOUND MAPPING
 *  This module turns an analysed image slice into musical parameters.
 *  It is intentionally pure (no audio nodes) so the mapping can be
 *  tested and reasoned about independently of the audio engine.
 *
 *  Guiding mappings (kept musical & atmospheric, never harsh):
 *    - Hue        -> note index within the active scale (pitch)
 *    - Brightness -> note velocity / volume
 *    - Saturation -> filter openness & harmonic richness
 *    - Red        -> warmth (low oscillator / sub presence)
 *    - Green      -> mid texture
 *    - Blue       -> shimmer / high-frequency air & reverb send
 *    - Contrast   -> rhythmic accent / transient probability
 * ====================================================================
 */

export interface VoiceTarget {
  /** Frequency to play, already quantised to the scale, in Hz. */
  frequency: number;
  /** The chosen note name (Tone.js friendly), e.g. "E3". */
  note: string;
  /** 0..1 gain for this event (from brightness). */
  velocity: number;
  /** 0..1 normalised filter cutoff (from saturation, lifted by blue). */
  filter: number;
  /** 0..1 sub / warmth amount (from red). */
  warmth: number;
  /** 0..1 shimmer amount (from blue). */
  shimmer: number;
  /** True when a transient accent should be triggered this step. */
  accent: boolean;
}

/**
 * Map an analysed slice onto a target voice using the provided scale ladders.
 * `scaleFreqs` and `scaleNotes` are parallel arrays (ascending).
 */
export function mapColumnToVoice(
  col: ColumnAnalysis,
  scaleFreqs: number[],
  scaleNotes: string[]
): VoiceTarget {
  // --- Hue -> pitch -------------------------------------------------
  // Hue (0..360) selects an index along the scale ladder. Lower hues map
  // to lower notes; the full hue wheel spans the whole pitch range so the
  // image's colour journey becomes a melodic journey.
  const n = scaleFreqs.length;
  const idx = Math.min(n - 1, Math.max(0, Math.round((col.hue / 360) * (n - 1))));
  const frequency = scaleFreqs[idx];
  const note = scaleNotes[idx];

  // --- Brightness -> velocity --------------------------------------
  // Darker pixels whisper, brighter pixels sing. A floor keeps very dark
  // regions audible but quiet so nothing drops out entirely.
  const velocity = 0.12 + col.brightness * 0.88;

  // --- Saturation (+blue air) -> filter openness -------------------
  // Greyer colours stay soft and veiled; vivid colours open the filter for
  // a richer, brighter timbre. Blue adds a touch of high-end air.
  const filter = Math.min(1, col.saturation * 0.8 + col.blue * 0.2);

  // --- Red -> warmth, Blue -> shimmer ------------------------------
  const warmth = col.red; // drives a low/sub oscillator blend
  const shimmer = col.blue; // drives high shimmer + reverb send

  // --- Contrast -> rhythmic accent ---------------------------------
  // High local contrast (an edge in the image) produces a transient accent,
  // giving the performance rhythm that follows the picture's structure.
  const accent = col.contrast > 0.22;

  return { frequency, note, velocity, filter, warmth, shimmer, accent };
}
