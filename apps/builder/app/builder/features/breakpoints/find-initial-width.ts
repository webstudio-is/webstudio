import { compareMedia } from "@webstudio-is/css-engine";
import type { Breakpoint } from "@webstudio-is/project-build";

// Find a canvas width that is within the selected breakpoint's range, but is at it's minimum.
// Goal is to allow user to consistently know the direction they want to resize to after they switched to a breakpoint.
// In this case they will want to always increase the width after switching.
export const findInitialWidth = (
  breakpoints: Array<Breakpoint>,
  selectedBreakpoint: Breakpoint,
  fallbackWidth: number
) => {
  if (
    selectedBreakpoint.minWidth === undefined &&
    selectedBreakpoint.maxWidth === undefined
  ) {
    return fallbackWidth;
  }

  if (selectedBreakpoint.minWidth !== undefined) {
    return selectedBreakpoint.minWidth;
  }

  const sorted = breakpoints
    .filter((breakpoint) => breakpoint.maxWidth !== undefined)
    .sort(compareMedia)
    .reverse();

  const index = sorted.findIndex(
    (breakpoint) => breakpoint.id === selectedBreakpoint.id
  );

  return Math.max(320, (sorted[index - 1]?.maxWidth ?? 0) + 1);
};
