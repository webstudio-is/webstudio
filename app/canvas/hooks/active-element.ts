import { useEffect, useRef } from "react";
import { findInstanceById } from "~/shared/tree-utils";
import { type Instance } from "@webstudio-is/sdk";
import { useSelectedInstance, useSelectedElement } from "../nano-values";
import { publish, useSubscribe } from "../pubsub";

const eventOptions = {
  capture: true,
  passive: true,
};

export const useActiveElementTracking = ({
  rootInstance,
}: {
  rootInstance: Instance;
}) => {
  const [selectedInstance, setSelectedInstance] = useSelectedInstance();
  const [selectedElement, setSelectedElement] = useSelectedElement();

  useSubscribe("focusElement", (id: Instance["id"]) => {
    document.getElementById(id)?.focus();
  });

  useEffect(() => {
    // Alredy focused over DOM event.
    if (
      selectedInstance === undefined ||
      selectedElement?.id === selectedInstance.id
    ) {
      return;
    }
    // Instance was added and we want to auto focus it now.
    document.getElementById(selectedInstance.id)?.focus();
  }, [selectedInstance]);

  useEffect(() => {
    const select = (element: Element | null) => {
      if (element === null) return;
      const id = element?.id;
      if (!id) return;
      if (selectedElement?.id === id) return;
      const instance = findInstanceById(rootInstance, element.id);
      if (instance === undefined) return;
      setSelectedInstance(instance);
      setSelectedElement(element);
    };

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
  }, [rootInstance, setSelectedElement, setSelectedInstance]);

  return selectedInstance;
};
