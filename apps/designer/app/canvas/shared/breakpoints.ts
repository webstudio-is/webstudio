import store from "immerhin";
import type { Breakpoint } from "@webstudio-is/css-data";
import { useSubscribe } from "~/shared/pubsub";
import { deleteCssRulesByBreakpoint } from "~/shared/css-utils";
import {
  breakpointsContainer,
  rootInstanceContainer,
  stylesContainer,
  useBreakpoints,
} from "~/shared/nano-states";
import { addMediaRules } from "./styles";
import { useSyncInitializeOnce } from "~/shared/hook-utils";
import { filterMutable } from "~/shared/array-utils";

export const useInitializeBreakpoints = (breakpoints: Array<Breakpoint>) => {
  const [, setCurrentBreakpoints] = useBreakpoints();
  useSyncInitializeOnce(() => {
    setCurrentBreakpoints(breakpoints);
    addMediaRules(breakpoints);
  });
};

const useBreakpointChange = () => {
  useSubscribe("breakpointChange", (breakpoint) => {
    store.createTransaction([breakpointsContainer], (breakpoints) => {
      const foundBreakpoint = breakpoints.find(
        ({ id }) => id === breakpoint.id
      );
      if (foundBreakpoint) {
        foundBreakpoint.label = breakpoint.label;
        foundBreakpoint.minWidth = breakpoint.minWidth;
      } else {
        // Its a new breakpoint
        breakpoints.push(breakpoint);
      }

      addMediaRules(breakpoints);
    });
  });
};

const useBreakpointDelete = () => {
  useSubscribe("breakpointDelete", (breakpoint) => {
    store.createTransaction(
      [breakpointsContainer, rootInstanceContainer, stylesContainer],
      (breakpoints, rootInstance, styles) => {
        if (rootInstance === undefined) {
          return;
        }

        const index = breakpoints.findIndex(({ id }) => id === breakpoint.id);
        if (index !== -1) {
          breakpoints.splice(index, 1);
        }

        deleteCssRulesByBreakpoint(rootInstance, breakpoint.id);

        // delete breakpoint styles
        filterMutable(styles, (style) => style.breakpointId !== breakpoint.id);
      }
    );
  });
};

export const useManageBreakpoints = () => {
  useBreakpointChange();
  useBreakpointDelete();
};
