import { useEffect } from "react";
import { Breakpoint } from "@webstudio-is/sdk";
import { useSubscribe } from "~/designer/shared/canvas-iframe";
import {
  useBreakpoints,
  useSelectedBreakpoint,
} from "~/designer/shared/nano-values";
import { sort } from "./sort";

export const useSubscribeBreakpoints = () => {
  const [breakpoints, setBreakpoints] = useBreakpoints();
  const [selectedBreakpoint, setSelectedBreakpoint] = useSelectedBreakpoint();
  useSubscribe<"loadBreakpoints", Array<Breakpoint>>(
    "loadBreakpoints",
    setBreakpoints
  );
  useEffect(() => {
    if (selectedBreakpoint === undefined && breakpoints.length !== 0) {
      setSelectedBreakpoint(sort(breakpoints)[0]);
    }
  }, [breakpoints, selectedBreakpoint, setSelectedBreakpoint]);
};
