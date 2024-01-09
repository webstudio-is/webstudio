import { groupBreakpoints } from "./group-breakpoints";
import { $selectedBreakpointId, $breakpoints } from "../nano-states";
import { setInitialCanvasWidth } from "~/builder/features/breakpoints";

/**
 * Order number starts with 1 and covers all existing breakpoints
 */
export const selectBreakpointByOrder = (orderNumber: number) => {
  const breakpoints = $breakpoints.get();
  const index = orderNumber - 1;
  const breakpoint = groupBreakpoints(Array.from(breakpoints.values())).at(
    index
  );
  if (breakpoint) {
    $selectedBreakpointId.set(breakpoint.id);
    setInitialCanvasWidth(breakpoint.id);
  }
};
