import { groupBreakpoints } from ".";
import { selectedBreakpointIdStore, breakpointsStore } from "../nano-states";

/**
 * Order number starts with 1 and covers all existing breakpoints
 */
export const selectBreakpointByOrder = (orderNumber: number) => {
  const breakpoints = breakpointsStore.get();
  const index = orderNumber - 1;
  const breakpoint = groupBreakpoints(Array.from(breakpoints.values())).at(
    index
  );
  if (breakpoint) {
    selectedBreakpointIdStore.set(breakpoint.id);
  }
};
