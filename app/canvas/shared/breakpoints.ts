import { useEffect } from "react";
import store from "immerhin";
import { type Breakpoint, useSubscribe } from "@webstudio-is/sdk";
import { useBreakpoints, breakpointsContainer } from "./nano-values";
import { publish } from "./pubsub";

store.register("breakpoints", breakpointsContainer);

export const usePublishBreakpoints = () => {
  const [breakpoints] = useBreakpoints();
  useEffect(() => {
    publish<"loadBreakpoints", Array<Breakpoint>>({
      type: "loadBreakpoints",
      payload: breakpoints,
    });
  }, [breakpoints]);
};

export const useBreakpointChange = () => {
  useSubscribe<"breakpointChange", Breakpoint>(
    "breakpointChange",
    (breakpoint) => {
      store.createTransaction([breakpointsContainer], (breakpoints) => {
        const foundBreakpoint = breakpoints.find(
          ({ id }) => id == breakpoint.id
        );
        if (foundBreakpoint) {
          foundBreakpoint.label = breakpoint.label;
          foundBreakpoint.minWidth = breakpoint.minWidth;
        }
      });
    }
  );
};
