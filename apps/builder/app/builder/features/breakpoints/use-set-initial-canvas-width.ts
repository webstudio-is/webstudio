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
    if (isDone.current) {
      return;
    }
    if (workspaceRect === undefined) {
      return;
    }

    const width = workspaceRect.width;

    const applicableBreakpoint = findApplicableMedia(
      Array.from(breakpoints.values()),
      width
    );
    if (applicableBreakpoint) {
      selectedBreakpointIdStore.set(applicableBreakpoint.id);
    }

    setWidth(width);

    isDone.current = true;
  }, [breakpoints, setWidth, workspaceRect]);
};
