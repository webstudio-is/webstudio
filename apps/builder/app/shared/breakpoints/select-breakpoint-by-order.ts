import { groupBreakpoints } from "./group-breakpoints";
import { selectedBreakpointIdStore, breakpointsStore } from "../nano-states";
import { setInitialCanvasWidth } from "~/builder/features/breakpoints";

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
    setInitialCanvasWidth(breakpoint.id);
  }
};
