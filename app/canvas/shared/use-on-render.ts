import { useCallback } from "react";
import { useSubscribe } from "@webstudio-is/sdk";
import { useSelectedElement } from "./nano-values";

/**
 * This hook lets you subscribe any rendering event we know that is triggered by pubsub.
 * It calls the callback after the updates should have already happened.
 */
export const useOnRender = (callback: () => void) => {
  const [selectedElement] = useSelectedElement();
  const handleUpdate = useCallback(() => {
    requestAnimationFrame(callback);
  }, [callback]);
  useSubscribe("updateStyle", handleUpdate);
  useSubscribe("updateProps", handleUpdate);
  useSubscribe(`previewStyle:${selectedElement?.id}`, handleUpdate);
  useSubscribe("insertInstance", handleUpdate);
  useSubscribe("reparentInstance", handleUpdate);
  useSubscribe("deleteInstance", handleUpdate);
  useSubscribe("breakpointChange", handleUpdate);
  useSubscribe("breakpointDelete", handleUpdate);
};
