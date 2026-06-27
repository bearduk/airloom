import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImageStage } from "./components/ImageStage";
import { ControlsPanel } from "./components/ControlsPanel";
import type { ScannerHandle } from "./components/Scanner";
import type { TrailsHandle } from "./components/VisualTrails";
import { useImageCanvas, type AnalysisSource } from "./hooks/useImageCanvas";
import { useScanner } from "./hooks/useScanner";
import { useAudioMapping } from "./hooks/useAudioMapping";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { DEMO_IMAGES, renderDemoToDataURL, type DemoImage } from "./utils/demoImages";
import type { InstrumentSettings } from "./types";

const DEFAULT_SETTINGS: InstrumentSettings = {
  isPlaying: false,
  speed: 0.16,
  scale: "minorPentatonic",
  rootNote: "C3",
  soundMode: "ambient",
  reverb: 0.55,
  volume: 0.7,
  scanMode: "leftToRight",
  reducedMotion:
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
};

export default function App() {
  const [settings, setSettings] = useState<InstrumentSettings>(DEFAULT_SETTINGS);
  const [controlsVisible, setControlsVisible] = useState(true);

  // --- Source state -------------------------------------------------
  const [mode, setMode] = useState<"image" | "camera">("image");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [activeDemoId, setActiveDemoId] = useState<string | null>(null);
  const [analysisSource, setAnalysisSource] = useState<AnalysisSource>(null);

  // --- Camera state -------------------------------------------------
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const previousImageSrc = useRef<string | null>(null);

  const scannerRef = useRef<ScannerHandle>(null);
  const trailsRef = useRef<TrailsHandle>(null);
  const lastColorRef = useRef<string>("rgba(180, 200, 230, 0.9)");
  const audioStartedRef = useRef(false);

  const update = useCallback((patch: Partial<InstrumentSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  // Image analysis + audio mapping.
  const { sample } = useImageCanvas(analysisSource);
  const { start, stop, onAudioFrame } = useAudioMapping(settings, sample);

  // --- The single animation heartbeat ------------------------------
  const handleFrame = useCallback(
    (position: number, dt: number) => {
      const stepped = onAudioFrame(position, dt);
      if (stepped) {
        lastColorRef.current = stepped.cssColor;
        // Intensity blends brightness + saturation; trails follow the colour.
        const intensity = Math.min(1, stepped.brightness * 0.7 + stepped.saturation * 0.5);
        trailsRef.current?.emit(position, stepped.cssColor, intensity);
      }
      scannerRef.current?.setPosition(position, lastColorRef.current);
    },
    [onAudioFrame]
  );

  useScanner({
    isPlaying: settings.isPlaying,
    speed: settings.speed,
    scanMode: settings.scanMode,
    reducedMotion: settings.reducedMotion,
    onFrame: handleFrame,
  });

  // --- Load the first demo image on mount --------------------------
  useEffect(() => {
    loadDemo(DEMO_IMAGES[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDemo = useCallback((demo: DemoImage) => {
    const url = renderDemoToDataURL(demo);
    setMode("image");
    setImageSrc(url);
    setActiveDemoId(demo.id);
  }, []);

  const handleUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setMode("image");
      setImageSrc(reader.result as string);
      setActiveDemoId(null);
    };
    reader.readAsDataURL(file);
  }, []);

  // ImageStage tells us when the actual media element is ready to analyse.
  const handleImageReady = useCallback((el: HTMLImageElement) => {
    setAnalysisSource({ kind: "image", element: el });
  }, []);
  const handleVideoReady = useCallback((el: HTMLVideoElement) => {
    setAnalysisSource({ kind: "video", element: el });
  }, []);

  // --- Play / pause (audio starts inside this user gesture) --------
  const togglePlay = useCallback(async () => {
    if (!settings.isPlaying) {
      if (!audioStartedRef.current) {
        try {
          await start();
          audioStartedRef.current = true;
        } catch {
          /* audio failed to start; still allow visual scanning */
        }
      }
      update({ isPlaying: true });
    } else {
      update({ isPlaying: false });
      stop();
    }
  }, [settings.isPlaying, start, stop, update]);

  // --- Camera lifecycle --------------------------------------------
  const enableCamera = useCallback(async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      previousImageSrc.current = imageSrc;
      setCameraStream(stream);
      setMode("camera");
      setActiveDemoId(null);
    } catch (err) {
      const name = (err as DOMException)?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setCameraError("Camera permission was denied. You can re-enable it in your browser settings.");
      } else if (name === "NotFoundError") {
        setCameraError("No camera was found on this device.");
      } else {
        setCameraError("Could not start the camera. Please try again.");
      }
    }
  }, [imageSrc]);

  const stopCameraTracks = useCallback((stream: MediaStream | null) => {
    stream?.getTracks().forEach((t) => t.stop());
  }, []);

  const disableCamera = useCallback(() => {
    stopCameraTracks(cameraStream);
    setCameraStream(null);
    setMode("image");
    // Restore the previously shown image.
    if (previousImageSrc.current) setImageSrc(previousImageSrc.current);
    setAnalysisSource(null);
  }, [cameraStream, stopCameraTracks]);

  // Ensure tracks are stopped if the component unmounts mid-stream.
  useEffect(() => {
    return () => stopCameraTracks(cameraStream);
  }, [cameraStream, stopCameraTracks]);

  // --- Keyboard shortcuts ------------------------------------------
  const randomiseDemo = useCallback(() => {
    const pool = DEMO_IMAGES.filter((d) => d.id !== activeDemoId);
    const next = pool[Math.floor(Math.random() * pool.length)] ?? DEMO_IMAGES[0];
    if (mode === "camera") disableCamera();
    loadDemo(next);
  }, [activeDemoId, mode, disableCamera, loadDemo]);

  useKeyboardShortcuts({
    onTogglePlay: togglePlay,
    onRandomise: randomiseDemo,
    onToggleControls: () => setControlsVisible((v) => !v),
  });

  const headerTagline = useMemo(
    () => ["Play images as living sound.", "Scan colour. Hear light."],
    []
  );

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Airloom
        </h1>
        <p className="tagline">{headerTagline[0]}</p>
      </header>

      <main className="app-main">
        <ImageStage
          mode={mode}
          imageSrc={imageSrc}
          cameraStream={cameraStream}
          isPlaying={settings.isPlaying}
          reducedMotion={settings.reducedMotion}
          scannerRef={scannerRef}
          trailsRef={trailsRef}
          onImageReady={handleImageReady}
          onVideoReady={handleVideoReady}
        />
      </main>

      <ControlsPanel
        settings={settings}
        update={update}
        visible={controlsVisible}
        onToggleVisible={() => setControlsVisible((v) => !v)}
        onTogglePlay={togglePlay}
        onUpload={handleUpload}
        activeDemoId={activeDemoId}
        onSelectDemo={(d) => {
          if (mode === "camera") disableCamera();
          loadDemo(d);
        }}
        cameraActive={mode === "camera"}
        cameraError={cameraError}
        onEnableCamera={enableCamera}
        onDisableCamera={disableCamera}
      />

      <footer className="app-footer">
        <span className="kbd-legend">
          <kbd>Space</kbd> play · <kbd>R</kbd> randomise · <kbd>C</kbd> controls
        </span>
      </footer>
    </div>
  );
}
