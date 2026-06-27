import { useEffect } from "react";

interface Shortcuts {
  onTogglePlay: () => void;
  onRandomise: () => void;
  onToggleControls: () => void;
}

/**
 * Global keyboard shortcuts:
 *   Space = play / pause
 *   R     = randomise demo image
 *   C     = toggle controls
 * Ignored while typing in inputs / when modifier keys are held.
 */
export function useKeyboardShortcuts({ onTogglePlay, onRandomise, onToggleControls }: Shortcuts) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          onTogglePlay();
          break;
        case "KeyR":
          onRandomise();
          break;
        case "KeyC":
          onToggleControls();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onTogglePlay, onRandomise, onToggleControls]);
}
