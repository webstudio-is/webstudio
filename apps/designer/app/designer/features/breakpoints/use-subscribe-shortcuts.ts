import { useSubscribe } from "~/shared/pubsub";
import { useBreakpoints } from "~/shared/nano-states";
import { useSelectedBreakpoint } from "../../shared/nano-states";
import { utils } from "@webstudio-is/project";

export const useSubscribeSelectBreakpointFromShortcut = () => {
  const [breakpoints] = useBreakpoints();
  const [, setSelectedBreakpoint] = useSelectedBreakpoint();
  useSubscribe("selectBreakpointFromShortcut", (index) => {
    const breakpoint = utils.breakpoints.sort(breakpoints)[index - 1];
    if (breakpoint) {
      setSelectedBreakpoint(breakpoint);
    }
  });
};
