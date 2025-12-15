import { atom, computed } from "nanostores";
import type { Breakpoint } from "@webstudio-is/sdk";
import { $breakpoints } from "../sync/data-stores";

// Re-export for backward compatibility
export { $breakpoints };

export const isBaseBreakpoint = (breakpoint: {
  minWidth?: number;
  maxWidth?: number;
}) => breakpoint.minWidth === undefined && breakpoint.maxWidth === undefined;

export const $selectedBreakpointId = atom<undefined | Breakpoint["id"]>(
  undefined
);

export const $selectedBreakpoint = computed(
  [$breakpoints, $selectedBreakpointId],
  (breakpoints, selectedBreakpointId) => {
    const selectedBreakpoint =
      selectedBreakpointId === undefined
        ? undefined
        : breakpoints.get(selectedBreakpointId);

    if (breakpoints.size === 0) {
      return;
    }
    const breakpointsArray = Array.from(breakpoints.values());
    return (
      selectedBreakpoint ??
      breakpointsArray.find(isBaseBreakpoint) ??
      breakpointsArray[0] ??
      undefined
    );
  }
);
