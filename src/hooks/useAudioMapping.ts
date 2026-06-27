import { useCallback, useEffect, useMemo, useRef } from "react";
import { AudioEngine } from "../components/AudioEngine";
import { buildScaleFrequencies, buildScaleNotes } from "../utils/scales";
import { mapColumnToVoice } from "../utils/audioMapping";
import type { ColumnAnalysis, InstrumentSettings } from "../types";

/**
 * useAudioMapping
 * Bridges analysed image data and the AudioEngine. It owns the engine instance,
 * keeps it in sync with the user's settings, and exposes:
 *  - `start()`  : initialise audio inside a user gesture (autoplay-safe)
 *  - `stop()`   : release sustaining voices
 *  - `onAudioFrame(position, dt)` : called from the scanner RAF. Samples and
 *     triggers notes on a steady musical clock (not every frame) and returns
 *     the analysed column when a step fired (so the UI can draw trails in sync).
 */
export function useAudioMapping(
  settings: InstrumentSettings,
  sample: (position: number) => ColumnAnalysis | null
) {
  const engineRef = useRef<AudioEngine>(new AudioEngine());
  const accRef = useRef(0);

  // Pre-compute the scale ladder; only changes when scale/root changes.
  const { freqs, notes } = useMemo(
    () => ({
      freqs: buildScaleFrequencies(settings.rootNote, settings.scale, 3),
      notes: buildScaleNotes(settings.rootNote, settings.scale, 3),
    }),
    [settings.rootNote, settings.scale]
  );

  const start = useCallback(async () => {
    await engineRef.current.init(settings.volume, settings.reverb, settings.soundMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = useCallback(() => {
    engineRef.current.silence();
  }, []);

  // Keep engine parameters in sync with live settings.
  useEffect(() => {
    if (engineRef.current.isReady()) engineRef.current.setVolume(settings.volume);
  }, [settings.volume]);
  useEffect(() => {
    if (engineRef.current.isReady()) engineRef.current.setReverb(settings.reverb);
  }, [settings.reverb]);
  useEffect(() => {
    if (engineRef.current.isReady()) engineRef.current.setSoundMode(settings.soundMode);
  }, [settings.soundMode]);

  // Tear down the engine entirely on unmount.
  useEffect(() => {
    const engine = engineRef.current;
    return () => engine.dispose();
  }, []);

  /** Step interval (seconds) — faster, steadier pulse; slower, sparser pads. */
  const stepInterval = settings.soundMode === "pulse" ? 0.13 : 0.17;

  /**
   * Advance the audio clock. Returns the analysed column if a note step fired
   * this frame (used to drive synced visual trails), otherwise null.
   */
  const onAudioFrame = useCallback(
    (position: number, dt: number): ColumnAnalysis | null => {
      accRef.current += dt;
      if (accRef.current < stepInterval) return null;
      accRef.current = 0;

      const col = sample(position);
      if (!col) return null;

      const engine = engineRef.current;
      if (engine.isReady()) {
        const voice = mapColumnToVoice(col, freqs, notes);
        engine.step(voice);
      }
      return col;
    },
    [sample, freqs, notes, stepInterval]
  );

  return { start, stop, onAudioFrame, engineRef };
}
