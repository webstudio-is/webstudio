import { compareMedia } from "@webstudio-is/css-engine";
import type { Breakpoint } from "@webstudio-is/project-build";

const defaultWidth = 320;

// Find a canvas width that is within the selected breakpoint's range, but is at it's minimum.
// Goal is to allow user to consistently know the direction they want to resize to after they switched to a breakpoint.
// In this case they will want to always increase the width after switching.
export const findInitialWidth = (
  breakpoints: Array<Breakpoint>,
  selectedBreakpoint: Breakpoint,
  workspaceWidth: number
) => {
  // When on a base breakpoint, we want to show maximum width canvas
  if (
    selectedBreakpoint.minWidth === undefined &&
    selectedBreakpoint.maxWidth === undefined
  ) {
    return workspaceWidth;
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
