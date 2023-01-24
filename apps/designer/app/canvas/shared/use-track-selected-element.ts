import { useEffect, useRef } from "react";
import { useStore } from "@nanostores/react";
import {
  type Instance,
  getComponentMeta,
  getComponentNames,
} from "@webstudio-is/react-sdk";
import {
  selectedInstanceIdStore,
  useRootInstance,
  useTextEditingInstanceId,
} from "~/shared/nano-states";
import { utils } from "@webstudio-is/project";
import { publish } from "~/shared/pubsub";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    clickCanvas: undefined;
  }
}

const eventOptions = {
  passive: true,
};

export const useTrackSelectedElement = () => {
  const selectedInstanceId = useStore(selectedInstanceIdStore);
  const [editingInstanceId, setEditingInstanceId] = useTextEditingInstanceId();
  const editingInstanceIdRef = useRef(editingInstanceId);
  editingInstanceIdRef.current = editingInstanceId;
  const [rootInstance] = useRootInstance();

  useEffect(() => {
    if (
      editingInstanceIdRef.current !== undefined &&
      selectedInstanceId !== editingInstanceIdRef.current
    ) {
      setEditingInstanceId(undefined);
    }
  }, [selectedInstanceId, setEditingInstanceId]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      // Notify in general that document was clicked
      // e.g. to hide the side panel
      publish({ type: "clickCanvas" });
      let element = event.target as HTMLElement;

      // If we click on an element that is not a component, we search for a parent component.
      if (element.dataset.wsComponent === undefined) {
        const instanceElement = element.closest<HTMLElement>(
          "[data-ws-component]"
        );
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
      const components = getComponentNames();

      // It's the second click in a double click.
      if (event.detail === 2) {
        const component = dataset.wsComponent as Instance["component"];
        if (component === undefined || !components.includes(component)) {
          return;
        }
        const { type } = getComponentMeta(component);

        // When user double clicks on an inline instance, we need to select the parent instance and put it indo text editing mode.
        // Inline instances are not editable directly, only through parent instance.
        if (type === "rich-text-child") {
          const parent =
            rootInstance &&
            utils.tree.findClosestNonInlineParent(rootInstance, id);
          if (
            parent &&
            getComponentMeta(parent.component).type === "rich-text"
          ) {
            selectedInstanceIdStore.set(parent.id);
            setEditingInstanceId(parent.id);
          }
          return;
        }

        if (type === "rich-text") {
          setEditingInstanceId(id);
        }
      }

      selectedInstanceIdStore.set(id);
    };

    window.addEventListener("click", handleClick, eventOptions);

    return () => {
      window.removeEventListener("click", handleClick);
    };
  }, [setEditingInstanceId, rootInstance]);
};
