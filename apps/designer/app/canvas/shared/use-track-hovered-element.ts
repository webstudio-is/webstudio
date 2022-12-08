import { useEffect, useState } from "react";
import { useSelectedElement } from "./nano-states";
import { useRootInstance } from "~/shared/nano-states";

// @todo: importing normally doesn't work in Jest for some reason
// import { useDebounce } from "react-use";
import useDebounce from "react-use/lib/useDebounce"; // eslint-disable-line

const eventOptions = {
  passive: true,
};

export const useTrackHoveredElement = (
  onChange: (element: HTMLElement | undefined) => void
) => {
  const [rootInstance] = useRootInstance();
  const [selectedElement] = useSelectedElement();
  const [hoveredElement, setHoveredElement] = useState<HTMLElement>();

  useDebounce(
    () => {
      onChange(hoveredElement);
    },
    50,
    [hoveredElement]
  );

  useEffect(() => {
    const handleMouseOver = (event: MouseEvent) => {
      const element = event.target;
      if (rootInstance === undefined || !(element instanceof HTMLElement)) {
        return;
      }
      setHoveredElement(element);
    };

    const handleMouseOut = () => {
      setHoveredElement(undefined);
    };

    window.addEventListener("mouseover", handleMouseOver, eventOptions);
    window.addEventListener("mouseout", handleMouseOut, eventOptions);

    return () => {
      window.removeEventListener("mouseover", handleMouseOver);
      window.removeEventListener("mouseout", handleMouseOut);
    };
  }, [rootInstance, selectedElement, onChange]);
};
