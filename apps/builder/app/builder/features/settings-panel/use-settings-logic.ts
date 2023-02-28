import type { Instance } from "@webstudio-is/project-build";
import store from "immerhin";
import { type KeyboardEventHandler, useRef } from "react";
import { instancesStore } from "~/shared/nano-states";

type SettingUpdate = { setting: "label"; value: string };

export const useSettingsLogic = ({
  selectedInstance,
}: {
  selectedInstance: Instance;
}) => {
  const changes = useRef<Map<SettingUpdate["setting"], SettingUpdate["value"]>>(
    new Map()
  );

  const set = ({ setting, value }: SettingUpdate) => {
    switch (setting) {
      case "label": {
        changes.current.set(setting, value);
      }
    }
  };

  const update = () => {
    store.createTransaction([instancesStore], (instances) => {
      const instance = instances.get(selectedInstance.id);
      if (instance !== undefined) {
        instance.label = changes.current.get("label");
      }
    });
  };

  const onKeyDown: KeyboardEventHandler = (event) => {
    if (event.key === "Enter") {
      update();
    }
  };

  return {
    set,
    handlers: { onBlur: update, onKeyDown },
  };
};
