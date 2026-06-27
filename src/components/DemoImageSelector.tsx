import { DEMO_IMAGES, type DemoImage } from "../utils/demoImages";

interface Props {
  activeId: string | null;
  onSelect: (demo: DemoImage) => void;
}

/** A small gallery of built-in, code-generated images to play instantly. */
export function DemoImageSelector({ activeId, onSelect }: Props) {
  return (
    <div className="demo-selector" role="group" aria-label="Demo images">
      {DEMO_IMAGES.map((demo) => (
        <button
          key={demo.id}
          type="button"
          className={`demo-chip ${activeId === demo.id ? "is-active" : ""}`}
          onClick={() => onSelect(demo)}
          aria-pressed={activeId === demo.id}
          title={demo.description}
        >
          <span className={`demo-swatch swatch-${demo.id}`} aria-hidden="true" />
          {demo.name}
        </button>
      ))}
    </div>
  );
}
