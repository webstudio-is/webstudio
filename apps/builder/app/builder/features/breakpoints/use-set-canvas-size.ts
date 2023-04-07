import { useStore } from "@nanostores/react";
import { useEffect } from "react";
import { useCanvasWidth } from "~/builder/shared/nano-states";
import { breakpointsContainer } from "~/shared/nano-states";
import {
  scaleStore,
  selectedBreakpointStore,
  workspaceRectStore,
} from "~/shared/nano-states/breakpoints";
import { findInitialWidth } from "./find-initial-width";

export const useSetCanvasSize = () => {
  const selectedBreakpoint = useStore(selectedBreakpointStore);
  const [canvasWidth, setCanvasWidth] = useCanvasWidth();
  const workspaceRect = useStore(workspaceRectStore);
  const breakpoints = useStore(breakpointsContainer);

  useEffect(() => {
    if (workspaceRect === undefined) {
      return;
    }
    const width = findInitialWidth(
      Array.from(breakpoints.values()),
      selectedBreakpoint,
      workspaceRect.width
    );
    setCanvasWidth(width);
  }, [workspaceRect, selectedBreakpoint, breakpoints, setCanvasWidth]);

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
