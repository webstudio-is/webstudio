import { useStore } from "@nanostores/react";
import { useEffect } from "react";
import { useCanvasWidth } from "~/builder/shared/nano-states";
import {
  scaleStore,
  selectedBreakpointStore,
  workspaceRectStore,
} from "~/shared/nano-states/breakpoints";

export const useSetCanvasSize = () => {
  const selectedBreakpoint = useStore(selectedBreakpointStore);
  const [canvasWidth, setCanvasWidth] = useCanvasWidth();
  const workspaceRect = useStore(workspaceRectStore);

  useEffect(() => {
    if (workspaceRect === undefined) {
      return;
    }
    // When there is no non zero min/max width, we use the workspace width
    const width = Math.max(
      selectedBreakpoint?.minWidth ?? selectedBreakpoint?.maxWidth ?? 0,
      workspaceRect.width
    );
    setCanvasWidth(width);
  }, [workspaceRect, selectedBreakpoint, setCanvasWidth]);

  useEffect(() => {
    if (canvasWidth === undefined || workspaceRect === undefined) {
      return;
    }
    scaleStore.set(
      canvasWidth > workspaceRect.width
        ? parseFloat(((workspaceRect.width / canvasWidth) * 100).toFixed(2))
        : 100
    );
  }, [canvasWidth, workspaceRect]);
};
