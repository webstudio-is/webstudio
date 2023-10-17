import { useCallback, useEffect, useState } from "react";

/**
 * Debounce task execution until useEffect
 * Example:
 *   const scheduleEffect = useEffectQueue();
 *   scheduleEffect(() => { ... })
 */
export const useEffectQueue = () => {
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
