import store, { type Change } from "immerhin";
import type { WritableAtom } from "nanostores";
import { useEffect } from "react";
import { allUserPropsContainer } from "@webstudio-is/react-sdk";
import { type Publish, subscribe } from "~/shared/pubsub";
import {
  rootInstanceContainer,
  breakpointsContainer,
  designTokensContainer,
  stylesContainer,
  selectedInstanceIdStore,
  selectedInstanceBrowserStyleStore,
} from "~/shared/nano-states";

type StoreData = {
  namespace: string;
  value: unknown;
};

type SyncEventSource = "canvas" | "designer";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    sendStoreData: {
      // distinct source to avoid infinite loop
      source: SyncEventSource;
      data: StoreData[];
    };
    sendStoreChanges: {
      // distinct source to avoid infinite loop
      source: SyncEventSource;
      changes: Change[];
    };
  }
}

const clientStores = new Map<string, WritableAtom<unknown>>();

export const registerContainers = () => {
  // synchronize patches
  store.register("breakpoints", breakpointsContainer);
  store.register("root", rootInstanceContainer);
  store.register("styles", stylesContainer);
  store.register("props", allUserPropsContainer);
  store.register("designTokens", designTokensContainer);
  // synchronize whole states
  clientStores.set("selectedInstanceId", selectedInstanceIdStore);
  clientStores.set(
    "selectedInstanceBrowserStyle",
    selectedInstanceBrowserStyleStore
  );
};

const syncStoresChanges = (name: SyncEventSource, publish: Publish) => {
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

const syncStoresState = (name: SyncEventSource, publish: Publish) => {
  const latestData = new Map<string, unknown>();

  const unsubscribeRemoteChanges = subscribe(
    "sendStoreData",
    ({ source, data }) => {
      /// prevent reapplying own changes
      if (source === name) {
        return;
      }
      for (const { namespace, value } of data) {
        // apply immerhin stores data
        const container = store.containers.get(namespace);
        if (container) {
          container.set(value);
        }
        // apply state stores data
        const stateStore = clientStores.get(namespace);
        if (stateStore) {
          // should be called before store set
          // to be accessible in listen callback
          latestData.set(namespace, value);
          stateStore.set(value);
        }
      }
    }
  );

  const unsubscribes: Array<() => void> = [];
  for (const [namespace, store] of clientStores) {
    unsubscribes.push(
      // use listen to not invoke initially
      store.listen((value) => {
        // nanostores cannot identify the source of change
        // so we check the latest value applied to the store
        // and do nothing if was set by synchronization logic
        if (latestData.has(namespace) && latestData.get(namespace) === value) {
          return;
        }
        latestData.set(namespace, value);
        publish({
          type: "sendStoreData",
          payload: {
            source: name,
            data: [
              {
                namespace,
                value,
              },
            ],
          },
        });
        //
      })
    );
  }

  return () => {
    unsubscribeRemoteChanges();
    for (const unsubscribe of unsubscribes) {
      unsubscribe();
    }
  };
};

export const useCanvasStore = (publish: Publish) => {
  useEffect(() => {
    // immerhin data is sent only initially so not part of syncStoresState
    // expect data to be populated by the time effect is called
    const data = [];
    for (const [namespace, container] of store.containers) {
      data.push({
        namespace,
        value: container.get(),
      });
    }
    publish({
      type: "sendStoreData",
      payload: {
        source: "canvas",
        data,
      },
    });

    const unsubscribeStoresState = syncStoresState("canvas", publish);
    const unsubscribeStoresChanges = syncStoresChanges("canvas", publish);

    return () => {
      unsubscribeStoresState();
      unsubscribeStoresChanges();
    };
  }, [publish]);
};

export const useDesignerStore = (publish: Publish) => {
  useEffect(() => {
    const unsubscribeStoresState = syncStoresState("designer", publish);
    const unsubscribeStoresChanges = syncStoresChanges("designer", publish);

    return () => {
      unsubscribeStoresState();
      unsubscribeStoresChanges();
    };
  }, [publish]);
};
