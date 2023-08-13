import { useCallback, useEffect, useState } from "react";
import { subscribeSelected } from "./instance-selected";

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
  const execTaskInEffect = useDebounceEffect();

  useEffect(() => {
    return subscribeSelected(execTaskInEffect);
  }, [execTaskInEffect]);
};
