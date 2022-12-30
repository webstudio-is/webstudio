import { useState, useEffect } from "react";

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
