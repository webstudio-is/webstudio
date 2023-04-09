import { atom, computed } from "nanostores";
import type { Breakpoint } from "@webstudio-is/project-build";
import { breakpointsStore } from "./nano-states";
import { compareMedia } from "@webstudio-is/css-engine";
import { isBaseBreakpoint } from "~/builder/shared/breakpoints";

export const selectedBreakpointIdStore = atom<undefined | Breakpoint["id"]>(
  undefined
);

export const selectedBreakpointStore = computed(
  [breakpointsStore, selectedBreakpointIdStore],
  (breakpoints, selectedBreakpointId) => {
    const matchedBreakpoint =
      selectedBreakpointId === undefined
        ? undefined
        : breakpoints.get(selectedBreakpointId);

    const breakpointsArray = Array.from(breakpoints.values());

    return (
      matchedBreakpoint ??
      breakpointsArray.find(isBaseBreakpoint) ??
      breakpointsArray[0]
    );
  }
);

/**
 * order number starts with 1 and covers all existing breakpoints
 */
export const selectBreakpointByOrderNumber = (orderNumber: number) => {
  const breakpoints = breakpointsStore.get();
  const index = orderNumber - 1;
  const breakpoint = Array.from(breakpoints.values())
    .sort(compareMedia)
    .at(index);
  if (breakpoint) {
    selectedBreakpointIdStore.set(breakpoint.id);
  }
};

export const synchronizedBreakpointsStores = [
  ["selectedBreakpointId", selectedBreakpointIdStore],
] as const;
