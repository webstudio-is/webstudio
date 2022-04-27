import { useEffect } from "react";
import { Breakpoint, sort } from "@webstudio-is/sdk";
import { useSubscribe } from "../../shared/canvas-iframe";
import {
  useBreakpoints,
  useSelectedBreakpoint,
} from "../../shared/nano-values";

export const useSubscribeBreakpoints = () => {
  const [breakpoints, setBreakpoints] = useBreakpoints();
  const [selectedBreakpoint, setSelectedBreakpoint] = useSelectedBreakpoint();
  useSubscribe<"loadBreakpoints", Array<Breakpoint>>(
    "loadBreakpoints",
    setBreakpoints
  );
  useEffect(() => {
    if (selectedBreakpoint === undefined && breakpoints.length !== 0) {
      setSelectedBreakpoint(sort(breakpoints)[breakpoints.length - 1]);
    }
  }, [breakpoints, selectedBreakpoint, setSelectedBreakpoint]);
};
