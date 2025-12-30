import { groupBreakpoints } from "../breakpoints-utils";
import { $selectedBreakpointId, $breakpoints } from "../nano-states";
import { setCanvasWidth } from "~/builder/shared/calc-canvas-width";

/**
 * Order number starts with 1 and covers all existing breakpoints
 */
export const selectBreakpointByOrder = (orderNumber: number) => {
  const breakpoints = $breakpoints.get();
  const index = orderNumber - 1;
  const grouped = groupBreakpoints(Array.from(breakpoints.values()));
  const allBreakpoints = [...grouped.widthBased, ...grouped.custom];
  const breakpoint = allBreakpoints.at(index);
  if (breakpoint) {
    $selectedBreakpointId.set(breakpoint.id);
    setCanvasWidth(breakpoint.id);
  }
};
