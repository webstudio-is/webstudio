import store from "immerhin";
import {
  type KeyboardEventHandler,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { instancesStore, selectedInstanceStore } from "~/shared/nano-states";

type SettingUpdate = { label?: string };

export const useSettingsLogic = () => {
  const changes = useRef<SettingUpdate>({});

  const setLabel = (value: SettingUpdate[keyof SettingUpdate]) => {
    // Empty string should be replaced with `undefined` so that we can render default label
    changes.current.label = value || undefined;
  };

  const updateLabel = useCallback(() => {
    const selectedInstance = selectedInstanceStore.get();
    if (selectedInstance === undefined) {
      return;
    }
    store.createTransaction([instancesStore], (instances) => {
      const instance = instances.get(selectedInstance.id);
      if (instance !== undefined) {
        instance.label = changes.current.label;
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
