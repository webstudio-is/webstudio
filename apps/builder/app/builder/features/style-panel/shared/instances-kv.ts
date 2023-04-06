import { useStore } from "@nanostores/react";
import { map } from "nanostores";
import { useCallback } from "react";
import { selectedInstanceSelectorStore } from "~/shared/nano-states";

const instancesKv = map<Record<string, unknown>>({});

/**
 * This code creates a selected instance key-value store that maintains instance-specific state for a UI.
 * It differs from useState in that it uses defaultValue instead of initialValue as the second parameter,
 * allowing the default UI behavior to be used until the user modifies the state.
 */
export const useSelectedInstanceKv = <T>(key: string, defaultValue: T) => {
  const instanceSelector = useStore(selectedInstanceSelectorStore);
  const keyInstanceSelector = instanceSelector
    ? `${instanceSelector.join(",")}-${key}`
    : `undefined-${key}`;

  const mapStore = useStore(instancesKv, {
    keys: [keyInstanceSelector],
  });

  const setValue = useCallback(
    (value: T) => {
      instancesKv.setKey(keyInstanceSelector, value);
    },
    [keyInstanceSelector]
  );

  return [
    (mapStore[keyInstanceSelector] as T) ?? defaultValue,
    setValue,
  ] as const;
};
