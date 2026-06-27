import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export interface TrailsHandle {
  /** Spawn particles at normalised x (0..1) using the scanned colour. */
  emit: (x: number, color: string, intensity: number) => void;
}

interface Particle {
  x: number; // px
  y: number; // px
  vx: number;
  vy: number;
  life: number; // 1 -> 0
  size: number;
  color: string;
}

/**
 * VisualTrails
 * A transparent canvas overlay that paints soft, fading particles wherever the
 * scanner emits — making it feel like sound is being drawn out of the image.
 * Self-contained: owns its own RAF for fading, respects reduced motion, and
 * cleans up on unmount.
 */
export const VisualTrails = forwardRef<TrailsHandle, { reducedMotion: boolean }>(
  function VisualTrails({ reducedMotion }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const particlesRef = useRef<Particle[]>([]);
    const rafRef = useRef<number | null>(null);
    const sizeRef = useRef({ w: 0, h: 0 });

    useImperativeHandle(ref, () => ({
      emit: (x, color, intensity) => {
        const { w, h } = sizeRef.current;
        if (!w || !h) return;
        // Fewer, calmer particles when reduced motion is requested.
        const count = reducedMotion ? 1 : Math.round(1 + intensity * 4);
        for (let i = 0; i < count; i++) {
          particlesRef.current.push({
            x: x * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 14,
            vy: (Math.random() - 0.5) * 8 - 4,
            life: 1,
            size: 2 + Math.random() * (3 + intensity * 6),
            color,
          });
        }
        // Cap particle count to protect performance.
        if (particlesRef.current.length > 600) {
          particlesRef.current.splice(0, particlesRef.current.length - 600);
        }
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.floor(rect.width * dpr));
        canvas.height = Math.max(1, Math.floor(rect.height * dpr));
        sizeRef.current = { w: rect.width, h: rect.height };
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(canvas);

      const draw = () => {
        const { w, h } = sizeRef.current;
        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = "lighter";
        const ps = particlesRef.current;
        for (let i = ps.length - 1; i >= 0; i--) {
          const p = ps[i];
          p.life -= 0.018;
          if (p.life <= 0) {
            ps.splice(i, 1);
            continue;
          }
          p.x += p.vx * 0.016;
          p.y += p.vy * 0.016;
          p.vy += 0.05; // gentle drift
          ctx.globalAlpha = Math.max(0, p.life) * 0.6;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        rafRef.current = requestAnimationFrame(draw);
      };
      rafRef.current = requestAnimationFrame(draw);

      return () => {
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        ro.disconnect();
        particlesRef.current = [];
      };
    }, []);

    return <canvas ref={canvasRef} className="visual-trails" aria-hidden="true" />;
  }
);
