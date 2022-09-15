import { useEffect } from "react";
import { useSubscribe } from "~/shared/pubsub";
import { useSelectedBreakpoint } from "~/designer/shared/nano-states";
import { useBreakpoints } from "~/shared/nano-states";
import { utils } from "@webstudio-is/project/index.server";
export const useSubscribeBreakpoints = () => {
  const [breakpoints, setBreakpoints] = useBreakpoints();
  const [selectedBreakpoint, setSelectedBreakpoint] = useSelectedBreakpoint();

  useSubscribe("loadBreakpoints", setBreakpoints);

  useEffect(() => {
    // Set the initial selected breakpoint
    if (selectedBreakpoint === undefined && breakpoints.length !== 0) {
      setSelectedBreakpoint(utils.breakpoints.sort(breakpoints)[0]);
    }

    // Breakpoints must have changed, lets update the selected breakpoint
    if (
      selectedBreakpoint !== undefined &&
      breakpoints.includes(selectedBreakpoint) === false
    ) {
      const nextSelectedBreakpoint = breakpoints.find(
        (breakpoint) => breakpoint.id === selectedBreakpoint.id
      );
      if (nextSelectedBreakpoint !== undefined)
        setSelectedBreakpoint(nextSelectedBreakpoint);
    }
  }, [breakpoints, selectedBreakpoint, setSelectedBreakpoint]);
};
