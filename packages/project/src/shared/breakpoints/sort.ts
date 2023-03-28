import type { Breakpoints } from "@webstudio-is/project-build";

/**
 * Sort by minWidth descending.
 * We want media querries with bigger minWidth to override the smaller once.
 * @todo remove this once we have ability to control order from the UI
 */
export const sort = (breakpoints: Breakpoints) => {
  return Array.from(breakpoints.values()).sort((breakpointA, breakpointB) => {
    return (breakpointA.minWidth ?? 0) - (breakpointB.minWidth ?? 0);
  });
};
