import { useCallback } from "react";
import { useSubscribe } from "@webstudio-is/sdk";
import { useSelectedInstance } from "./nano-states";

/**
 * This hook lets you subscribe any rendering event we know that is going to lead to a DOM update.
 */
export const useOnRender = (callback: () => void) => {
  const [instance] = useSelectedInstance();
  useSubscribe("breakpointChange", callback);
  useSubscribe("breakpointDelete", callback);
  useSubscribe("reparentInstance", callback);
  useSubscribe("deleteInstance", callback);
  useSubscribe("insertInstance", callback);
  useSubscribe("updateProps", callback);
  useSubscribe("deleteProp", callback);
  useSubscribe("updateStyle", callback);
  useSubscribe(`previewStyle:${instance?.id}`, callback);
};
