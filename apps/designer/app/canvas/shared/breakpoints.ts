import { useEffect } from "react";
import store from "immerhin";
import {
  type Breakpoint,
  useSubscribe,
  setBreakpoints,
  publish,
} from "@webstudio-is/sdk";
import { deleteCssRulesByBreakpoint } from "~/shared/css-utils";
import {
  breakpointsContainer,
  rootInstanceContainer,
  useBreakpoints,
} from "~/shared/nano-states";

export const useInitializeBreakpoints = (breakpoints: Array<Breakpoint>) => {
  const [, setCurrentBreakpoints] = useBreakpoints();
  useEffect(() => {
    setBreakpoints(breakpoints);
    setCurrentBreakpoints(breakpoints);
  }, [breakpoints, setCurrentBreakpoints]);
};

const usePublishBreakpoints = () => {
  const [breakpoints] = useBreakpoints();
  useEffect(() => {
    publish<"loadBreakpoints", Array<Breakpoint>>({
      type: "loadBreakpoints",
      payload: breakpoints,
    });
  }, [breakpoints]);
};

const useBreakpointChange = () => {
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
        } else {
          // Its a new breakpoint
          breakpoints.push(breakpoint);
        }

        setBreakpoints(breakpoints);
      });
    }
  );
};

const useBreakpointDelete = () => {
  useSubscribe<"breakpointDelete", Breakpoint>(
    "breakpointDelete",
    (breakpoint) => {
      store.createTransaction(
        [breakpointsContainer, rootInstanceContainer],
        (breakpoints, rootInstance) => {
          if (rootInstance === undefined) return;

          const index = breakpoints.findIndex(({ id }) => id == breakpoint.id);
          if (index !== -1) {
            breakpoints.splice(index, 1);
          }

          deleteCssRulesByBreakpoint(rootInstance, breakpoint.id);
        }
      );
    }
  );
};

export const useHandleBreakpoints = () => {
  usePublishBreakpoints();
  useBreakpointChange();
  useBreakpointDelete();
};
