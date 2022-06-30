import { type Instance } from "@webstudio-is/sdk";
import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { useSelectedInstance } from "~/canvas/shared/nano-states";

type EditableProps = {
  onDoubleClick: (event: MouseEvent) => void;
  onKeyDown: (event: KeyboardEvent) => void;
};

export const useIsEditing = (instance: Instance): [boolean, EditableProps] => {
  const [selectedInstance] = useSelectedInstance();
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (selectedInstance?.id !== instance.id) {
      setIsEditing(false);
    }
  }, [selectedInstance, instance, setIsEditing]);

  const props = useMemo(
    () => ({
      onKeyDown(event: KeyboardEvent) {
        if (selectedInstance?.id !== instance.id) return;
        if (event.key === "Enter" && isEditing === false) {
          setIsEditing(true);
          // Prevent inserting a newline when you want to start editing mode
          event.preventDefault();
          return;
        }
        if (event.key === "Escape") {
          setIsEditing(false);
        }
      },
      onDoubleClick(event: MouseEvent) {
        // We only want to do this if the component is the one that was clicked
        // @todo this logic shouldn't be necessary
        if (selectedInstance?.id !== instance.id) return;
        event.preventDefault();
        setIsEditing(true);
      },
    }),
    [setIsEditing, selectedInstance, instance, isEditing]
  );
  return [isEditing, props];
};
