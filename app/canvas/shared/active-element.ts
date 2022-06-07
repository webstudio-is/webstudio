import { useCallback, useEffect } from "react";
import { type Instance, publish, useSubscribe } from "@webstudio-is/sdk";
import { findInstanceById } from "~/shared/tree-utils";
import { useSelectedInstance, useSelectedElement } from "./nano-states";
import { useRootInstance } from "~/shared/nano-states";

const eventOptions = {
  passive: true,
};

export const useActiveElementTracking = () => {
  const [rootInstance] = useRootInstance();
  const [selectedInstance, setSelectedInstance] = useSelectedInstance();
  const [selectedElement, setSelectedElement] = useSelectedElement();

  useSubscribe("focusElement", (id: Instance["id"]) => {
    const element = document.getElementById(id);
    element?.focus();
    select(element);
  });

  const select = useCallback(
    (element: Element | null) => {
      if (element === null || rootInstance === undefined) return;
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
      if (event.target instanceof Element) select(event.target);
    };
    window.addEventListener("click", handleClick, eventOptions);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("click", handleClick);
    };
  }, [select]);

  return selectedInstance;
};
