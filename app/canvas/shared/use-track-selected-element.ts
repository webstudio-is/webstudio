import { useCallback, useEffect } from "react";
import { type Instance, publish, useSubscribe } from "@webstudio-is/sdk";
import { useSelectedElement, useSelectedInstance } from "./nano-states";
import { useRootInstance } from "~/shared/nano-states";
import { findInstanceById } from "~/shared/tree-utils";

const eventOptions = {
  passive: true,
};

export const useTrackSelectedElement = () => {
  const [selectedElement, setSelectedElement] = useSelectedElement();
  const [selectedInstance, setSelectedInstance] = useSelectedInstance();
  const [rootInstance] = useRootInstance();
  const selectInstance = useCallback(
    (id) => {
      if (rootInstance === undefined) return;
      const instance = findInstanceById(rootInstance, id);
      setSelectedInstance(instance);
    },
    [setSelectedInstance, rootInstance]
  );

  useSubscribe<"selectInstanceById", Instance["id"]>(
    "selectInstanceById",
    selectInstance
  );

  // Focus and select the element when selected instance changes
  useEffect(() => {
    if (
      selectedInstance !== undefined &&
      (selectedElement === undefined ||
        selectedInstance?.id !== selectedElement.id)
    ) {
      const element = document.getElementById(selectedInstance.id);
      if (element === null) return;
      element.focus();
      setSelectedElement(element);
    }
  }, [selectedInstance, selectedElement, setSelectedElement]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      // Notify in general that document was clicked
      // e.g. to hide the side panel
      publish<"clickCanvas">({ type: "clickCanvas" });
      if (event.target instanceof HTMLElement) {
        selectInstance(event.target.id);
      }
    };
    window.addEventListener("click", handleClick, eventOptions);

    return () => {
      window.removeEventListener("click", handleClick);
    };
  }, [selectInstance]);
};
