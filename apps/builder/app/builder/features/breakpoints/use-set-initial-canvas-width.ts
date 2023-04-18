import { useStore } from "@nanostores/react";
import { useCallback, useEffect, useRef } from "react";
import { findApplicableMedia } from "@webstudio-is/css-engine";
import type { Breakpoint } from "@webstudio-is/project-build";
import {
  useCanvasWidth,
  workspaceRectStore,
} from "~/builder/shared/nano-states";
import {
  breakpointsStore,
  selectedBreakpointIdStore,
} from "~/shared/nano-states";
import { findInitialWidth } from "./find-initial-width";
import { groupBreakpoints, isBaseBreakpoint } from "~/shared/breakpoints";

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
      const grouped = groupBreakpoints(breakpointValues);
      const baseIndex = grouped.findIndex(isBaseBreakpoint);
      const nextAfterBase = grouped[baseIndex + 1];
      if (nextAfterBase?.maxWidth !== undefined) {
        const width = nextAfterBase.maxWidth + 1;
        setCanvasWidth(width);
        return;
      }
    }

    // Find the breakpoint that applies according to the workspace width.
    const applicableBreakpoint = findApplicableMedia(
      breakpointValues,
      workspaceRect.width
    );
    if (applicableBreakpoint) {
      selectedBreakpointIdStore.set(applicableBreakpoint.id);
    }
    setCanvasWidth(workspaceRect.width);
  }, [breakpoints, setCanvasWidth, workspaceRect]);
};
