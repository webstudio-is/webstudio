import { useStore } from "@nanostores/react";
import { useCallback, useEffect, useRef } from "react";
import {
  useCanvasWidth,
  workspaceRectStore,
} from "~/builder/shared/nano-states";
import { breakpointsStore } from "~/shared/nano-states";
import { selectedBreakpointStore } from "~/shared/nano-states";
import { findInitialWidth } from "./find-initial-width";

export const useSetInitialCanvasWidth = () => {
  const [, setCanvasWidth] = useCanvasWidth();
  const workspaceRect = useStore(workspaceRectStore);
  const breakpoints = useStore(breakpointsStore);
  return useCallback(
    (breakpointId) => {
      const breakpoint = breakpoints.get(breakpointId);
      if (workspaceRect === undefined || breakpoint === undefined) {
        return false;
      }
      const width = findInitialWidth(
        Array.from(breakpoints.values()),
        breakpoint,
        workspaceRect.width
      );
      setCanvasWidth(width);
      return true;
    },
    [workspaceRect, breakpoints, setCanvasWidth]
  );
};

export const useSetInitialCanvasWidthOnce = () => {
  const selectedBreakpoint = useStore(selectedBreakpointStore);
  const isDone = useRef(false);
  const setWidth = useSetInitialCanvasWidth();
  const workspaceRect = useStore(workspaceRectStore);

  // Set it initially once.
  useEffect(() => {
    if (isDone.current) {
      return;
    }
    if (selectedBreakpoint) {
      isDone.current = setWidth(selectedBreakpoint.id);
    }
  }, [selectedBreakpoint, setWidth, workspaceRect]);
};
