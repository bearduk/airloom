/**
 * Procedurally generated demo images so the instrument is playable with no
 * upload. Each returns a data URL drawn on an offscreen canvas.
 */

export interface DemoImage {
  id: string;
  name: string;
  description: string;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");
  return [c, ctx];
}

export const DEMO_IMAGES: DemoImage[] = [
  {
    id: "aurora",
    name: "Aurora",
    description: "Cool vertical bands drifting from teal to violet",
    draw: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0.0, "#06121f");
      g.addColorStop(0.25, "#0e7c7b");
      g.addColorStop(0.5, "#3aa6b9");
      g.addColorStop(0.75, "#7b6cf6");
      g.addColorStop(1.0, "#2b1055");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // soft luminous ribbons
      for (let i = 0; i < 5; i++) {
        const rg = ctx.createRadialGradient(
          (w / 5) * i + w * 0.1, h * (0.3 + 0.1 * i), 0,
          (w / 5) * i + w * 0.1, h * (0.3 + 0.1 * i), h * 0.5
        );
        rg.addColorStop(0, "rgba(180,255,240,0.35)");
        rg.addColorStop(1, "rgba(180,255,240,0)");
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, w, h);
      }
    },
  },
  {
    id: "ember",
    name: "Ember",
    description: "Warm reds and golds glowing through to deep night",
    draw: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#3d0a05");
      g.addColorStop(0.4, "#b32a13");
      g.addColorStop(0.7, "#f2a23b");
      g.addColorStop(1, "#1a0b1f");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = Math.random() * h * 0.18;
        const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, "rgba(255,210,120,0.25)");
        rg.addColorStop(1, "rgba(255,210,120,0)");
        ctx.fillStyle = rg;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    },
  },
  {
    id: "spectrum",
    name: "Spectrum",
    description: "A full hue sweep — every colour becomes a note",
    draw: (ctx, w, h) => {
      for (let x = 0; x < w; x++) {
        const hue = (x / w) * 360;
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, `hsl(${hue}, 80%, 70%)`);
        grad.addColorStop(0.5, `hsl(${hue}, 75%, 50%)`);
        grad.addColorStop(1, `hsl(${hue}, 70%, 22%)`);
        ctx.fillStyle = grad;
        ctx.fillRect(x, 0, 1, h);
      }
    },
  },
  {
    id: "mist",
    name: "Mist",
    description: "Quiet greys and blues — a soft, breathing drone",
    draw: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, "#1b2430");
      g.addColorStop(0.5, "#46586b");
      g.addColorStop(1, "#243140");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 6; i++) {
        const y = (h / 6) * i + Math.random() * h * 0.1;
        const rg = ctx.createLinearGradient(0, y - h * 0.1, 0, y + h * 0.1);
        rg.addColorStop(0, "rgba(200,220,235,0)");
        rg.addColorStop(0.5, "rgba(200,220,235,0.18)");
        rg.addColorStop(1, "rgba(200,220,235,0)");
        ctx.fillStyle = rg;
        ctx.fillRect(0, y - h * 0.1, w, h * 0.2);
      }
    },
  },
  {
    id: "bloom",
    name: "Bloom",
    description: "Concentric colour fields radiating from a centre",
    draw: (ctx, w, h) => {
      ctx.fillStyle = "#0a0a14";
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const rings = 7;
      const maxR = Math.hypot(w, h) / 2;
      for (let i = rings; i > 0; i--) {
        const hue = (i / rings) * 300;
        ctx.fillStyle = `hsl(${hue}, 70%, ${30 + i * 5}%)`;
        ctx.beginPath();
        ctx.arc(cx, cy, (maxR / rings) * i, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
];

/** Render a demo image to a data URL at the given resolution. */
export function renderDemoToDataURL(demo: DemoImage, w = 1024, h = 640): string {
  const [canvas, ctx] = makeCanvas(w, h);
  demo.draw(ctx, w, h);
  return canvas.toDataURL("image/png");
}
