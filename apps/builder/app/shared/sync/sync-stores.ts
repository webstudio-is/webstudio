import store, { type Change } from "immerhin";
import { enableMapSet } from "immer";
import type { WritableAtom } from "nanostores";
import { useEffect } from "react";
import { type Publish, subscribe } from "~/shared/pubsub";
import {
  pagesStore,
  instancesStore,
  propsStore,
  breakpointsContainer,
  stylesStore,
  styleSourcesStore,
  styleSourceSelectionsStore,
  selectedPageIdStore,
  assetContainersStore,
  selectedInstanceSelectorStore,
  selectedInstanceBrowserStyleStore,
  hoveredInstanceSelectorStore,
  isPreviewModeStore,
} from "~/shared/nano-states";
import { synchronizedBreakpointsStores } from "~/shared/nano-states/breakpoints";
import { synchronizedInstancesStores } from "~/shared/nano-states/instances";
import { synchronizedCanvasStores } from "~/shared/nano-states/canvas";

enableMapSet();

type StoreData = {
  namespace: string;
  value: unknown;
};

type SyncEventSource = "canvas" | "builder";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    canvasStoreReady: void;
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
  store.register("pages", pagesStore);
  store.register("breakpoints", breakpointsContainer);
  store.register("instances", instancesStore);
  store.register("styles", stylesStore);
  store.register("styleSources", styleSourcesStore);
  store.register("styleSourceSelections", styleSourceSelectionsStore);
  store.register("props", propsStore);
  // synchronize whole states
  clientStores.set("selectedPageId", selectedPageIdStore);
  clientStores.set("assetContainers", assetContainersStore);
  clientStores.set("selectedInstanceSelector", selectedInstanceSelectorStore);
  clientStores.set(
    "selectedInstanceBrowserStyle",
    selectedInstanceBrowserStyleStore
  );
  clientStores.set("hoveredInstanceSelector", hoveredInstanceSelectorStore);
  clientStores.set("isPreviewMode", isPreviewModeStore);
  for (const [name, store] of synchronizedBreakpointsStores) {
    clientStores.set(name, store);
  }
  for (const [name, store] of synchronizedInstancesStores) {
    clientStores.set(name, store);
  }
  for (const [name, store] of synchronizedCanvasStores) {
    clientStores.set(name, store);
  }
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
    const unsubscribeStoresState = syncStoresState("canvas", publish);
    const unsubscribeStoresChanges = syncStoresChanges("canvas", publish);

    publish({
      type: "canvasStoreReady",
    });

    return () => {
      unsubscribeStoresState();
      unsubscribeStoresChanges();
    };
  }, [publish]);
};

export const useBuilderStore = (publish: Publish) => {
  useEffect(() => {
    const unsubscribeCanvasStoreReady = subscribe("canvasStoreReady", () => {
      // immerhin data is sent only initially so not part of syncStoresState
      // expect data to be populated by the time effect is called
      const data = [];
      for (const [namespace, container] of store.containers) {
        data.push({
          namespace,
          value: container.get(),
        });
      }
      for (const [namespace, store] of clientStores) {
        data.push({
          namespace,
          value: store.get(),
        });
      }
      publish({
        type: "sendStoreData",
        payload: {
          source: "builder",
          data,
        },
      });
    });

    const unsubscribeStoresState = syncStoresState("builder", publish);
    const unsubscribeStoresChanges = syncStoresChanges("builder", publish);

    return () => {
      unsubscribeCanvasStoreReady();
      unsubscribeStoresState();
      unsubscribeStoresChanges();
    };
  }, [publish]);
};
