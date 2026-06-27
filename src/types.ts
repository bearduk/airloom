// Shared types for Airloom.

/** A musical sound character. */
export type SoundMode = "ambient" | "glass" | "drone" | "pulse";

/** Identifier for a quantisation scale. */
export type ScaleId =
  | "minorPentatonic"
  | "majorPentatonic"
  | "dorian"
  | "aeolian"
  | "chromatic";

/** Direction the scanner travels. Architecture allows future modes. */
export type ScanMode = "leftToRight" | "rightToLeft" | "topToBottom" | "bottomToTop";

/** The analysed result of a single column (or row) slice of the image. */
export interface ColumnAnalysis {
  /** Normalised position of the slice along the scan axis, 0..1. */
  position: number;
  /** Average hue 0..360. */
  hue: number;
  /** Average saturation 0..1. */
  saturation: number;
  /** Average brightness/lightness 0..1. */
  brightness: number;
  /** Average red channel 0..1. */
  red: number;
  /** Average green channel 0..1. */
  green: number;
  /** Average blue channel 0..1. */
  blue: number;
  /** Vertical contrast within the slice 0..1 (edge / transient energy). */
  contrast: number;
  /** Representative CSS colour for visual feedback. */
  cssColor: string;
}

/** Live, user-controllable instrument settings. */
export interface InstrumentSettings {
  isPlaying: boolean;
  /** Scanner traversal speed, 0.05..1 (fraction of width per second-ish). */
  speed: number;
  scale: ScaleId;
  /** Root note name with octave, e.g. "C3". */
  rootNote: string;
  soundMode: SoundMode;
  /** Reverb wet amount 0..1. */
  reverb: number;
  /** Master volume 0..1. */
  volume: number;
  scanMode: ScanMode;
  reducedMotion: boolean;
}
