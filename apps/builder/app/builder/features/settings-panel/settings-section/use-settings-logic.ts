import {
  type KeyboardEventHandler,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { instancesStore, selectedInstanceStore } from "~/shared/nano-states";
import { serverSyncStore } from "~/shared/sync";

type Setting = "label";
type Value = string;

type Operation =
  | {
      operation: "delete";
      property: Setting;
    }
  | {
      operation: "set";
      property: Setting;
      value: Value;
    };

export const useSettingsLogic = () => {
  const updates = useRef<Array<Operation>>([]);

  const setLabel = (value?: Value) => {
    if (value === undefined) {
      updates.current.push({ operation: "delete", property: "label" });
      return;
    }
    updates.current.push({ operation: "set", property: "label", value });
  };

  // Gets updates by property and removes them from the list
  const popUpdates = (property: Setting) => {
    const remainingUpdates: Array<Operation> = [];
    const searchedUpdates: Array<Operation> = [];
    for (const update of updates.current) {
      const array =
        update.property === property ? searchedUpdates : remainingUpdates;
      array.push(update);
    }
    updates.current = remainingUpdates;
    return searchedUpdates;
  };

  const updateLabel = useCallback(() => {
    const selectedInstance = selectedInstanceStore.get();
    if (selectedInstance === undefined) {
      return;
    }
    serverSyncStore.createTransaction([instancesStore], (instances) => {
      const instance = instances.get(selectedInstance.id);
      if (instance === undefined) {
        return;
      }
      const labelUpdates = popUpdates("label");
      for (const update of labelUpdates) {
        if (update.operation === "delete") {
          delete instance.label;
          continue;
        }
        instance.label = update.value;
      }
    });
  }, []);

  const handleKeyDown: KeyboardEventHandler = (event) => {
    if (event.key === "Enter") {
      updateLabel();
    }
  };

  // Save changes when unmounting, e.g. when switiching to another tab
  useEffect(() => updateLabel, [updateLabel]);

  return {
    setLabel,
    handleBlur: updateLabel,
    handleKeyDown,
  };
};
