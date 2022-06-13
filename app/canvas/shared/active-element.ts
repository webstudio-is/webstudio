import { useCallback, useEffect } from "react";
import { type Instance, publish, useSubscribe } from "@webstudio-is/sdk";
import { findInstanceById } from "~/shared/tree-utils";
import {
  useSelectedInstance,
  useSelectedElement,
  useHoveredElement,
  useHoveredInstance,
} from "./nano-states";
import { useRootInstance } from "~/shared/nano-states";

const eventOptions = {
  passive: true,
};

export const useActiveElementTracking = () => {
  const [rootInstance] = useRootInstance();
  const [selectedInstance, setSelectedInstance] = useSelectedInstance();
  const [selectedElement, setSelectedElement] = useSelectedElement();
  const [, setHoveredElement] = useHoveredElement();
  const [, setHoveredInstance] = useHoveredInstance();

  useSubscribe("focusElement", (id: Instance["id"]) => {
    const element = document.getElementById(id);
    element?.focus();
    select(element);
  });

  const select = useCallback(
    (element: EventTarget | HTMLElement | null) => {
      if (
        element === null ||
        !(element instanceof HTMLElement) ||
        rootInstance === undefined
      ) {
        return;
      }
      const id = element?.id;
      if (!id) return;
      if (selectedElement?.id === id && selectedInstance?.id === id) {
        return;
      }
      const instance = findInstanceById(rootInstance, element.id);
      if (instance === undefined) return;
      setSelectedInstance(instance);
      setSelectedElement(element);
    },
    [
      rootInstance,
      selectedElement,
      setSelectedElement,
      selectedInstance,
      setSelectedInstance,
    ]
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

  useEffect(() => {
    const handleMouseOver = (event: MouseEvent) => {
      if (rootInstance === undefined) return;
      const element = event.target;
      if (element instanceof HTMLElement) {
        setHoveredElement(element);
        const instance = findInstanceById(rootInstance, element.id);
        setHoveredInstance(instance);
      }
    };

    const handleMouseOut = () => {
      if (rootInstance === undefined) return;
      setHoveredElement(undefined);
      setHoveredInstance(undefined);
    };

    window.addEventListener("mouseover", handleMouseOver, eventOptions);
    window.addEventListener("mouseout", handleMouseOut, eventOptions);

    return () => {
      window.removeEventListener("mouseover", handleMouseOver);
      window.removeEventListener("mouseout", handleMouseOut);
    };
  }, [rootInstance, setHoveredElement, setHoveredInstance]);

  return selectedInstance;
};
