import { useEffect } from "react";
import { useSelectedElement, useHoveredElement } from "./nano-states";
import { useRootInstance } from "~/shared/nano-states";

const eventOptions = {
  passive: true,
};

export const useTrackHoveredElement = () => {
  const [rootInstance] = useRootInstance();
  const [, setHoveredElement] = useHoveredElement();
  const [selectedElement] = useSelectedElement();

  useEffect(() => {
    const handleMouseOver = (event: MouseEvent) => {
      const element = event.target;
      if (
        rootInstance === undefined ||
        // Don't show hover for selected element
        selectedElement === element ||
        !(element instanceof HTMLElement)
      ) {
        return;
      }
      setHoveredElement(element);
    };

    const handleMouseOut = () => {
      if (rootInstance === undefined) return;
      setHoveredElement(undefined);
    };

    window.addEventListener("mouseover", handleMouseOver, eventOptions);
    window.addEventListener("mouseout", handleMouseOut, eventOptions);

    return () => {
      window.removeEventListener("mouseover", handleMouseOver);
      window.removeEventListener("mouseout", handleMouseOut);
    };
  }, [rootInstance, selectedElement, setHoveredElement]);
};
