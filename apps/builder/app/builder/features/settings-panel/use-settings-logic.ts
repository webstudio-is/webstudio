import type { Instance } from "@webstudio-is/project-build";
import store from "immerhin";
import { type KeyboardEventHandler, useRef } from "react";
import { instancesStore } from "~/shared/nano-states";

type SettingUpdate = { label?: string };

export const useSettingsLogic = ({
  selectedInstance,
}: {
  selectedInstance: Instance;
}) => {
  const changes = useRef<SettingUpdate>({});

  const set = (
    setting: keyof SettingUpdate,
    value: SettingUpdate[keyof SettingUpdate]
  ) => {
    switch (setting) {
      case "label": {
        changes.current[setting] = value;
      }
    }
  };

  const update = () => {
    store.createTransaction([instancesStore], (instances) => {
      const instance = instances.get(selectedInstance.id);
      if (instance !== undefined) {
        instance.label = changes.current.label;
      }
    });
  };

  const handleKeyDown: KeyboardEventHandler = (event) => {
    if (event.key === "Enter") {
      update();
    }
  };

  return {
    set,
    handleBlur: update,
    handleKeyDown,
  };
};
