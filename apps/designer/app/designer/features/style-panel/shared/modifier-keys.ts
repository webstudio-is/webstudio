import { useState, useEffect } from "react";

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
    const handler = (event: KeyboardEvent) =>
      setState({
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
      });

    window.addEventListener("keydown", handler);
    window.addEventListener("keyup", handler);

    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("keyup", handler);
    };
  }, []);

  return state;
};
