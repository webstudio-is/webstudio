import { atom, computed } from "nanostores";
import type { Breakpoint } from "@webstudio-is/project-build";
import { breakpointsContainer } from "./nano-states";
import { compareMedia } from "@webstudio-is/css-engine";

export const minScale = 10;
const maxScale = 100;
const scaleStep = 20;

export const scaleStore = atom<number>(100);

export const scaleUp = () => {
  scaleStore.set(Math.min(scaleStore.get() + scaleStep, maxScale));
};

export const scaleDown = () => {
  scaleStore.set(Math.max(scaleStore.get() - scaleStep, minScale));
};

export const selectedBreakpointIdStore = atom<undefined | Breakpoint["id"]>(
  undefined
);

export const selectedBreakpointStore = computed(
  [breakpointsContainer, selectedBreakpointIdStore],
  (breakpoints, selectedBreakpointId) => {
    const matchedBreakpoint =
      selectedBreakpointId === undefined
        ? undefined
        : breakpoints.get(selectedBreakpointId);
    // initially set first breakpoint as selected breakpoint
    const fallbackBreakpoint = Array.from(breakpoints.values())
      .sort(compareMedia)
      .at(0);
    return matchedBreakpoint ?? fallbackBreakpoint;
  }
);

/**
 * order number starts with 1 and covers all existing breakpoints
 */
export const selectBreakpointByOrderNumber = (orderNumber: number) => {
  const breakpoints = breakpointsContainer.get();
  const index = orderNumber - 1;
  const breakpoint = Array.from(breakpoints.values())
    .sort(compareMedia)
    .at(index);
  if (breakpoint) {
    selectedBreakpointIdStore.set(breakpoint.id);
  }
};

export const synchronizedBreakpointsStores = [
  ["scaleStore", scaleStore],
  ["selectedBreakpointId", selectedBreakpointIdStore],
] as const;

export const workspaceRectStore = atom<DOMRect | undefined>();
