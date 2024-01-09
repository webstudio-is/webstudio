import { useStore } from "@nanostores/react";
import { $breakpoints, selectedBreakpointStore } from "~/shared/nano-states";
import { BreakpointsSelector } from "./breakpoints-selector";

export const BreakpointsSelectorContainer = () => {
  const breakpoints = useStore($breakpoints);
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
