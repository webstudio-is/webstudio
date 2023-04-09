import { breakpointsStore } from "../../../shared/nano-states/nano-states";
import { selectedBreakpointIdStore } from "./stores";
import { groupBreakpoints } from "~/builder/features/breakpoints";

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
