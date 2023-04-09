import { compareMedia } from "@webstudio-is/css-engine";
import { isBaseBreakpoint } from "./is-base-breakpoint";

// We group in 3 groups: min-width, base (no min/max), max-width conditions
export const groupBreakpoints = <
  Breakpoint extends { minWidth?: number; maxWidth?: number }
>(
  breakpoints: Array<Breakpoint>
) => {
  const sorted = breakpoints.sort(compareMedia);
  const maxs = sorted.filter((breakpoint) => breakpoint.maxWidth !== undefined);
  const mins = sorted
    .filter((breakpoint) => breakpoint.minWidth !== undefined)
    .reverse();
  const base = sorted.filter(isBaseBreakpoint);
  return [...mins, ...base, ...maxs];
};
