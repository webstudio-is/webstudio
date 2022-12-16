import { useMemo } from "react";
import { useSelectedBreakpoint } from "~/designer/shared/nano-states";
import { useBreakpoints } from "~/shared/nano-states";
import { utils } from "@webstudio-is/project";

/**
 * Return the next breakpoint from the currently selected one, sorted by the `sort()`
 */
export const useNextBreakpoint = () => {
  const [selectedBreakpoint] = useSelectedBreakpoint();
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
