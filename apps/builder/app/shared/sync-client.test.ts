import { describe, expect, test, vi } from "vitest";
import { createNanoEvents } from "nanoevents";
import { atom } from "nanostores";
import { Store } from "immerhin";
import { enableMapSet } from "immer";
import {
  ImmerhinSyncObject,
  NanostoresSyncObject,
  SyncClient,
  SyncObjectPool,
  type SyncStorage,
} from "./sync-client";

enableMapSet();

const createFollowerStore = () => {
  const followerStore = new Store();
  followerStore.register("users", atom(new Map()));
  return followerStore;
};

const createLeaderStore = () => {
  const leaderStore = new Store();
  leaderStore.register(
    "users",
    atom(
      new Map([
        ["john", "John Johnson"],
        ["frank", "Frank Frankson"],
      ])
    )
  );
  return leaderStore;
};

test("synchronize initial state when follower is connected", () => {
  const emitter = createNanoEvents();
  const leaderStore = createLeaderStore();
  const followerStore = createFollowerStore();
  const leader = new SyncClient({
    role: "leader",
    object: new ImmerhinSyncObject("my-data", leaderStore),
    emitter,
  });
  const follower = new SyncClient({
    role: "follower",
    object: new ImmerhinSyncObject("my-data", followerStore),
    emitter,
  });
  expect(leaderStore.containers.get("users")?.get().size).toEqual(2);
  expect(followerStore.containers.get("users")?.get().size).toEqual(0);
  expect(leaderStore.containers.get("users")?.get()).not.toEqual(
    followerStore.containers.get("users")?.get()
  );
  // first leader and follow is connected later
  leader.connect({ signal: new AbortController().signal });
  follower.connect({ signal: new AbortController().signal });
  expect(leaderStore.containers.get("users")?.get().size).toEqual(2);
  expect(followerStore.containers.get("users")?.get().size).toEqual(2);
  expect(leaderStore.containers.get("users")?.get()).toEqual(
    followerStore.containers.get("users")?.get()
  );
});

test("synchronize initial state when leader is connected", () => {
  const emitter = createNanoEvents();
  const leaderStore = createLeaderStore();
  const followerStore = createFollowerStore();
  const leader = new SyncClient({
    role: "leader",
    object: new ImmerhinSyncObject("my-data", leaderStore),
    emitter,
  });
  const follower = new SyncClient({
    role: "follower",
    object: new ImmerhinSyncObject("my-data", followerStore),
    emitter,
  });
  expect(leaderStore.containers.get("users")?.get().size).toEqual(2);
  expect(followerStore.containers.get("users")?.get().size).toEqual(0);
  expect(leaderStore.containers.get("users")?.get()).not.toEqual(
    followerStore.containers.get("users")?.get()
  );
  // first follower and leader is connected later
  follower.connect({ signal: new AbortController().signal });
  leader.connect({ signal: new AbortController().signal });
  expect(leaderStore.containers.get("users")?.get().size).toEqual(2);
  expect(followerStore.containers.get("users")?.get().size).toEqual(2);
  expect(leaderStore.containers.get("users")?.get()).toEqual(
    followerStore.containers.get("users")?.get()
  );
});

test("synchronize initial state when one of followers become leader", () => {
  const emitter = createNanoEvents();
  const leaderStore = createLeaderStore();
  const followerStore = createFollowerStore();
  const leader = new SyncClient({
    role: "follower",
    object: new ImmerhinSyncObject("my-data", leaderStore),
    emitter,
  });
  const follower = new SyncClient({
    role: "follower",
    object: new ImmerhinSyncObject("my-data", followerStore),
    emitter,
  });
  leader.connect({ signal: new AbortController().signal });
  follower.connect({ signal: new AbortController().signal });
  expect(leader.role).toEqual("follower");
  expect(leaderStore.containers.get("users")?.get().size).toEqual(2);
  expect(followerStore.containers.get("users")?.get().size).toEqual(0);
  leader.lead();
  expect(leader.role).toEqual("leader");
  expect(leaderStore.containers.get("users")?.get().size).toEqual(2);
  expect(followerStore.containers.get("users")?.get().size).toEqual(2);
  expect(leaderStore.containers.get("users")?.get()).toEqual(
    followerStore.containers.get("users")?.get()
  );
});

test("exchange transactions between leader and follower", async () => {
  const emitter = createNanoEvents();
  const leaderStore = createLeaderStore();
  const followerStore = createFollowerStore();
  const leader = new SyncClient({
    role: "leader",
    object: new ImmerhinSyncObject("my-data", leaderStore),
    emitter,
  });
  const follower = new SyncClient({
    role: "follower",
    object: new ImmerhinSyncObject("my-data", followerStore),
    emitter,
  });
  leader.connect({ signal: new AbortController().signal });
  follower.connect({ signal: new AbortController().signal });
  leaderStore.createTransaction(
    [leaderStore.containers.get("users")!],
    (users) => {
      users.set("james", "James Jameson");
    }
  );
  expect(leaderStore.containers.get("users")?.get().size).toEqual(3);
  expect(followerStore.containers.get("users")?.get().size).toEqual(3);
  followerStore.createTransaction(
    [followerStore.containers.get("users")!],
    (users) => {
      users.set("mark", "Mark Grayson");
    }
  );
  expect(leaderStore.containers.get("users")?.get().size).toEqual(4);
  expect(followerStore.containers.get("users")?.get().size).toEqual(4);
  expect(leaderStore.containers.get("users")?.get()).toEqual(
    followerStore.containers.get("users")?.get()
  );
});

test("exchange transactions between followers", async () => {
  const emitter = createNanoEvents();
  const follower1Store = createFollowerStore();
  const follower2Store = createFollowerStore();
  const follower1 = new SyncClient({
    role: "follower",
    object: new ImmerhinSyncObject("my-data", follower1Store),
    emitter,
  });
  const follower2 = new SyncClient({
    role: "follower",
    object: new ImmerhinSyncObject("my-data", follower2Store),
    emitter,
  });
  follower1.connect({ signal: new AbortController().signal });
  follower2.connect({ signal: new AbortController().signal });
  follower1Store.createTransaction(
    [follower1Store.containers.get("users")!],
    (users) => {
      users.set("james", "James Jameson");
    }
  );
  expect(follower1Store.containers.get("users")?.get().size).toEqual(1);
  expect(follower2Store.containers.get("users")?.get().size).toEqual(1);
  follower2Store.createTransaction(
    [follower2Store.containers.get("users")!],
    (users) => {
      users.set("mark", "Mark Grayson");
    }
  );
  expect(follower1Store.containers.get("users")?.get().size).toEqual(2);
  expect(follower2Store.containers.get("users")?.get().size).toEqual(2);
  expect(follower1Store.containers.get("users")?.get()).toEqual(
    follower2Store.containers.get("users")?.get()
  );
});

test("support pool of objects", () => {
  const store1 = createFollowerStore();
  const store2 = createFollowerStore();
  const leader = new SyncClient({
    role: "leader",
    object: new SyncObjectPool([
      new ImmerhinSyncObject("store1", store1),
      new ImmerhinSyncObject("store2", store2),
    ]),
  });
  leader.connect({ signal: new AbortController().signal });
  store1.createTransaction([store1.containers.get("users")!], (users) => {
    users.set("james", "James Jameson");
  });
  store2.createTransaction([store2.containers.get("users")!], (users) => {
    users.set("mark", "Mark Grayson");
  });
  expect(store1.containers.get("users")?.get()).toEqual(
    new Map([["james", "James Jameson"]])
  );
  expect(store2.containers.get("users")?.get()).toEqual(
    new Map([["mark", "Mark Grayson"]])
  );
});

test("merge state in pool object to partially restore from storage", () => {
  const store1 = atom(0);
  const store2 = atom(1);
  const objectPool = new SyncObjectPool([
    new NanostoresSyncObject("store1", store1),
    new NanostoresSyncObject("store2", store2),
  ]);
  objectPool.setState(new Map([["store1", 2]]));
  expect(store1.get()).toEqual(2);
  expect(store2.get()).toEqual(1);
});

describe("nanostores sync object", () => {
  test("sync initial state and exchange transactions", () => {
    const emitter = createNanoEvents();
    const $leader = atom(1);
    const $follower = atom(2);
    new SyncClient({
      role: "leader",
      object: new NanostoresSyncObject("my-data", $leader),
      emitter,
    }).connect({ signal: new AbortController().signal });
    new SyncClient({
      role: "follower",
      object: new NanostoresSyncObject("my-data", $follower),
      emitter,
    }).connect({ signal: new AbortController().signal });
    expect($leader.get()).toEqual(1);
    expect($follower.get()).toEqual(1);
    $leader.set(3);
    expect($leader.get()).toEqual(3);
    expect($follower.get()).toEqual(3);
    $follower.set(5);
    expect($leader.get()).toEqual(5);
    expect($follower.get()).toEqual(5);
  });

  test("set received state and access it", () => {
    const $store = atom(1);
    const object = new NanostoresSyncObject("nanostores", $store);
    expect($store.get()).toEqual(1);
    expect(object.getState()).toEqual(1);
    object.setState(2);
    expect($store.get()).toEqual(2);
    expect(object.getState()).toEqual(2);
  });

  test("send new store value as transaction", () => {
    const $store = atom(1);
    const object = new NanostoresSyncObject("nanostores", $store);
    const sendTransaction = vi.fn();
    object.subscribe(sendTransaction, new AbortController().signal);
    $store.set(2);
    expect(sendTransaction).toBeCalledTimes(1);
    expect(sendTransaction).toBeCalledWith({
      id: expect.any(String),
      object: "nanostores",
      payload: 2,
    });
  });

  test("prevent sending back received state", () => {
    const $store = atom(1);
    const object = new NanostoresSyncObject("nanostores", $store);
    const sendTransaction = vi.fn();
    object.subscribe(sendTransaction, new AbortController().signal);
    expect(sendTransaction).toBeCalledTimes(0);
    object.setState(2);
    expect(sendTransaction).toBeCalledTimes(0);
  });

  test("prevent sending back applied transactions", () => {
    const $store = atom(1);
    const object = new NanostoresSyncObject("nanostores", $store);
    const sendTransaction = vi.fn();
    object.subscribe(sendTransaction, new AbortController().signal);
    expect(sendTransaction).toBeCalledTimes(0);
    object.applyTransaction({
      id: "my-transaction",
      object: "nanostores",
      payload: 2,
    });
    expect(sendTransaction).toBeCalledTimes(0);
  });
});

describe("storages", () => {
  class TestStorage implements SyncStorage {
    name = "TestStorage";
    value: undefined | number;
    constructor(value: undefined | number) {
      this.value = value;
    }
    sendTransaction = vi.fn();
    subscribe(setState: (state: unknown) => void) {
      setState(this.value);
    }
  }

  test("get initial state from storage", () => {
    const $store = atom(0);
    const client = new SyncClient({
      role: "leader",
      object: new NanostoresSyncObject("nanostores", $store),
      storages: [new TestStorage(1)],
    });
    client.connect({ signal: new AbortController().signal });
    expect($store.get()).toEqual(1);
  });

  test("fallback to current state when storage is empty", () => {
    const $store = atom(0);
    const client = new SyncClient({
      role: "leader",
      object: new NanostoresSyncObject("nanostores", $store),
      storages: [new TestStorage(undefined)],
    });
    client.connect({ signal: new AbortController().signal });
    expect($store.get()).toEqual(0);
  });

  test("get state from the first non-empty storage", () => {
    const $store = atom(0);
    const client = new SyncClient({
      role: "leader",
      object: new NanostoresSyncObject("nanostores", $store),
      storages: [
        new TestStorage(undefined),
        new TestStorage(1),
        new TestStorage(2),
      ],
    });
    client.connect({ signal: new AbortController().signal });
    expect($store.get()).toEqual(1);
  });

  test("send transactions to all provided storages", () => {
    const $store = atom(0);
    const storage1 = new TestStorage(undefined);
    const storage2 = new TestStorage(undefined);
    const client = new SyncClient({
      role: "leader",
      object: new NanostoresSyncObject("nanostores", $store),
      storages: [storage1, storage2],
    });
    client.connect({ signal: new AbortController().signal });
    $store.set(1);
    expect(storage1.sendTransaction).toBeCalledTimes(1);
    expect(storage1.sendTransaction).toHaveBeenCalledWith({
      id: expect.any(String),
      object: "nanostores",
      payload: 1,
    });
    expect(storage2.sendTransaction).toBeCalledTimes(1);
    expect(storage2.sendTransaction).toHaveBeenCalledWith({
      id: expect.any(String),
      object: "nanostores",
      payload: 1,
    });
  });
});
