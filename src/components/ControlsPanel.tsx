import { useRef } from "react";
import { SCALE_LABELS, ROOT_NOTE_OPTIONS } from "../utils/scales";
import { DemoImageSelector } from "./DemoImageSelector";
import { CameraInput } from "./CameraInput";
import type { DemoImage } from "../utils/demoImages";
import type { InstrumentSettings, ScaleId, SoundMode } from "../types";

interface Props {
  settings: InstrumentSettings;
  update: (patch: Partial<InstrumentSettings>) => void;
  visible: boolean;
  onToggleVisible: () => void;
  onTogglePlay: () => void;
  onUpload: (file: File) => void;
  activeDemoId: string | null;
  onSelectDemo: (demo: DemoImage) => void;
  cameraActive: boolean;
  cameraError: string | null;
  onEnableCamera: () => void;
  onDisableCamera: () => void;
}

const SOUND_MODES: { id: SoundMode; label: string }[] = [
  { id: "ambient", label: "Ambient" },
  { id: "glass", label: "Glass" },
  { id: "drone", label: "Drone" },
  { id: "pulse", label: "Pulse" },
];

const SCALE_IDS: ScaleId[] = [
  "minorPentatonic",
  "majorPentatonic",
  "dorian",
  "aeolian",
  "chromatic",
];

/**
 * ControlsPanel
 * Understated, collapsible control surface. Every control is a labelled,
 * keyboard-usable form element; nothing relies on colour alone.
 */
export function ControlsPanel({
  settings,
  update,
  visible,
  onToggleVisible,
  onTogglePlay,
  onUpload,
  activeDemoId,
  onSelectDemo,
  cameraActive,
  cameraError,
  onEnableCamera,
  onDisableCamera,
}: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <button
        type="button"
        className="panel-toggle"
        onClick={onToggleVisible}
        aria-expanded={visible}
        aria-controls="controls-panel"
      >
        {visible ? "Hide controls" : "Show controls"}
        <kbd>C</kbd>
      </button>

      <aside
        id="controls-panel"
        className={`controls ${visible ? "is-visible" : "is-hidden"}`}
        aria-label="Instrument controls"
        aria-hidden={!visible}
      >
        <div className="controls-row primary-row">
          <button
            type="button"
            className="play-btn"
            onClick={onTogglePlay}
            aria-label={settings.isPlaying ? "Pause" : "Play"}
            aria-pressed={settings.isPlaying}
          >
            <span aria-hidden="true">{settings.isPlaying ? "❚❚" : "▶"}</span>
            <span className="play-label">{settings.isPlaying ? "Pause" : "Play"}</span>
          </button>
          <kbd className="hint" aria-hidden="true">Space</kbd>
        </div>

        <fieldset className="controls-group">
          <legend>Source</legend>
          <DemoImageSelector activeId={activeDemoId} onSelect={onSelectDemo} />
          <div className="controls-row">
            <button type="button" className="control-btn" onClick={() => fileRef.current?.click()}>
              ↑ Upload image
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="visually-hidden"
              aria-label="Upload an image from your device"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
                e.target.value = "";
              }}
            />
          </div>
          <CameraInput
            active={cameraActive}
            error={cameraError}
            onEnable={onEnableCamera}
            onDisable={onDisableCamera}
          />
        </fieldset>

        <fieldset className="controls-group">
          <legend>Motion</legend>
          <label className="field">
            <span className="field-label">
              Scanner speed <output>{settings.speed.toFixed(2)}</output>
            </span>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.01}
              value={settings.speed}
              onChange={(e) => update({ speed: Number(e.target.value) })}
            />
          </label>
        </fieldset>

        <fieldset className="controls-group">
          <legend>Harmony</legend>
          <label className="field">
            <span className="field-label">Scale</span>
            <select
              value={settings.scale}
              onChange={(e) => update({ scale: e.target.value as ScaleId })}
            >
              {SCALE_IDS.map((id) => (
                <option key={id} value={id}>
                  {SCALE_LABELS[id]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Root note</span>
            <select
              value={settings.rootNote}
              onChange={(e) => update({ rootNote: e.target.value })}
            >
              {ROOT_NOTE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </fieldset>

        <fieldset className="controls-group">
          <legend>Sound mode</legend>
          <div className="segmented" role="radiogroup" aria-label="Sound mode">
            {SOUND_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={settings.soundMode === m.id}
                className={`seg ${settings.soundMode === m.id ? "is-active" : ""}`}
                onClick={() => update({ soundMode: m.id })}
              >
                {m.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="controls-group">
          <legend>Tone</legend>
          <label className="field">
            <span className="field-label">
              Reverb <output>{Math.round(settings.reverb * 100)}%</output>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={settings.reverb}
              onChange={(e) => update({ reverb: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span className="field-label">
              Volume <output>{Math.round(settings.volume * 100)}%</output>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={settings.volume}
              onChange={(e) => update({ volume: Number(e.target.value) })}
            />
          </label>
        </fieldset>

        <fieldset className="controls-group">
          <legend>Comfort</legend>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) => update({ reducedMotion: e.target.checked })}
            />
            <span>Reduce motion &amp; visual intensity</span>
          </label>
          <p className="comfort-note">
            Visuals stay calm by default. If motion feels intense, enable the option above.
          </p>
        </fieldset>
      </aside>
    </>
  );
}
