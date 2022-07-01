import { publish, type Instance } from "@webstudio-is/sdk";
import {
  useCallback,
  useEffect,
  useMemo,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { useSelectedInstance } from "~/canvas/shared/nano-states";
import { useTextEditingInstanceId } from "~/shared/nano-states";

type EditableProps = {
  onDoubleClick: (event: MouseEvent) => void;
  onKeyDown: (event: KeyboardEvent) => void;
};

export const useIsEditing = (instance: Instance): [boolean, EditableProps] => {
  const [selectedInstance] = useSelectedInstance();
  const [editingInstanceId, setEditingInstanceId] = useTextEditingInstanceId();
  const isEditing =
    editingInstanceId === instance.id &&
    editingInstanceId === selectedInstance?.id;

  const updateEditingInstanceId = useCallback(
    (instanceId?: Instance["id"]) => {
      setEditingInstanceId(instanceId);
      publish<"textEditingInstanceId", Instance["id"] | undefined>({
        type: "textEditingInstanceId",
        payload: instanceId,
      });
    },
    [setEditingInstanceId]
  );

  useEffect(() => {
    if (
      selectedInstance === undefined ||
      selectedInstance.id !== editingInstanceId
    ) {
      updateEditingInstanceId();
    }
  }, [selectedInstance, editingInstanceId, updateEditingInstanceId]);

  const props = useMemo(
    () => ({
      onKeyDown(event: KeyboardEvent) {
        if (selectedInstance?.id !== instance.id) return;
        if (event.key === "Enter" && isEditing === false) {
          updateEditingInstanceId(instance.id);
          // Prevent inserting a newline when you want to start editing mode
          event.preventDefault();
          return;
        }
        if (event.key === "Escape") {
          updateEditingInstanceId();
        }
      },
      onDoubleClick(event: MouseEvent) {
        // We only want to do this if the component is the one that was clicked
        // @todo this logic shouldn't be necessary
        if (selectedInstance?.id !== instance.id) return;
        event.preventDefault();
        updateEditingInstanceId(instance.id);
      },
    }),
    [updateEditingInstanceId, selectedInstance, instance, isEditing]
  );
  return [isEditing, props];
};
