import type { Instance } from "@webstudio-is/project-build";
import store from "immerhin";
import {
  type KeyboardEventHandler,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { instancesStore } from "~/shared/nano-states";

type SettingUpdate = { label?: string };

export const useSettingsLogic = ({
  selectedInstance,
}: {
  selectedInstance: Instance;
}) => {
  const changes = useRef<SettingUpdate>({});

  const setLabel = (value: SettingUpdate[keyof SettingUpdate]) => {
    // Empty string should be replaced with `undefined` so that we can render default label
    changes.current.label = value || undefined;
  };

  const updateLabel = useCallback(() => {
    store.createTransaction([instancesStore], (instances) => {
      const instance = instances.get(selectedInstance.id);
      if (instance !== undefined) {
        instance.label = changes.current.label;
      }
    });
  }, [selectedInstance]);

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
