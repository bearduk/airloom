import * as Tone from "tone";
import type { SoundMode } from "../types";
import type { VoiceTarget } from "../utils/audioMapping";

/**
 * AudioEngine
 * -----------
 * A thin, imperative wrapper around a Tone.js signal graph. It is NOT a React
 * component — it owns the audio nodes for the lifetime of the instrument and is
 * driven by the useAudioMapping hook.
 *
 * Signal flow:
 *
 *   poly  ─┐
 *   sub   ─┼─▶ filter (lowpass) ─▶ reverb ─▶ limiter ─▶ master ─▶ output
 *   drone ─┘                         ▲
 *   shimmer ─────────────────────────┘   (shimmer feeds reverb directly for air)
 *
 * Nothing makes sound until `init()` is called from a user gesture (browser
 * autoplay policy). `dispose()` tears everything down to avoid leaks.
 */
export class AudioEngine {
  private ready = false;
  private mode: SoundMode = "ambient";

  // Nodes
  private master!: Tone.Gain;
  private limiter!: Tone.Limiter;
  private reverb!: Tone.Reverb;
  private filter!: Tone.Filter;
  private poly!: Tone.PolySynth;
  private sub!: Tone.MonoSynth;
  private subGain!: Tone.Gain;
  private drone!: Tone.Synth;
  private droneGain!: Tone.Gain;
  private shimmer!: Tone.Synth;
  private shimmerGain!: Tone.Gain;

  // State used to avoid muddy / machine-gun retriggers.
  private lastNote: string | null = null;
  private droneStarted = false;

  isReady(): boolean {
    return this.ready;
  }

  /** Must be called from within a user gesture handler. */
  async init(volume: number, reverbAmount: number, mode: SoundMode): Promise<void> {
    if (this.ready) return;
    await Tone.start();

    this.master = new Tone.Gain(linToGain(volume)).toDestination();
    this.limiter = new Tone.Limiter(-3).connect(this.master);
    this.reverb = new Tone.Reverb({ decay: 6, preDelay: 0.02, wet: reverbAmount }).connect(
      this.limiter
    );
    this.filter = new Tone.Filter({ type: "lowpass", frequency: 1200, Q: 0.7 }).connect(
      this.reverb
    );

    // Main polyphonic voice — pad / bell / pluck depending on mode.
    this.poly = new Tone.PolySynth(Tone.Synth).connect(this.filter);
    this.poly.maxPolyphony = 24;

    // Sub / warmth oscillator (driven by the red channel).
    this.subGain = new Tone.Gain(0).connect(this.filter);
    this.sub = new Tone.MonoSynth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.4, decay: 0.2, sustain: 0.9, release: 1.5 },
      filterEnvelope: { attack: 0.4, decay: 0.2, sustain: 0.6, release: 1.2, baseFrequency: 120, octaves: 2 },
    }).connect(this.subGain);

    // Continuous drone voice (only audible in drone mode), glides between notes.
    this.droneGain = new Tone.Gain(0).connect(this.filter);
    this.drone = new Tone.Synth({
      oscillator: { type: "fatsine", count: 3, spread: 18 },
      envelope: { attack: 2, decay: 0.5, sustain: 1, release: 3 },
      portamento: 0.25,
    }).connect(this.droneGain);

    // Shimmer voice (driven by the blue channel) feeds reverb for high air.
    this.shimmerGain = new Tone.Gain(0).connect(this.reverb);
    this.shimmer = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 1.2, sustain: 0, release: 1.5 },
    }).connect(this.shimmerGain);

    this.setSoundMode(mode);
    this.ready = true;
  }

  /** Reconfigure the main voice timbre/envelope for the chosen sound mode. */
  setSoundMode(mode: SoundMode): void {
    this.mode = mode;
    if (!this.poly) return;

    switch (mode) {
      case "ambient":
        this.poly.set({
          oscillator: { type: "triangle" },
          envelope: { attack: 0.6, decay: 0.8, sustain: 0.5, release: 3.5 },
        });
        break;
      case "glass":
        this.poly.set({
          oscillator: { type: "sine" },
          envelope: { attack: 0.005, decay: 1.6, sustain: 0.05, release: 2.2 },
        });
        break;
      case "drone":
        this.poly.set({
          oscillator: { type: "sine" },
          envelope: { attack: 1.5, decay: 1, sustain: 0.8, release: 4 },
        });
        break;
      case "pulse":
        this.poly.set({
          oscillator: { type: "triangle" },
          envelope: { attack: 0.005, decay: 0.25, sustain: 0.0, release: 0.4 },
        });
        break;
    }

    // Manage the continuous drone voice.
    if (this.drone) {
      if (mode === "drone" && !this.droneStarted) {
        this.drone.triggerAttack("C2", Tone.now());
        this.droneStarted = true;
      } else if (mode !== "drone" && this.droneStarted) {
        this.drone.triggerRelease(Tone.now());
        this.droneStarted = false;
      }
    }
  }

  setVolume(volume: number): void {
    if (this.master) this.master.gain.rampTo(linToGain(volume), 0.1);
  }

  setReverb(amount: number): void {
    if (this.reverb) this.reverb.wet.rampTo(clamp01(amount), 0.2);
  }

  /**
   * Play one analysed step. Called on a steady musical clock (not every frame).
   * Translates a VoiceTarget into actual audio events, shaped per sound mode.
   */
  step(voice: VoiceTarget): void {
    if (!this.ready) return;
    const t = Tone.now();
    const { note, velocity, filter, warmth, shimmer, accent } = voice;

    // Filter openness from saturation/blue -> 300Hz..6kHz, exponential feel.
    const cutoff = 300 + filter * filter * 5700;
    this.filter.frequency.rampTo(cutoff, 0.12);

    // Warmth: blend in the sub oscillator following the red channel.
    this.subGain.gain.rampTo(warmth * 0.18, 0.2);
    if (this.mode !== "pulse" && (note !== this.lastNote || accent)) {
      const subNote = transpose(note, -12);
      this.sub.triggerAttackRelease(subNote, "2n", t, 0.5 + warmth * 0.4);
    }

    // Drone glides toward the current pitch; its level follows brightness.
    if (this.mode === "drone") {
      this.drone.frequency.rampTo(transpose(note, -12), 0.3);
      this.droneGain.gain.rampTo(0.12 + velocity * 0.18, 0.3);
    }

    // Main voice behaviour differs per mode to stay musical (no harsh spam).
    const changed = note !== this.lastNote;
    switch (this.mode) {
      case "ambient":
        // Lush overlapping pad; only re-voice on change to avoid mud.
        if (changed || accent) this.poly.triggerAttackRelease(note, "1n", t, velocity * 0.5);
        break;
      case "glass":
        // Sparse bell tones on note change or contrast accents.
        if (changed || accent) this.poly.triggerAttackRelease(note, "2n", t, velocity * 0.6);
        break;
      case "drone":
        // Occasional swells layered over the continuous drone.
        if (accent) this.poly.triggerAttackRelease(note, "1n", t, velocity * 0.4);
        break;
      case "pulse":
        // Rhythmic: every step pulses, accents hit harder.
        this.poly.triggerAttackRelease(note, "16n", t, velocity * (accent ? 0.7 : 0.4));
        break;
    }

    // Shimmer: high airy ping when blue is strong, layered into reverb.
    if (shimmer > 0.45 && (changed || accent)) {
      this.shimmerGain.gain.rampTo(shimmer * 0.12, 0.1);
      this.shimmer.triggerAttackRelease(transpose(note, 12), "8n", t, shimmer * 0.5);
    }

    this.lastNote = note;
  }

  /** Release any sustaining voices without tearing the graph down. */
  silence(): void {
    if (!this.ready) return;
    try {
      this.poly.releaseAll();
      if (this.droneStarted) {
        this.drone.triggerRelease();
        this.droneStarted = false;
      }
      this.subGain.gain.rampTo(0, 0.3);
      this.droneGain.gain.rampTo(0, 0.3);
    } catch {
      /* no-op */
    }
    this.lastNote = null;
  }

  /** Fully tear down all nodes. Call on unmount. */
  dispose(): void {
    this.silence();
    [
      this.poly,
      this.sub,
      this.subGain,
      this.drone,
      this.droneGain,
      this.shimmer,
      this.shimmerGain,
      this.filter,
      this.reverb,
      this.limiter,
      this.master,
    ].forEach((n) => n?.dispose());
    this.ready = false;
  }
}

// --- helpers ---------------------------------------------------------
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
/** Map a 0..1 linear control to a perceptual gain (eased). */
function linToGain(v: number): number {
  const x = clamp01(v);
  return x * x * 0.9;
}
/** Transpose a note name by a number of semitones. */
function transpose(note: string, semitones: number): string {
  return Tone.Frequency(note).transpose(semitones).toNote();
}
