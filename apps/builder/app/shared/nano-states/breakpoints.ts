import { atom, computed } from "nanostores";
import type { Breakpoint } from "@webstudio-is/project-build";
import { utils } from "@webstudio-is/project";
import { breakpointsContainer } from "./nano-states";

export const minZoom = 10;
const maxZoom = 100;
const zoomStep = 20;

export const zoomStore = atom<number>(100);

export const zoomIn = () => {
  zoomStore.set(Math.min(zoomStore.get() + zoomStep, maxZoom));
};

export const zoomOut = () => {
  zoomStore.set(Math.max(zoomStore.get() - zoomStep, minZoom));
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
    const fallbackBreakpoint = utils.breakpoints.sort(breakpoints).at(0);
    return matchedBreakpoint ?? fallbackBreakpoint;
  }
);

/**
 * order number starts with 1 and covers all existing breakpoints
 */
export const selectBreakpointByOrderNumber = (orderNumber: number) => {
  const breakpoints = breakpointsContainer.get();
  const index = orderNumber - 1;
  const breakpoint = utils.breakpoints.sort(breakpoints).at(index);
  if (breakpoint) {
    selectedBreakpointIdStore.set(breakpoint.id);
  }
};

export const synchronizedBreakpointsStores = [
  ["zoomStore", zoomStore],
  ["selectedBreakpointId", selectedBreakpointIdStore],
] as const;

export const workspaceRectStore = atom<DOMRect | undefined>();
