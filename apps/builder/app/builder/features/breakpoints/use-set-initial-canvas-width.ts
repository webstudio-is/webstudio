import { useEffect } from "react";
import type { Breakpoint } from "@webstudio-is/sdk";
import { $workspaceRect, $canvasWidth } from "~/builder/shared/nano-states";
import {
  $breakpoints,
  $isPreviewMode,
  $selectedBreakpoint,
} from "~/shared/nano-states";
import { calcCanvasWidth } from "./calc-canvas-width";

export const setCanvasWidth = (breakpointId: Breakpoint["id"]) => {
  const workspaceRect = $workspaceRect.get();
  const breakpoints = $breakpoints.get();
  const selectedBreakpoint = breakpoints.get(breakpointId);

  if (workspaceRect === undefined || selectedBreakpoint === undefined) {
    return false;
  }

  const width = calcCanvasWidth({
    breakpoints: Array.from(breakpoints.values()),
    selectedBreakpoint,
    workspaceWidth: workspaceRect.width,
  });

  $canvasWidth.set(width);
  return true;
};

/**
 *  Update canvas width initially and on breakpoint change
 **/
export const useSetCanvasWidth = () => {
  useEffect(() => {
    const update = () => {
      const selectedBreakpoint = $selectedBreakpoint.get();
      if (selectedBreakpoint) {
        // When there is selected breakpoint, we want to find the smallest possible size
        // that is bigger than any max-width breakpoints and smaller than any min-width breakpoints.
        // When on base breakpoint it will be the biggest possible but smaller than the workspace.
        setCanvasWidth(selectedBreakpoint.id);
      }
    };

    const unsubscribeBreakpoints = $breakpoints.subscribe(update);
    const unsubscribeRect = $workspaceRect.listen(update);
    const unsubscribeIsPreviewMode = $isPreviewMode.listen((isPreviewMode) => {
      if (isPreviewMode) {
        update();
      }
    });
    const unsubscribeSelectedBreakpoint = $selectedBreakpoint.listen(
      (selectedBreakpoint) => {
        // This will set initial width of the canvas once the initial selected breakpoint is known.
        if (selectedBreakpoint) {
          update();
          // We can unsubscribe right away as we only need this once.
          unsubscribeSelectedBreakpoint();
        }
      }
    );

    return () => {
      unsubscribeBreakpoints();
      unsubscribeRect();
      unsubscribeIsPreviewMode();
      unsubscribeSelectedBreakpoint();
    };
  }, []);
};
