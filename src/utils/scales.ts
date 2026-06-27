import type { ScaleId } from "../types";

/** Semitone offsets from the root for each supported scale. */
export const SCALE_INTERVALS: Record<ScaleId, number[]> = {
  minorPentatonic: [0, 3, 5, 7, 10],
  majorPentatonic: [0, 2, 4, 7, 9],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

export const SCALE_LABELS: Record<ScaleId, string> = {
  minorPentatonic: "Minor Pentatonic",
  majorPentatonic: "Major Pentatonic",
  dorian: "Dorian",
  aeolian: "Aeolian (Natural Minor)",
  chromatic: "Chromatic",
};

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const ROOT_NOTE_OPTIONS = ["C2", "D2", "E2", "G2", "A2", "C3", "D3", "E3", "G3", "A3"];

/** Convert a note name with octave (e.g. "C3") to a MIDI number. */
export function noteToMidi(note: string): number {
  const match = /^([A-G]#?)(-?\d+)$/.exec(note.trim());
  if (!match) return 48; // fallback C3
  const [, name, octaveStr] = match;
  const semitone = NOTE_NAMES.indexOf(name);
  const octave = parseInt(octaveStr, 10);
  return (octave + 1) * 12 + semitone;
}

/** Convert a MIDI number to a frequency in Hz (A4 = 440). */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Convert a MIDI number back to a note name for display / Tone.js. */
export function midiToNote(midi: number): string {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

/**
 * Build an ascending ladder of frequencies spanning `octaves` from the root,
 * restricted to the chosen scale. Used to quantise hue -> pitch.
 */
export function buildScaleFrequencies(rootNote: string, scale: ScaleId, octaves = 3): number[] {
  const rootMidi = noteToMidi(rootNote);
  const intervals = SCALE_INTERVALS[scale];
  const freqs: number[] = [];
  for (let o = 0; o < octaves; o++) {
    for (const interval of intervals) {
      freqs.push(midiToFreq(rootMidi + o * 12 + interval));
    }
  }
  return freqs;
}

/** As above but returns note names (Tone.js friendly). */
export function buildScaleNotes(rootNote: string, scale: ScaleId, octaves = 3): string[] {
  const rootMidi = noteToMidi(rootNote);
  const intervals = SCALE_INTERVALS[scale];
  const notes: string[] = [];
  for (let o = 0; o < octaves; o++) {
    for (const interval of intervals) {
      notes.push(midiToNote(rootMidi + o * 12 + interval));
    }
  }
  return notes;
}
