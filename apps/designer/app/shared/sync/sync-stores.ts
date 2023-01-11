import { applyPatches } from "immer";
import store, { type Change } from "immerhin";
import type { ValueContainer } from "react-nano-state";
import { useEffect } from "react";
import { allUserPropsContainer } from "@webstudio-is/react-sdk";
import { publish, subscribe } from "~/shared/pubsub";
import {
  rootInstanceContainer,
  breakpointsContainer,
  designTokensContainer,
  stylesContainer,
} from "~/shared/nano-states";

type StoreData = {
  namespace: string;
  value: unknown;
};

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    sendStoreData: StoreData[];
    sendStoreChanges: {
      // distinct target to avoid infinite loop
      // @todo implement two-way patches
      target: "canvas" | "designer";
      changes: Change[];
    };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const containers = new Map<string, ValueContainer<any>>([
  ["breakpoints", breakpointsContainer],
  ["root", rootInstanceContainer],
  ["styles", stylesContainer],
  ["props", allUserPropsContainer],
  ["designTokens", designTokensContainer],
]);

export const registerContainers = () => {
  for (const [namespace, container] of containers) {
    store.register(namespace, container);
  }
};

export const useCanvasStore = () => {
  useEffect(() => {
    // expect data to be populated by the time effect is called
    const data = [];
    for (const [namespace, container] of containers) {
      data.push({
        namespace,
        value: container.value,
      });
    }
    publish({
      type: "sendStoreData",
      payload: data,
    });
    const unsubscribeStore = store.subscribe((_transactionId, changes) => {
      publish({
        type: "sendStoreChanges",
        payload: {
          target: "designer",
          changes,
        },
      });
    });
    return () => {
      unsubscribeStore();
    };
  }, []);
};

export const useDesignerStore = () => {
  useEffect(() => {
    const unsubscribeSendStoreData = subscribe("sendStoreData", (data) => {
      for (const { namespace, value } of data) {
        const container = containers.get(namespace);
        if (container) {
          container.dispatch(value);
        }
      }
    });
    const unsubscribeSendStoreChanges = subscribe(
      "sendStoreChanges",
      ({ target, changes }) => {
        if (target !== "designer") {
          return;
        }
        for (const { namespace, patches } of changes) {
          const container = containers.get(namespace);
          if (container) {
            container.dispatch(applyPatches(container.value, patches));
          }
        }
      }
    );
    return () => {
      unsubscribeSendStoreData();
      unsubscribeSendStoreChanges();
    };
  }, []);
};
