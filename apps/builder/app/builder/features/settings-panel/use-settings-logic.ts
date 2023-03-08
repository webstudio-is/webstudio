import store from "immerhin";
import {
  type KeyboardEventHandler,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { instancesStore, selectedInstanceStore } from "~/shared/nano-states";

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

  const updateLabel = useCallback(() => {
    const selectedInstance = selectedInstanceStore.get();
    if (selectedInstance === undefined) {
      return;
    }
    store.createTransaction([instancesStore], (instances) => {
      const instance = instances.get(selectedInstance.id);
      if (instance === undefined) {
        return;
      }
      for (const update of updates.current) {
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
