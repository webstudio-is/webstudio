import { useCallback, useEffect } from "react";
import { type Instance, publish, useSubscribe } from "@webstudio-is/sdk";
import { useSelectedElement } from "./nano-states";

const eventOptions = {
  passive: true,
};

export const useTrackSelectedElement = () => {
  const [selectedElement, setSelectedElement] = useSelectedElement();

  const select = useCallback(
    (element: EventTarget | HTMLElement | null) => {
      if (element instanceof HTMLElement) {
        setSelectedElement(element);
      }
    },
    [setSelectedElement]
  );

  const focusAndSelect = useCallback(
    (id: Instance["id"]) => {
      const element = document.getElementById(id);
      element?.focus();
      select(element);
    },
    [select]
  );

  // It is possible due to rerender to get an html element reference that was already removed from the DOM.
  // We need to reselect it when this happens.
  useEffect(() => {
    if (
      selectedElement !== undefined &&
      document.body.contains(selectedElement) === false
    ) {
      focusAndSelect(selectedElement.id);
    }
  }, [selectedElement, focusAndSelect]);

  useSubscribe("selectElement", focusAndSelect);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      // Notify in general that document was clicked
      // e.g. to hide the side panel
      publish<"clickCanvas">({ type: "clickCanvas" });
      select(event.target);
    };
    window.addEventListener("click", handleClick, eventOptions);

    return () => {
      window.removeEventListener("click", handleClick);
    };
  }, [select]);
};
