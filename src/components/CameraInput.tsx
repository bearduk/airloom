interface Props {
  active: boolean;
  error: string | null;
  onEnable: () => void;
  onDisable: () => void;
}

/**
 * CameraInput
 * Explicit, opt-in control for live camera mode. The camera is never started
 * automatically; the user must click. Permission denial is surfaced clearly,
 * and a prominent control stops the camera (App stops the tracks).
 */
export function CameraInput({ active, error, onEnable, onDisable }: Props) {
  return (
    <div className="camera-input">
      {active ? (
        <button
          type="button"
          className="control-btn danger"
          onClick={onDisable}
          aria-label="Stop camera and turn off live mode"
        >
          ◉ Stop camera
        </button>
      ) : (
        <button
          type="button"
          className="control-btn"
          onClick={onEnable}
          aria-label="Enable live camera mode (asks for permission)"
        >
          ◎ Use live camera
        </button>
      )}
      {error && (
        <p className="camera-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
