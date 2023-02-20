import { useMemo } from "react";
import { useBreakpoints } from "~/shared/nano-states";
import { utils } from "@webstudio-is/project";
import { useStore } from "@nanostores/react";
import { selectedBreakpointStore } from "~/shared/nano-states/breakpoints";

/**
 * Return the next breakpoint from the currently selected one, sorted by the `sort()`
 */
export const useNextBreakpoint = () => {
  const selectedBreakpoint = useStore(selectedBreakpointStore);
  const [breakpoints] = useBreakpoints();

  const sortedBreakpoints = useMemo(
    () => utils.breakpoints.sort(breakpoints),
    [breakpoints]
  );

  return useMemo(() => {
    if (selectedBreakpoint === undefined) {
      return;
    }
    const index = sortedBreakpoints.findIndex(
      (breakpoint) => breakpoint.id === selectedBreakpoint.id
    );
    if (index === -1) {
      return undefined;
    }
    return sortedBreakpoints[index + 1];
  }, [sortedBreakpoints, selectedBreakpoint]);
};
