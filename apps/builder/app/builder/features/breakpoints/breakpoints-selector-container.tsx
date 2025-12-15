import { useStore } from "@nanostores/react";
import { $breakpoints } from "~/shared/sync/data-stores";
import { $selectedBreakpoint } from "~/shared/nano-states";
import { BreakpointsSelector } from "./breakpoints-selector";

export const BreakpointsSelectorContainer = () => {
  const breakpoints = useStore($breakpoints);
  const selectedBreakpoint = useStore($selectedBreakpoint);
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
