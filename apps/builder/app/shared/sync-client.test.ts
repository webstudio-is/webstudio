import { expect, test } from "vitest";
import { createNanoEvents } from "nanoevents";
import { atom } from "nanostores";
import { Store } from "immerhin";
import { enableMapSet } from "immer";
import { SyncClient } from "./sync-client";

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
    store: leaderStore,
    emitter,
  });
  const follower = new SyncClient({
    role: "follower",
    store: followerStore,
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
    store: leaderStore,
    emitter,
  });
  const follower = new SyncClient({
    role: "follower",
    store: followerStore,
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
    store: leaderStore,
    emitter,
  });
  const follower = new SyncClient({
    role: "follower",
    store: followerStore,
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
    store: leaderStore,
    emitter,
  });
  const follower = new SyncClient({
    role: "follower",
    store: followerStore,
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
    store: follower1Store,
    emitter,
  });
  const follower2 = new SyncClient({
    role: "follower",
    store: follower2Store,
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
