import { useCallback, useEffect, useRef } from "react";
import {
  type Instance,
  publish,
  useSubscribe,
  components,
} from "@webstudio-is/react-sdk";
import { useSelectedElement, useSelectedInstance } from "./nano-states";
import {
  useRootInstance,
  useTextEditingInstanceId,
} from "~/shared/nano-states";
import { findInstanceById } from "~/shared/tree-utils";

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
      let element = event.target as HTMLElement;

      // If we click on an element that is not a component, we search for a parent component.
      if (element.dataset.component === undefined) {
        const instanceElement =
          element.closest<HTMLElement>("[data-component]");
        if (instanceElement === null) {
          return;
        }
        element = instanceElement;
      }

      const { id, dataset } = element;

      // Enable clicking inside of content editable without trying to select the element as an instance.
      if (editingInstanceIdRef.current === id) {
        return;
      }

      // It's the second click in a double click.
      if (event.detail === 2) {
        const component = dataset.component as Instance["component"];
        if (component === undefined || component in components === false) {
          return;
        }
        const { isInlineOnly, isContentEditable } = components[component];

        if (isContentEditable === false) {
          return;
        }

        // When user double clicks on an inline instance, we need to select the parent instance and put it indo text editing mode.
        // Inline instances are not directly, only through parent instance.
        if (isInlineOnly) {
          const parentId = element.parentElement?.id;
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
