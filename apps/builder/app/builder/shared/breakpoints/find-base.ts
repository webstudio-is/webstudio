import type { Breakpoint } from "@webstudio-is/project-build";

// @todo ensure there is only one base breakpoint
export const findBaseBreakpoint = (breakpoints: Array<Breakpoint>) => {
  return breakpoints.find(
    (breakpoint) =>
      breakpoint.minWidth === undefined && breakpoint.maxWidth === undefined
  );
};
