import { useCallback, useEffect } from "react";
import { type Instance, publish, useSubscribe } from "@webstudio-is/sdk";
import { useSelectedElement, useSelectedInstance } from "./nano-states";
import { findInstanceById } from "~/shared/tree-utils";
import { useRootInstance } from "~/shared/nano-states";

const eventOptions = {
  passive: true,
};

export const useTrackSelectedElement = () => {
  const [selectedElement, setSelectedElement] = useSelectedElement();

  useSubscribe("focusElement", (id: Instance["id"]) => {
    const element = document.getElementById(id);
    element?.focus();
    select(element);
  });

  const select = useCallback(
    (element: EventTarget | HTMLElement | null) => {
      if (!(element instanceof HTMLElement)) {
        return;
      }
      const id = element?.id;
      if (id && selectedElement?.id === id) {
        return;
      }
      setSelectedElement(element);
    },
    [selectedElement, setSelectedElement]
  );

  useEffect(() => {
    const handleFocus = () => {
      select(document.activeElement);
    };

    window.addEventListener("focus", handleFocus, eventOptions);

    const handleClick = (event: MouseEvent) => {
      // Notify in general that document was clicked
      // e.g. to hide the side panel
      publish<"clickCanvas">({ type: "clickCanvas" });
      select(event.target);
    };
    window.addEventListener("click", handleClick, eventOptions);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("click", handleClick);
    };
  }, [select]);
};
