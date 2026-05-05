/**
 * Unit tests for the single-player and multi-client sync cycle using
 * InProcessEmitter + in-process fake storage.
 */
import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { atom } from "nanostores";
import { Store } from "immerhin";
import { enableMapSet } from "immer";
import {
  ImmerhinSyncObject,
  NanostoresSyncObject,
  SyncClient,
  SyncObjectPool,
} from "~/shared/sync-client";
import type { Change } from "immerhin";
import type { SyncStorage } from "~/shared/sync-client";
import type {
  SyncEmitter,
  SyncMessage,
  Transaction,
} from "@webstudio-is/sync-client";

enableMapSet();

//  helpers

const inProcessRooms = new Map<
  string,
  Map<symbol, (message: SyncMessage) => void>
>();

const createInProcessRoom = (buildId: string) => {
  const handlers =
    inProcessRooms.get(buildId) ??
    new Map<symbol, (message: SyncMessage) => void>();
  inProcessRooms.set(buildId, handlers);

  return {
    createEmitter(): SyncEmitter {
      const ownKeys = new Set<symbol>();
      return {
        emit(message) {
          for (const [key, handler] of handlers) {
            if (ownKeys.has(key)) {
              continue;
            }
            handler(message);
          }
        },
        on(handler) {
          const key = Symbol();
          ownKeys.add(key);
          handlers.set(key, handler);
          return () => {
            handlers.delete(key);
            ownKeys.delete(key);
          };
        },
      };
    },
    cleanup() {
      inProcessRooms.delete(buildId);
    },
  };
};

const createFakeServer = () => {
  const server: SyncStorage & {
    version: number;
    savedTransactions: Transaction<Change[]>[];
  } = {
    name: "fake-server",
    version: 0,
    savedTransactions: [],
    sendTransaction(transaction: Transaction<Change[]>): void {
      if (transaction.object !== "server") {
        return;
      }
      this.savedTransactions.push(transaction);
      this.version += 1;
    },
    subscribe(setState: (state: unknown) => void, _signal: AbortSignal): void {
      setState(undefined);
    },
  };
  return server;
};

const makeStore = (initial: Record<string, unknown> = {}) => {
  const store = new Store();
  const $data = atom<Record<string, unknown>>(initial);
  store.register("data", $data);
  return { store, $data };
};

const makeClient = ({
  role,
  emitter,
  storages = [],
}: {
  role: "leader" | "follower";
  emitter: ReturnType<ReturnType<typeof createInProcessRoom>["createEmitter"]>;
  storages?: ConstructorParameters<typeof SyncClient>[0]["storages"];
}) => {
  const { store, $data } = makeStore();
  const object = new SyncObjectPool([new ImmerhinSyncObject("server", store)]);
  const client = new SyncClient({ role, object, emitter, storages });
  return { client, store, $data };
};

//  Single-player

describe("single-player sync cycle", () => {
  test("leader saves transaction to server on local edit", () => {
    const room = createInProcessRoom("build-1");
    const fakeServer = createFakeServer();
    const { client, store, $data } = makeClient({
      role: "leader",
      emitter: room.createEmitter(),
      storages: [fakeServer],
    });

    client.connect({ signal: new AbortController().signal });

    store.createTransaction([store.containers.get("data")!], (data) => {
      data["key"] = "value";
    });

    expect($data.get()).toEqual({ key: "value" });
    expect(fakeServer.savedTransactions).toHaveLength(1);
    expect(fakeServer.savedTransactions[0].object).toBe("server");
    expect(fakeServer.version).toBe(1);

    room.cleanup();
  });

  test("follower does not save to server on local edit", () => {
    const room = createInProcessRoom("build-2");
    const fakeServer = createFakeServer();
    const { client, store, $data } = makeClient({
      role: "follower",
      emitter: room.createEmitter(),
      storages: [fakeServer],
    });

    client.connect({ signal: new AbortController().signal });

    store.createTransaction([store.containers.get("data")!], (data) => {
      data["key"] = "value";
    });

    expect($data.get()).toEqual({ key: "value" });
    expect(fakeServer.savedTransactions).toHaveLength(0);

    room.cleanup();
  });
});

//  Multi-client

describe("multi-client sync cycle", () => {
  let room: ReturnType<typeof createInProcessRoom>;
  let fakeServer: ReturnType<typeof createFakeServer>;

  beforeEach(() => {
    room = createInProcessRoom("build-multi");
    fakeServer = createFakeServer();
  });

  afterEach(() => {
    room.cleanup();
  });

  test("leader applies transaction and follower receives it", () => {
    const leaderClient = makeClient({
      role: "leader",
      emitter: room.createEmitter(),
      storages: [fakeServer],
    });
    const followerClient = makeClient({
      role: "follower",
      emitter: room.createEmitter(),
    });

    const signal = new AbortController().signal;
    leaderClient.client.connect({ signal });
    followerClient.client.connect({ signal });

    leaderClient.store.createTransaction(
      [leaderClient.store.containers.get("data")!],
      (data) => {
        data["msg"] = "hello";
      }
    );

    expect(leaderClient.$data.get()).toEqual({ msg: "hello" });
    expect(followerClient.$data.get()).toEqual({ msg: "hello" });
    expect(fakeServer.savedTransactions).toHaveLength(1);
  });

  test("follower applies transaction and leader receives it, leader saves to server", () => {
    const leaderClient = makeClient({
      role: "leader",
      emitter: room.createEmitter(),
      storages: [fakeServer],
    });
    const followerClient = makeClient({
      role: "follower",
      emitter: room.createEmitter(),
    });

    const signal = new AbortController().signal;
    leaderClient.client.connect({ signal });
    followerClient.client.connect({ signal });

    followerClient.store.createTransaction(
      [followerClient.store.containers.get("data")!],
      (data) => {
        data["from"] = "follower";
      }
    );

    expect(leaderClient.$data.get()).toEqual({ from: "follower" });
    expect(followerClient.$data.get()).toEqual({ from: "follower" });
    // Leader receives the follower's transaction and saves it to server
    expect(fakeServer.savedTransactions).toHaveLength(1);
  });

  test("concurrent edits to different keys both converge", () => {
    const c1 = makeClient({
      role: "leader",
      emitter: room.createEmitter(),
      storages: [fakeServer],
    });
    const c2 = makeClient({
      role: "follower",
      emitter: room.createEmitter(),
    });

    const signal = new AbortController().signal;
    c1.client.connect({ signal });
    c2.client.connect({ signal });

    c1.store.createTransaction([c1.store.containers.get("data")!], (data) => {
      data["a"] = 1;
    });
    c2.store.createTransaction([c2.store.containers.get("data")!], (data) => {
      data["b"] = 2;
    });

    expect(c1.$data.get()).toEqual({ a: 1, b: 2 });
    expect(c2.$data.get()).toEqual({ a: 1, b: 2 });
  });

  test("concurrent edits to same key - last-applied wins", () => {
    const c1 = makeClient({
      role: "leader",
      emitter: room.createEmitter(),
      storages: [fakeServer],
    });
    const c2 = makeClient({
      role: "follower",
      emitter: room.createEmitter(),
    });

    const signal = new AbortController().signal;
    c1.client.connect({ signal });
    c2.client.connect({ signal });

    c1.store.createTransaction([c1.store.containers.get("data")!], (data) => {
      data["x"] = "from-leader";
    });
    c2.store.createTransaction([c2.store.containers.get("data")!], (data) => {
      data["x"] = "from-follower";
    });

    // Both clients should have the same final value (last-applied wins)
    expect(c1.$data.get()["x"]).toEqual(c2.$data.get()["x"]);
  });

  test("second follower receives initial state from leader on connect", () => {
    const c1 = makeClient({
      role: "leader",
      emitter: room.createEmitter(),
      storages: [fakeServer],
    });

    const signal = new AbortController().signal;
    c1.client.connect({ signal });

    c1.store.createTransaction([c1.store.containers.get("data")!], (data) => {
      data["existing"] = true;
    });

    // Second client joins after data already exists
    const c2 = makeClient({
      role: "follower",
      emitter: room.createEmitter(),
    });
    c2.client.connect({ signal });

    expect(c2.$data.get()).toEqual({ existing: true });
  });

  test("follower promoted to leader after calling lead()", () => {
    const c1 = makeClient({
      role: "follower",
      emitter: room.createEmitter(),
      storages: [fakeServer],
    });
    const c2 = makeClient({
      role: "follower",
      emitter: room.createEmitter(),
    });

    const signal = new AbortController().signal;
    c1.client.connect({ signal });
    c2.client.connect({ signal });

    c1.store.createTransaction([c1.store.containers.get("data")!], (data) => {
      data["draft"] = true;
    });
    // Nothing saved yet - both are followers
    expect(fakeServer.savedTransactions).toHaveLength(0);

    // Promote c1 to leader
    c1.client.lead();
    expect(c1.client.role).toBe("leader");

    // Now c2 should have received the state broadcast from c1 and c1 receives
    // from the state message
    expect(c2.$data.get()).toEqual({ draft: true });
  });
});

//  NanostoresSyncObject

describe("nanostores multi-client sync", () => {
  test("nanostores value propagates to remote clients", () => {
    const room = createInProcessRoom("build-nano");
    const $leaderColor = atom("blue");
    const $followerColor = atom("red");

    const leaderEmitter = room.createEmitter();
    const followerEmitter = room.createEmitter();

    const leader = new SyncClient({
      role: "leader",
      object: new NanostoresSyncObject("color", $leaderColor),
      emitter: leaderEmitter,
    });
    const follower = new SyncClient({
      role: "follower",
      object: new NanostoresSyncObject("color", $followerColor),
      emitter: followerEmitter,
    });

    const signal = new AbortController().signal;
    leader.connect({ signal });
    follower.connect({ signal });

    // follower receives leader's initial state
    expect($followerColor.get()).toBe("blue");

    $leaderColor.set("green");
    expect($followerColor.get()).toBe("green");

    $followerColor.set("purple");
    expect($leaderColor.get()).toBe("purple");

    room.cleanup();
  });
});
