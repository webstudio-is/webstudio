import { useStore } from "@nanostores/react";
import { useCallback, useEffect, useRef } from "react";
import type { Breakpoint } from "@webstudio-is/project-build";
import {
  useCanvasWidth,
  workspaceRectStore,
} from "~/builder/shared/nano-states";
import { breakpointsStore } from "~/shared/nano-states";
import { findInitialWidth } from "./find-initial-width";
import { isBaseBreakpoint } from "~/shared/breakpoints";

// Set canvas width based on workspace width, breakpoints and passed breakpoint id.
export const useSetInitialCanvasWidth = () => {
  const [, setCanvasWidth] = useCanvasWidth();
  const workspaceRect = useStore(workspaceRectStore);
  const breakpoints = useStore(breakpointsStore);
  return useCallback(
    (breakpointId: Breakpoint["id"]) => {
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
  const isDone = useRef(false);
  const [, setCanvasWidth] = useCanvasWidth();
  const workspaceRect = useStore(workspaceRectStore);
  const breakpoints = useStore(breakpointsStore);

  // Set it initially once.
  useEffect(() => {
    if (isDone.current || workspaceRect === undefined) {
      return;
    }

    isDone.current = true;

    const breakpointValues = Array.from(breakpoints.values());
    const baseBreakpoint = breakpointValues.find(isBaseBreakpoint);

    // When there is base breakpoint, we want to find the lowest possible size
    // that is bigger than all max breakpoints and smaller than all min breakpoints.
    if (baseBreakpoint) {
      const width = findInitialWidth(
        breakpointValues,
        baseBreakpoint,
        workspaceRect.width
      );
      setCanvasWidth(width);
    }
  }, [breakpoints, setCanvasWidth, workspaceRect]);
};
