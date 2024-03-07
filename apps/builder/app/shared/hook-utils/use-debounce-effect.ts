import { useCallback, useEffect, useState } from "react";

/**
 * Debounce callback execution until useEffect
 * Example:
 *   const scheduleEffect = useDebounceEffect();
 *   scheduleEffect(() => { ... })
 */
export const useDebounceEffect = () => {
  const [updateCallback, setUpdateCallback] = useState(() => () => {
    /* empty */
  });

  useEffect(() => {
    // Because of how our styles works we need to update after React render to be sure that
    // all styles are applied
    updateCallback();
  }, [updateCallback]);

  return useCallback((callback: () => void) => {
    setUpdateCallback(() => callback);
  }, []);
};
