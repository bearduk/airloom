import { useEffect, useRef, useState } from "react";
import { Scanner, type ScannerHandle } from "./Scanner";
import { VisualTrails, type TrailsHandle } from "./VisualTrails";

interface ImageStageProps {
  mode: "image" | "camera";
  imageSrc: string | null;
  cameraStream: MediaStream | null;
  isPlaying: boolean;
  reducedMotion: boolean;
  scannerRef: React.RefObject<ScannerHandle>;
  trailsRef: React.RefObject<TrailsHandle>;
  onImageReady: (el: HTMLImageElement) => void;
  onVideoReady: (el: HTMLVideoElement) => void;
}

/**
 * ImageStage
 * The hero of the interface: the image (or live camera) is shown large and
 * centred, with the scanner line and visual trails layered exactly on top.
 * The stage matches the media's aspect ratio so the scan line stays aligned
 * with the pixels being analysed.
 */
export function ImageStage({
  mode,
  imageSrc,
  cameraStream,
  isPlaying,
  reducedMotion,
  scannerRef,
  trailsRef,
  onImageReady,
  onVideoReady,
}: ImageStageProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [aspect, setAspect] = useState(16 / 10);

  // Attach the camera stream to the video element.
  useEffect(() => {
    const v = videoRef.current;
    if (mode !== "camera" || !v || !cameraStream) return;
    v.srcObject = cameraStream;
    const onMeta = () => {
      if (v.videoWidth && v.videoHeight) setAspect(v.videoWidth / v.videoHeight);
    };
    v.addEventListener("loadedmetadata", onMeta);
    v.play().catch(() => {/* autoplay of muted video; ignore */});
    return () => v.removeEventListener("loadedmetadata", onMeta);
  }, [mode, cameraStream]);

  return (
    <div className="stage" style={{ aspectRatio: String(aspect) }}>
      {mode === "image" && imageSrc && (
        <img
          ref={imgRef}
          src={imageSrc}
          alt="The image currently being performed as sound"
          className="stage-media"
          crossOrigin="anonymous"
          onLoad={(e) => {
            const el = e.currentTarget;
            if (el.naturalWidth && el.naturalHeight) {
              setAspect(el.naturalWidth / el.naturalHeight);
            }
            onImageReady(el);
          }}
        />
      )}

      {mode === "camera" && (
        <video
          ref={videoRef}
          className="stage-media"
          muted
          playsInline
          aria-label="Live camera feed being performed as sound"
          onLoadedData={(e) => onVideoReady(e.currentTarget)}
        />
      )}

      <VisualTrails ref={trailsRef} reducedMotion={reducedMotion} />
      <Scanner ref={scannerRef} active={isPlaying} />

      <div className="stage-vignette" aria-hidden="true" />
    </div>
  );
}
