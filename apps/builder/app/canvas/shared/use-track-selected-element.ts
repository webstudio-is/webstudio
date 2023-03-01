import { useEffect, useRef } from "react";
import { useStore } from "@nanostores/react";
import {
  instancesIndexStore,
  selectedInstanceIdStore,
  useRootInstance,
  useTextEditingInstanceId,
} from "~/shared/nano-states";
import { publish } from "~/shared/pubsub";
import { findClosestRichTextInstance } from "~/shared/tree-utils";
import { componentAttribute } from "@webstudio-is/react-sdk";

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
          `[${componentAttribute}]`
        );
        if (instanceElement === null) {
          return;
        }
        element = instanceElement;
      }

      const { id } = element;

      // Enable clicking inside of content editable without trying to select the element as an instance.
      if (editingInstanceIdRef.current === id) {
        return;
      }

      // the second click in a double click.
      if (event.detail === 2) {
        const instancesIndex = instancesIndexStore.get();
        // enable text editor when double click on its instance or one of its descendants
        const richTextInstance = findClosestRichTextInstance(
          instancesIndex,
          id
        );
        if (richTextInstance) {
          selectedInstanceIdStore.set(richTextInstance.id);
          setEditingInstanceId(richTextInstance.id);
        }
        return;
      }

      selectedInstanceIdStore.set(id);
    };

    window.addEventListener("click", handleClick, eventOptions);

    return () => {
      window.removeEventListener("click", handleClick);
    };
  }, [setEditingInstanceId, rootInstance]);
};
