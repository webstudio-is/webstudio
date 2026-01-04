import { useEffect } from "react";
import { compareMedia } from "@webstudio-is/css-engine";
import type { Breakpoint } from "@webstudio-is/sdk";
import {
  groupBreakpoints,
  isBaseBreakpoint,
  minCanvasWidth,
} from "~/shared/breakpoints-utils";
import { $workspaceRect, $canvasWidth } from "~/builder/shared/nano-states";
import {
  $breakpoints,
  $isPreviewMode,
  $selectedBreakpoint,
} from "~/shared/nano-states";

const defaultWidth = 320;

// We want to know if user resized the canvas to a custom value.
const isCustomCanvasWidth = (
  breakpoints: Array<Breakpoint>,
  selectedBreakpoint: Breakpoint,
  canvasWidth?: number
) => {
  if (canvasWidth === undefined) {
    return false;
  }
  const hasMinWidth = breakpoints.some(
    (breakpoint) => breakpoint.minWidth !== undefined
  );

  // Only in case of base breakpoint and whithout min-width breakpoint, we ignore the custom width,
  // because we want it to go full viewport width
  if (isBaseBreakpoint(selectedBreakpoint) && hasMinWidth === false) {
    return false;
  }

  for (const breakpoint of breakpoints) {
    if (
      breakpoint.minWidth !== undefined &&
      canvasWidth === breakpoint.minWidth
    ) {
      return false;
    }
    if (
      breakpoint.maxWidth !== undefined &&
      canvasWidth === breakpoint.maxWidth + 1
    ) {
      return false;
    }
  }
  return true;
};

// Find a canvas width that is within the selected breakpoint's range, but is at it's minimum.
// Goal is to allow user to consistently know the direction they want to resize to after they switched to a breakpoint.
// In this case they will want to always increase the width after switching.
export const calcCanvasWidth = ({
  breakpoints,
  selectedBreakpoint,
  workspaceWidth,
  canvasWidth,
}: {
  breakpoints: Array<Breakpoint>;
  selectedBreakpoint: Breakpoint;
  workspaceWidth: number;
  canvasWidth?: number;
}) => {
  // Condition-based breakpoints (e.g., orientation:portrait, hover:hover) don't have width ranges
  // Return undefined so the width will be defined by current canvas width
  if (selectedBreakpoint.condition !== undefined) {
    return;
  }

  // When user has resized the canvas to a custom value, we want to keep it.
  if (isCustomCanvasWidth(breakpoints, selectedBreakpoint, canvasWidth)) {
    return canvasWidth;
  }

  // Finding the canvas width when user selects base breakpoint is a bit more complicated.
  // We want to find the lowest possible size that is bigger than all max breakpoints and smaller than all min breakpoints.
  // Note: it is still possible to get intersecting min and max breakpoints.
  if (isBaseBreakpoint(selectedBreakpoint)) {
    // Base is the only breakpoint
    if (breakpoints.length === 1) {
      return workspaceWidth;
    }

    const grouped = groupBreakpoints(breakpoints);
    // Only consider width-based breakpoints for canvas sizing
    const filtered = grouped.widthBased.filter(({ minWidth, maxWidth }) => {
      // We don't want to grow the canvas beyond the workspace width.
      if (minWidth && minWidth < workspaceWidth) {
        return true;
      }
      // Max width can not be smaller than the minimum canvas width.
      if (maxWidth && maxWidth > minCanvasWidth) {
        return true;
      }
    });
    let lowestMinWidth = filtered
      .filter(({ minWidth }) => minWidth !== undefined)
      .at(-1)?.minWidth;

    lowestMinWidth =
      lowestMinWidth === undefined ? workspaceWidth : lowestMinWidth - 1;

    let highestMaxWidth = filtered
      .filter(({ maxWidth }) => maxWidth !== undefined)
      .at(0)?.maxWidth;

    highestMaxWidth =
      highestMaxWidth === undefined ? minCanvasWidth : highestMaxWidth + 1;

    return Math.max(lowestMinWidth, highestMaxWidth);
  }

  if (selectedBreakpoint.minWidth !== undefined) {
    if (selectedBreakpoint.minWidth === 0) {
      return defaultWidth;
    }
    return selectedBreakpoint.minWidth;
  }

  const sorted = breakpoints
    .filter((breakpoint) => breakpoint.maxWidth !== undefined)
    .sort(compareMedia)
    .reverse();

  const index = sorted.findIndex(
    (breakpoint) => breakpoint.id === selectedBreakpoint.id
  );
  const previousBreakpointMaxWidth = sorted[index - 1]?.maxWidth;
  if (previousBreakpointMaxWidth === undefined) {
    return defaultWidth;
  }
  return previousBreakpointMaxWidth + 1;
};

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
