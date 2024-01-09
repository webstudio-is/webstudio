import { atom, computed } from "nanostores";
import type { Breakpoint, Breakpoints } from "@webstudio-is/sdk";
import { isBaseBreakpoint } from "../breakpoints";

export const $breakpoints = atom<Breakpoints>(new Map());

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

export const $synchronizedBreakpoints = [
  ["selectedBreakpointId", $selectedBreakpointId],
] as const;
