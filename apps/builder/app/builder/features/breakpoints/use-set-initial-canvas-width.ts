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
  const [, setWidth] = useCanvasWidth();
  const workspaceRect = useStore(workspaceRectStore);
  const breakpoints = useStore(breakpointsStore);

  // Set it initially once.
  useEffect(() => {
    if (isDone.current || workspaceRect === undefined) {
      return;
    }

    const { width } = workspaceRect;
    const breakpointValues = Array.from(breakpoints.values());
    const baseBreakpoint = breakpointValues.find(isBaseBreakpoint);

    // We don't need to set breakpoint if there is a base breakpoint, since it's what should be used by default.
    if (baseBreakpoint === undefined) {
      const applicableBreakpoint = findApplicableMedia(breakpointValues, width);
      if (applicableBreakpoint) {
        selectedBreakpointIdStore.set(applicableBreakpoint.id);
      }
    }

    setWidth(width);

    isDone.current = true;
  }, [breakpoints, setWidth, workspaceRect]);
};
