import { useEffect } from "react";
import { useSelectedElement } from "./nano-states";
import { useRootInstance } from "~/shared/nano-states";

const eventOptions = {
  passive: true,
};

export const useTrackHoveredElement = (
  onChange: (element: HTMLElement | undefined) => void
) => {
  const [rootInstance] = useRootInstance();
  const [selectedElement] = useSelectedElement();

  useEffect(() => {
    const handleMouseOver = (event: MouseEvent) => {
      const element = event.target;
      if (
        rootInstance === undefined ||
        !(element instanceof HTMLElement) ||
        element.dataset.outlineDisabled
      ) {
        return;
      }
      onChange(element);
    };

    const handleMouseOut = () => {
      if (rootInstance === undefined) return;
      onChange(undefined);
    };

    window.addEventListener("mouseover", handleMouseOver, eventOptions);
    window.addEventListener("mouseout", handleMouseOut, eventOptions);

    return () => {
      window.removeEventListener("mouseover", handleMouseOver);
      window.removeEventListener("mouseout", handleMouseOut);
    };
  }, [rootInstance, selectedElement, onChange]);
};
