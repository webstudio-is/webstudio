import { useCallback } from "react";
import { useSubscribe } from "@webstudio-is/sdk";
import { useSelectedInstance } from "./nano-states";

/**
 * This hook lets you subscribe any rendering event we know that is going to lead to a DOM update.
 * It calls the callback after the updates should have already rendered.
 */
export const useAfterRender = (callback: () => void) => {
  const [instance] = useSelectedInstance();
  const handleUpdate = useCallback(() => {
    requestAnimationFrame(callback);
  }, [callback]);
  useSubscribe("breakpointChange", handleUpdate);
  useSubscribe("breakpointDelete", handleUpdate);
  useSubscribe("reparentInstance", handleUpdate);
  useSubscribe("deleteInstance", handleUpdate);
  useSubscribe("insertInstance", handleUpdate);
  useSubscribe("updateProps", handleUpdate);
  useSubscribe("deleteProp", handleUpdate);
  useSubscribe("updateStyle", handleUpdate);
  useSubscribe(`previewStyle:${instance?.id}`, handleUpdate);
};
