import { atom, computed } from "nanostores";
import type { Breakpoint, Breakpoints } from "@webstudio-is/project-build";
import { isBaseBreakpoint } from "../breakpoints";

export const breakpointsStore = atom<Breakpoints>(new Map());

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

export const synchronizedBreakpointsStores = [
  ["selectedBreakpointId", selectedBreakpointIdStore],
] as const;
