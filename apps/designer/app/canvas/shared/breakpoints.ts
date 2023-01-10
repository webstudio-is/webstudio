import { useEffect } from "react";
import store from "immerhin";
import type { Breakpoint } from "@webstudio-is/css-data";
import { useSubscribe } from "~/shared/pubsub";
import { deleteCssRulesByBreakpoint } from "~/shared/css-utils";
import {
  breakpointsContainer,
  rootInstanceContainer,
  useBreakpoints,
} from "~/shared/nano-states";
import { publish } from "~/shared/pubsub";
import { addMediaRules } from "./styles";
import { useSyncInitializeOnce } from "~/shared/hook-utils";
import { useStyles } from "~/shared/stores/styles";
import type { Update } from "~/shared/stores/updates";

export const useInitializeBreakpoints = (breakpoints: Array<Breakpoint>) => {
  const [, setCurrentBreakpoints] = useBreakpoints();
  useSyncInitializeOnce(() => {
    setCurrentBreakpoints(breakpoints);
    addMediaRules(breakpoints);
  });
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
  const [styles] = useStyles();

  useSubscribe("breakpointDelete", (breakpoint) => {
    store.createTransaction(
      [breakpointsContainer, rootInstanceContainer],
      (breakpoints, rootInstance) => {
        if (rootInstance === undefined) {
          return;
        }

        const index = breakpoints.findIndex(({ id }) => id === breakpoint.id);
        if (index !== -1) {
          breakpoints.splice(index, 1);
        }

        deleteCssRulesByBreakpoint(rootInstance, breakpoint.id);
      }
    );

    const updates: Update[] = [];
    // delete breakpoint styles
    for (const style of styles) {
      if (style.breakpointId === breakpoint.id) {
        updates.push({
          store: "styles",
          operation: "delete",
          breakpointId: style.breakpointId,
          instanceId: style.instanceId,
          property: style.property,
        });
      }
    }
    publish({
      type: "update",
      payload: updates,
    });
  });
};

export const useManageBreakpoints = () => {
  usePublishBreakpoints();
  useBreakpointChange();
  useBreakpointDelete();
};
