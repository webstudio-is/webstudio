import PartySocket from "partysocket";
import store, { type Change } from "immerhin";
import { enableMapSet } from "immer";
import type { WritableAtom } from "nanostores";
import { useEffect, useRef } from "react";
import { type Publish, subscribe } from "~/shared/pubsub";
import {
  instancesStore,
  propsStore,
  breakpointsContainer,
  stylesStore,
  styleSourcesStore,
  styleSourceSelectionsStore,
  assetContainersStore,
  selectedInstanceIdStore,
  selectedInstanceBrowserStyleStore,
  hoveredInstanceIdStore,
  hoveredInstanceOutlineStore,
  isPreviewModeStore,
} from "~/shared/nano-states";
import { synchronizedBreakpointsStores } from "~/shared/nano-states/breakpoints";

enableMapSet();

type StoreData = {
  namespace: string;
  value: unknown;
};

type SyncEventSource = "canvas" | "builder";

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
  store.register("instances", instancesStore);
  store.register("styles", stylesStore);
  store.register("styleSources", styleSourcesStore);
  store.register("styleSourceSelections", styleSourceSelectionsStore);
  store.register("props", propsStore);
  // synchronize whole states
  clientStores.set("assetContainers", assetContainersStore);
  clientStores.set("selectedInstanceId", selectedInstanceIdStore);
  clientStores.set(
    "selectedInstanceBrowserStyle",
    selectedInstanceBrowserStyleStore
  );
  clientStores.set("hoveredInstanceIdStore", hoveredInstanceIdStore);
  clientStores.set("hoveredInstanceOutlineStore", hoveredInstanceOutlineStore);
  clientStores.set("isPreviewModeStore", isPreviewModeStore);
  for (const [name, store] of synchronizedBreakpointsStores) {
    clientStores.set(name, store);
  }
};

const syncStoresChanges = (
  name: SyncEventSource,
  publish: Publish,
  socket?: PartySocket
) => {
  const unsubscribeRemoteChanges = subscribe(
    "sendStoreChanges",
    ({ source, changes }) => {
      /// prevent reapplying own changes
      if (source === name) {
        return;
      }
      store.createTransactionFromChanges(changes, name);
    }
  );

  const unsubscribeStoreChanges = store.subscribe(
    (_transactionId, changes, source) => {
      // prevent sending remote patches back
      if (source !== name) {
        publish({
          type: "sendStoreChanges",
          payload: {
            source: name,
            changes,
          },
        });
      }
      if (source !== "remote") {
        socket?.send(JSON.stringify(changes));
      }
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

export const useBuilderStore = (publish: Publish) => {
  const socketRef = useRef<PartySocket>(
    new PartySocket({
      host: "localhost:1999",
      room: "my-room",
      startClosed: true,
    })
  );

  useEffect(() => {
    const socket = socketRef.current;
    socket.reconnect();
    socket.addEventListener("message", (message) => {
      console.log("message");
      const changes: Change[] = JSON.parse(message.data);
      store.createTransactionFromChanges(changes, "remote");
      publish({
        type: "sendStoreChanges",
        payload: {
          source: "builder",
          changes,
        },
      });
    });
    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    const unsubscribeStoresState = syncStoresState("builder", publish);
    const unsubscribeStoresChanges = syncStoresChanges(
      "builder",
      publish,
      socketRef.current
    );

    return () => {
      unsubscribeStoresState();
      unsubscribeStoresChanges();
    };
  }, [publish]);
};
