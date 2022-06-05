import { useCallback } from "react";
import { useSubscribe } from "@webstudio-is/sdk";

/**
 * This hook lets you subscribe any rendering event we know that is triggered by pubsub.
 * It calls the callback after the updates should have already happened.
 */
export const useOnAnyUpdate = (callback: () => void) => {
  const handleUpdate = useCallback(() => {
    requestAnimationFrame(callback);
  }, [callback]);
  useSubscribe("*", handleUpdate);
};
