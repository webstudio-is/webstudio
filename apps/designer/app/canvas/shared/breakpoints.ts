import { useEffect, useRef } from "react";
import store from "immerhin";
import { type Breakpoint, setBreakpoints } from "@webstudio-is/react-sdk";
import { useSubscribe } from "~/shared/pubsub";
import { deleteCssRulesByBreakpoint } from "~/shared/css-utils";
import {
  breakpointsContainer,
  rootInstanceContainer,
  useBreakpoints,
} from "~/shared/nano-states";
import { publish } from "~/shared/pubsub";
import { addMediaRules } from "@webstudio-is/css-engine";

export const useInitializeBreakpoints = (breakpoints: Array<Breakpoint>) => {
  const [, setCurrentBreakpoints] = useBreakpoints();
  // @todo ssr workaround for https://github.com/webstudio-is/webstudio-designer/issues/213
  const ref = useRef(false);
  if (ref.current === false) {
    ref.current = true;
    setBreakpoints(breakpoints);
    setCurrentBreakpoints(breakpoints);
    addMediaRules(breakpoints);
  }
};

const usePublishBreakpoints = () => {
  const [breakpoints] = useBreakpoints();
  useEffect(() => {
    publish({
      type: "loadBreakpoints",
      payload: breakpoints,
    });
  }, [breakpoints]);
};

const useBreakpointChange = () => {
  useSubscribe("breakpointChange", (breakpoint) => {
    store.createTransaction([breakpointsContainer], (breakpoints) => {
      const foundBreakpoint = breakpoints.find(({ id }) => id == breakpoint.id);
      if (foundBreakpoint) {
        foundBreakpoint.label = breakpoint.label;
        foundBreakpoint.minWidth = breakpoint.minWidth;
      } else {
        // Its a new breakpoint
        breakpoints.push(breakpoint);
      }

      setBreakpoints(breakpoints);
    });
  });
};

const useBreakpointDelete = () => {
  useSubscribe("breakpointDelete", (breakpoint) => {
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
  });
};

export const useManageBreakpoints = () => {
  usePublishBreakpoints();
  useBreakpointChange();
  useBreakpointDelete();
};
