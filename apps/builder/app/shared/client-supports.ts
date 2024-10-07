import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export const useClientSupports = (isSupported: () => boolean) => {
  const result = useSyncExternalStore(subscribe, isSupported, () => false);

  return result;
};
