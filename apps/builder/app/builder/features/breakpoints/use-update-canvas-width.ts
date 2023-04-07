import { useStore } from "@nanostores/react";
import { useCallback } from "react";
import { useCanvasWidth } from "~/builder/shared/nano-states";
import {
  scaleStore,
  selectedBreakpointStore,
  workspaceRectStore,
} from "~/shared/nano-states/breakpoints";

export const useUpdateCanvasWidth = () => {
  const selectedBreakpoint = useStore(selectedBreakpointStore);
  const [, setCanvasWidth] = useCanvasWidth();
  const workspaceRect = useStore(workspaceRectStore);

  return useCallback(
    (element: HTMLIFrameElement | null) => {
      if (workspaceRect === undefined) {
        return;
      }
      const width =
        selectedBreakpoint?.minWidth ??
        selectedBreakpoint?.maxWidth ??
        workspaceRect.width;

      setCanvasWidth(width);

      if (width !== undefined) {
        scaleStore.set(
          width > workspaceRect.width
            ? parseFloat(((workspaceRect.width / width) * 100).toFixed(2))
            : 100
        );
      }
    },
    [workspaceRect, selectedBreakpoint, setCanvasWidth]
  );
};
