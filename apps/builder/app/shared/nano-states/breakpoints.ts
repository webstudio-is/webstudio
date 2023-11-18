import { atom, computed } from "nanostores";
import type { Breakpoint, Breakpoints } from "@webstudio-is/sdk";
import { isBaseBreakpoint } from "../breakpoints";

export const breakpointsStore = atom<Breakpoints>(new Map());

export const selectedBreakpointIdStore = atom<{
  value: undefined | Breakpoint["id"];
}>({ value: undefined });

export const selectedBreakpointStore = computed(
  [breakpointsStore, selectedBreakpointIdStore],
  (breakpoints, selectedBreakpointId) => {
    const selectedBreakpoint =
      selectedBreakpointId?.value === undefined
        ? undefined
        : breakpoints.get(selectedBreakpointId.value);

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

export const synchronizedBreakpointsStores = [
  ["selectedBreakpointId", selectedBreakpointIdStore],
] as const;
