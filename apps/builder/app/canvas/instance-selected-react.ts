import { useCallback, useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { selectedInstanceSelectorStore } from "~/shared/nano-states";
import { subscribeSelectedInstance } from "./instance-selected";

/**
 * Debounce task execution until useEffect
 */
const useDebounceEffect = () => {
  const [updateCallback, setUpdateCallback] = useState(() => () => {
    /* empty */
  });

  useEffect(() => {
    // Because of how our styles works we need to update after React render to be sure that
    // all styles are applied
    updateCallback();
  }, [updateCallback]);

  return useCallback((task: () => void) => {
    setUpdateCallback(() => task);
  }, []);
};

export const useSelectedInstance = () => {
  const selectedInstanceSelector = useStore(selectedInstanceSelectorStore);
  const execTaskInEffect = useDebounceEffect();

  useEffect(() => {
    if (selectedInstanceSelector === undefined) {
      return;
    }
    return subscribeSelectedInstance(
      selectedInstanceSelector,
      execTaskInEffect
    );
  }, [selectedInstanceSelector, execTaskInEffect]);
};
