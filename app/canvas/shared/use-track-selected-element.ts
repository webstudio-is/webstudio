import { useCallback, useEffect, useRef } from "react";
import { type Instance, publish, useSubscribe } from "@webstudio-is/sdk";
import { useSelectedElement, useSelectedInstance } from "./nano-states";
import {
  useRootInstance,
  useTextEditingInstanceId,
} from "~/shared/nano-states";
import { findInstanceById } from "~/shared/tree-utils";
import { primitives } from "~/shared/canvas-components";

const eventOptions = {
  passive: true,
};

export const useTrackSelectedElement = () => {
  const [selectedElement, setSelectedElement] = useSelectedElement();
  const [selectedInstance, setSelectedInstance] = useSelectedInstance();
  const [editingInstanceId, setEditingInstanceId] = useTextEditingInstanceId();
  const editingInstanceIdRef = useRef(editingInstanceId);
  editingInstanceIdRef.current = editingInstanceId;
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
    if (
      editingInstanceIdRef.current !== undefined &&
      selectedInstance?.id !== editingInstanceIdRef.current
    ) {
      setEditingInstanceId(undefined);
    }
  }, [selectedInstance, setEditingInstanceId]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      // Notify in general that document was clicked
      // e.g. to hide the side panel
      publish<"clickCanvas">({ type: "clickCanvas" });

      if (!(event.target instanceof HTMLElement)) return;

      const { id, dataset } = event.target;

      // It's a second click in a double click.
      if (event.detail === 2) {
        const component = dataset.component as Instance["component"];
        if (component === undefined || component in primitives === false) {
          return;
        }
        const { isInlineOnly } = primitives[component];
        // When user double clicks on an inline instance, we need to select the parent instance and put it indo text editing mode.
        // Inline instances are not directly, only through parent instance.
        if (isInlineOnly) {
          const parentId = event.target.parentElement?.id;
          if (parentId) {
            selectInstance(parentId);
            setEditingInstanceId(parentId);
          }
        } else setEditingInstanceId(id);
        return;
      }

      selectInstance(id);
    };

    window.addEventListener("click", handleClick, eventOptions);

    return () => {
      window.removeEventListener("click", handleClick);
    };
  }, [selectInstance, setEditingInstanceId]);
};
