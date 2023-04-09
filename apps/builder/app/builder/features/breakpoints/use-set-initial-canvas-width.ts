import { useStore } from "@nanostores/react";
import { useCallback, useEffect, useRef } from "react";
import {
  useCanvasWidth,
  workspaceRectStore,
} from "~/builder/shared/nano-states";
import { breakpointsContainer } from "~/shared/nano-states";
import { selectedBreakpointStore } from "~/shared/nano-states/breakpoints";
import { findInitialWidth } from "./find-initial-width";

export const useSetInitialCanvasWidth = () => {
  const [, setCanvasWidth] = useCanvasWidth();
  const workspaceRect = useStore(workspaceRectStore);
  const breakpoints = useStore(breakpointsContainer);

  return useCallback(
    (breakpointId) => {
      const breakpoint = breakpoints.get(breakpointId);
      if (workspaceRect === undefined || breakpoint === undefined) {
        return;
      }
      const width = findInitialWidth(
        Array.from(breakpoints.values()),
        breakpoint,
        workspaceRect.width
      );
      setCanvasWidth(width);
    },
    [workspaceRect, breakpoints, setCanvasWidth]
  );
};

export const useSetInitialCanvasWidthOnce = () => {
  const selectedBreakpoint = useStore(selectedBreakpointStore);
  const isDone = useRef(false);
  const setWidth = useSetInitialCanvasWidth();
  // Set it initially once.
  useEffect(() => {
    if (isDone.current) {
      return;
    }
    isDone.current = true;
    setWidth(selectedBreakpoint.id);
  }, [selectedBreakpoint, setWidth]);
};
