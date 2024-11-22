import { useStore } from "@nanostores/react";
import { map } from "nanostores";
import { useCallback } from "react";
import { $selectedInstance } from "~/shared/awareness";

const instancesKv = map<Record<string, unknown>>({});

/**
 * This code creates a selected instance key-value store that maintains instance-specific state for a UI.
 * It differs from useState in that it uses defaultValue instead of initialValue as the second parameter,
 * allowing the default UI behavior to be used until the user modifies the state.
 */
export const useSelectedInstanceKv = <T>(key: string, defaultValue: T) => {
  const instance = useStore($selectedInstance);
  const instanceKey = `${instance?.id}-${key}`;

  const mapStore = useStore(instancesKv, {
    keys: [instanceKey],
  });

  const setValue = useCallback(
    (value: T) => {
      instancesKv.setKey(instanceKey, value);
    },
    [instanceKey]
  );

  return [(mapStore[instanceKey] as T) ?? defaultValue, setValue] as const;
};
