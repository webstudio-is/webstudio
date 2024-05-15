import { compareMedia } from "@webstudio-is/css-engine";
import type { Breakpoint } from "@webstudio-is/sdk";
import {
  groupBreakpoints,
  isBaseBreakpoint,
  minCanvasWidth,
} from "~/shared/breakpoints";

const defaultWidth = 320;

// Find a canvas width that is within the selected breakpoint's range, but is at it's minimum.
// Goal is to allow user to consistently know the direction they want to resize to after they switched to a breakpoint.
// In this case they will want to always increase the width after switching.
export const calcCanvasWidth = ({
  breakpoints,
  selectedBreakpoint,
  workspaceWidth,
}: {
  breakpoints: Array<Breakpoint>;
  selectedBreakpoint: Breakpoint;
  workspaceWidth: number;
}) => {
  // Finding the canvas width when user selects base breakpoint is a bit more complicated.
  // We want to find the lowest possible size that is bigger than all max breakpoints and smaller than all min breakpoints.
  // Note: it is still possible to get intersecting min and max breakpoints.
  if (isBaseBreakpoint(selectedBreakpoint)) {
    // Base is the only breakpoint
    if (breakpoints.length === 1) {
      return workspaceWidth;
    }

    const grouped = groupBreakpoints(breakpoints).filter(
      ({ minWidth, maxWidth }) => {
        if (minWidth && minWidth < workspaceWidth) {
          return true;
        }
        if (maxWidth && maxWidth > minCanvasWidth) {
          return true;
        }
      }
    );
    let lowestMinWidth = grouped
      .filter(({ minWidth }) => {
        if (minWidth && minWidth < workspaceWidth) {
          return true;
        }
      })
      .at(-1)?.minWidth;
    lowestMinWidth =
      lowestMinWidth === undefined ? workspaceWidth : lowestMinWidth - 1;

    let highestMaxWidth = grouped
      .filter(({ maxWidth }) => {
        if (maxWidth && maxWidth > minCanvasWidth) {
          return true;
        }
      })
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
