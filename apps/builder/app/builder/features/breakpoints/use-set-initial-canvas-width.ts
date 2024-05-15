import { useEffect } from "react";
import type { Breakpoint } from "@webstudio-is/sdk";
import { $workspaceRect, $canvasWidth } from "~/builder/shared/nano-states";
import {
  $breakpoints,
  $isPreviewMode,
  $selectedBreakpoint,
} from "~/shared/nano-states";
import { calcCanvasWidth } from "./calc-canvas-width";
import { isBaseBreakpoint } from "~/shared/breakpoints";

// Fixes initial canvas width jump on wide screens.
// Calculate canvas width during SSR based on known initial width for wide screens.
export const setInitialCanvasWidth = (breakpointId: Breakpoint["id"]) => {
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

// @todo merge with calcCanvasWidth and add tests
const checkIfCustomCanvasWidth = (
  currentWidth: number,
  selectedBreakpoint: Breakpoint,
  breakpoints: Array<Breakpoint>
) => {
  const hasMinWidth = breakpoints.some((b) => b.minWidth !== undefined);

  if (hasMinWidth === false && isBaseBreakpoint(selectedBreakpoint)) {
    return false;
  }

  for (const breakpoint of breakpoints) {
    if (
      breakpoint.minWidth !== undefined &&
      currentWidth === breakpoint.minWidth
    ) {
      return false;
    }
    if (
      breakpoint.maxWidth !== undefined &&
      currentWidth === breakpoint.maxWidth + 1
    ) {
      return false;
    }
  }
  return true;
};

/**
 *  Update canvas width initially and on breakpoint change
 **/
export const useSetCanvasWidth = () => {
  useEffect(() => {
    const update = () => {
      const breakpoints = $breakpoints.get();
      const workspaceRect = $workspaceRect.get();
      if (workspaceRect === undefined || breakpoints.size === 0) {
        return;
      }
      const selectedBreakpoint = $selectedBreakpoint.get();

      // When there is selected breakpoint, we want to find the smallest possible size
      // that is bigger than any max-width breakpoints and smaller than any min-width breakpoints.
      // When on base breakpoint it will be the biggest possible but smaller than the workspace.
      if (selectedBreakpoint) {
        const currentWidth = $canvasWidth.get();
        const breakpointValues = Array.from(breakpoints.values());
        let nextWidth = calcCanvasWidth({
          breakpoints: breakpointValues,
          selectedBreakpoint,
          workspaceWidth: workspaceRect.width,
        });

        if (currentWidth !== undefined) {
          const isCustomCanvasWidth = checkIfCustomCanvasWidth(
            currentWidth,
            selectedBreakpoint,
            breakpointValues
          );

          if (isCustomCanvasWidth) {
            nextWidth = currentWidth;
          }
        }

        $canvasWidth.set(nextWidth);
      }
    };

    const unsubscribeBreakpointStore = $breakpoints.subscribe(update);
    const unsubscribeRectStore = $workspaceRect.listen((workspaceRect) => {
      if (workspaceRect === undefined) {
        return;
      }
      update();
    });
    const unsubscribeIsPreviewMode = $isPreviewMode.listen((isPreviewMode) => {
      if (isPreviewMode) {
        update();
      }
    });

    return () => {
      unsubscribeBreakpointStore();
      unsubscribeRectStore();
      unsubscribeIsPreviewMode();
    };
  }, []);
};
