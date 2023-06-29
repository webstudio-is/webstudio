import { useState, useEffect } from "react";
import { shallowEqual } from "shallow-equal";

// Used for combined mouse and keyboard interactions, like scrubbing while holding ALT.
// If it's just a keyboard interaction, you should already have a keyboard event at hand.
export const useModifierKeys = () => {
  const [state, setState] = useState({
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
  });

  useEffect(() => {
    const handler = (event: KeyboardEvent | MouseEvent) => {
      const newState = {
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
      };

      setState((prev) => {
        if (shallowEqual(prev, newState)) {
          return prev;
        }

        return newState;
      });
    };

    window.addEventListener("keydown", handler);
    window.addEventListener("keyup", handler);
    // The use of only the keyup/keydown events may not be sufficient.
    // on a Mac, when the cmd-shift-4 (printscreen) combination is triggered, there is a possibility of losing the keyup event.
    window.addEventListener("mousemove", handler);

    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("keyup", handler);
      window.removeEventListener("mousemove", handler);
    };
  }, []);

  return state;
};
