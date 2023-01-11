import store, { type Change } from "immerhin";
import { useEffect } from "react";
import { allUserPropsContainer } from "@webstudio-is/react-sdk";
import { type Publish, subscribe } from "~/shared/pubsub";
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

type SyncEventSource = "canvas" | "designer";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    sendStoreData: StoreData[];
    sendStoreChanges: {
      // distinct source to avoid infinite loop
      source: SyncEventSource;
      changes: Change[];
    };
  }
}

export const registerContainers = () => {
  store.register("breakpoints", breakpointsContainer);
  store.register("root", rootInstanceContainer);
  store.register("styles", stylesContainer);
  store.register("props", allUserPropsContainer);
  store.register("designTokens", designTokensContainer);
};

const syncChanges = (name: SyncEventSource, publish: Publish) => {
  const unsubscribeRemoteChanges = subscribe(
    "sendStoreChanges",
    ({ source, changes }) => {
      /// prevent reapplying own changes
      if (source === name) {
        return;
      }
      store.createTransactionFromChanges(changes, "remote");
    }
  );

  const unsubscribeStoreChanges = store.subscribe(
    (_transactionId, changes, source) => {
      // prevent sending remote patches back
      if (source === "remote") {
        return;
      }
      publish({
        type: "sendStoreChanges",
        payload: {
          source: name,
          changes,
        },
      });
    }
  );

  return () => {
    unsubscribeRemoteChanges();
    unsubscribeStoreChanges();
  };
};

export const useCanvasStore = (publish: Publish) => {
  useEffect(() => {
    // expect data to be populated by the time effect is called
    const data = [];
    for (const [namespace, container] of store.containers) {
      data.push({
        namespace,
        value: container.value,
      });
    }
    publish({
      type: "sendStoreData",
      payload: data,
    });

    const unsubscribeChanges = syncChanges("canvas", publish);

    return unsubscribeChanges;
  }, [publish]);
};

export const useDesignerStore = (publish: Publish) => {
  useEffect(() => {
    const unsubscribeSendStoreData = subscribe("sendStoreData", (data) => {
      for (const { namespace, value } of data) {
        const container = store.containers.get(namespace);
        if (container) {
          container.dispatch(value);
        }
      }
    });

    const unsubscribeChanges = syncChanges("designer", publish);

    return () => {
      unsubscribeSendStoreData();
      unsubscribeChanges();
    };
  }, [publish]);
};
