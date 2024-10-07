import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// https://react.dev/reference/react/useSyncExternalStore#subscribing-to-a-browser-api
// Get a value from the browser API on the first (non hydration) render (without using useEffect or similar methods)
// Ensures the value is consistent between server and client (hydration)
export const useClientSupports = (isSupported: () => boolean) => {
  const result = useSyncExternalStore(subscribe, isSupported, () => false);

  return result;
};
