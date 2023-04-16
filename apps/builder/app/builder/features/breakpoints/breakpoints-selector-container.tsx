import { useStore } from "@nanostores/react";
import {
  breakpointsStore,
  selectedBreakpointStore,
} from "~/shared/nano-states";
import { BreakpointsSelector } from "./breakpoints-selector";

export const BreakpointsSelectorContainer = () => {
  const breakpoints = useStore(breakpointsStore);
  const selectedBreakpoint = useStore(selectedBreakpointStore);
  if (selectedBreakpoint === undefined) {
    return null;
  }
  return (
    <BreakpointsSelector
      breakpoints={breakpoints}
      selectedBreakpoint={selectedBreakpoint}
    />
  );
};
