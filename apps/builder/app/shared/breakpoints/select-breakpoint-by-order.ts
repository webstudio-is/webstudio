import { groupBreakpoints } from "./group-breakpoints";
import { selectedBreakpointIdStore, breakpointsStore } from "../nano-states";
import { setInitialCanvasWidthAsTransaction } from "~/builder/features/breakpoints";
import { serverSyncStore } from "~/shared/sync";
import { canvasWidthStore } from "~/builder/shared/nano-states";

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
    serverSyncStore.createTransaction(
      [selectedBreakpointIdStore, canvasWidthStore],
      (selectedBreakpointIdStore, canvasWidthStore) => {
        selectedBreakpointIdStore.value = breakpoint.id;
        setInitialCanvasWidthAsTransaction(canvasWidthStore, breakpoint.id);
      }
    );
  }
};
