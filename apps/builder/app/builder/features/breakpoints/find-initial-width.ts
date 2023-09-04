import { compareMedia } from "@webstudio-is/css-engine";
import type { Breakpoint } from "@webstudio-is/sdk";
import { groupBreakpoints, isBaseBreakpoint } from "~/shared/breakpoints";

const defaultWidth = 320;

// Find a canvas width that is within the selected breakpoint's range, but is at it's minimum.
// Goal is to allow user to consistently know the direction they want to resize to after they switched to a breakpoint.
// In this case they will want to always increase the width after switching.
export const findInitialWidth = (
  breakpoints: Array<Breakpoint>,
  selectedBreakpoint: Breakpoint,
  workspaceWidth: number
) => {
  // Finding the canvas width when user selects base breakpoint is a bit more complicated.
  // We want to find the lowest possible size that is bigger than all max breakpoints and smaller than all min breakpoints.
  // Note: it is still possible to get intersecting min and max breakpoints.
  if (isBaseBreakpoint(selectedBreakpoint)) {
    // Base is the only breakpoint
    if (breakpoints.length === 1) {
      return workspaceWidth;
    }
    const grouped = groupBreakpoints(breakpoints);
    const baseIndex = grouped.findIndex(
      ({ id }) => selectedBreakpoint.id === id
    );
    const next = grouped[baseIndex + 1];
    if (next?.maxWidth !== undefined) {
      return Math.max(next.maxWidth + 1, defaultWidth);
    }
    const prev = grouped[baseIndex - 1];
    if (prev?.minWidth !== undefined) {
      if (prev.minWidth < workspaceWidth) {
        return Math.max(prev.minWidth - 1, defaultWidth);
      }
      return workspaceWidth;
    }
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
