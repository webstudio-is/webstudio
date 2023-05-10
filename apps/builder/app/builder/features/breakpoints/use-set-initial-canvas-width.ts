import { useStore } from "@nanostores/react";
import { useCallback, useEffect } from "react";
import type { Breakpoint } from "@webstudio-is/project-build";
import {
  useCanvasWidth,
  workspaceRectStore,
  canvasWidthStore,
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

/**
 *  Update canvas width initially and on breakpoint change
 **/
export const useSetCanvasWidth = () => {
  useEffect(() => {
    const update = () => {
      const breakpoints = breakpointsStore.get();
      const workspaceRect = workspaceRectStore.get();
      if (workspaceRect === undefined || breakpoints.size === 0) {
        return;
      }
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

        if (canvasWidthStore.get() !== width) {
          canvasWidthStore.set(width);
        }
      }
    };

    const unsubscribeBreakpointStore = breakpointsStore.subscribe(update);
    const unsubscribeRectStore =
      workspaceRectStore.get() === undefined
        ? workspaceRectStore.listen((workspaceRect) => {
            if (workspaceRect === undefined) {
              return;
            }
            unsubscribeRectStore();
            update();
          })
        : () => {
            /**/
          };

    return () => {
      unsubscribeBreakpointStore();
      unsubscribeRectStore();
    };
  }, []);
};
