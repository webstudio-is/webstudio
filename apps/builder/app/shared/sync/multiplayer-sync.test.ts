import { draftPersistence } from "./draft-persistence";
import type { Asset } from "@webstudio-is/sdk";
import { $assets, $assetFolders } from "./data-stores";
import { refreshPageCopyCatalog } from "./page-copy-catalog.client";
import { registerContainers } from "./sync-stores";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { WebSocketEmitterOptions } from "@webstudio-is/sync-client/websocket";
import {
  $collaborators,
  $syncStatus,
  type SyncMessage,
} from "@webstudio-is/sync-client";
import { __testing__ } from "~/shared/awareness";
import {
  createMultiplayerSyncEmitter,
  startMultiplayerPresenceSync,
} from "./multiplayer-sync";

const { $pointerPosition } = __testing__;

const createTransportFactory = () => {
  let callbacks: WebSocketEmitterOptions | undefined;
  const handlers = new Set<(message: SyncMessage) => void>();
  const sendToRelay = vi.fn();
  const close = vi.fn();
  return {
    close,
    emitSyncMessage(message: SyncMessage) {
      for (const handler of handlers) {
        handler(message);
      }
    },
    get callbacks() {
      if (callbacks === undefined) {
        throw new Error("Transport was not created");
      }
      return callbacks;
    },
    createTransport(options: WebSocketEmitterOptions) {
      callbacks = options;
      return {
        close,
        emit: vi.fn(),
        on(handler: (message: SyncMessage) => void) {
          handlers.add(handler);
          return () => handlers.delete(handler);
        },
        sendToRelay,
      };
    },
    sendToRelay,
  };
};

describe("createMultiplayerSyncEmitter", () => {
  test("Preview waits for a visible collaborator edit to become durable", async () => {
    draftPersistence.reset("project");
    const transport = createTransportFactory();
    const emitter = createMultiplayerSyncEmitter({
      projectId: "project",
      clientId: "local",
      createTransport: transport.createTransport,
      url: "localhost:1999",
    });
    emitter.connect("build");
    transport.callbacks.onBroadcast({
      type: "broadcast",
      actorId: "remote",
      originClientId: "remote",
      clientSeq: 1,
      relayTs: 10,
      seq: 4,
      transaction: { id: "remote-edit", object: "server", payload: [] },
    });
    const done = vi.fn();
    const waiting = draftPersistence
      .wait("project", { signal: new AbortController().signal })
      .then(done);
    transport.callbacks.onAck(3, 3);
    await Promise.resolve();
    expect(done).not.toHaveBeenCalled();
    transport.callbacks.onAck(4, 4);
    await waiting;
    expect(done).toHaveBeenCalledOnce();
    emitter.close();
    draftPersistence.reset();
  });

  test.each(["settled", "rejected", "dropped", "failed"] as const)(
    "Preview waits for durable acknowledgment or rejects %s",
    async (status) => {
      draftPersistence.reset("project");
      const transport = createTransportFactory();
      const emitter = createMultiplayerSyncEmitter({
        projectId: "project",
        clientId: "client-1",
        createTransport: transport.createTransport,
        url: "localhost:1999",
      });
      emitter.connect("build-1");
      emitter.emit({
        type: "apply",
        clientId: "client-1",
        transaction: { id: "tx-1", object: "server", payload: [] },
      });
      const done = vi.fn();
      const wait = draftPersistence.wait("project", {
        signal: new AbortController().signal,
      });
      const result =
        status === "settled"
          ? wait.then(done)
          : expect(wait).rejects.toMatchObject({
              name: "DraftPersistenceError",
              reason: "save-failed",
            });
      transport.callbacks.onApplied("tx-1", 1, status);
      await Promise.resolve();
      expect(done).not.toHaveBeenCalled();
      transport.callbacks.onAck(1, 2);
      await result;
      if (status !== "settled") {
        await expect(
          draftPersistence.wait("project", {
            signal: new AbortController().signal,
          })
        ).rejects.toMatchObject({
          name: "DraftPersistenceError",
          reason: "save-failed",
        });
      }
      emitter.close();
      draftPersistence.reset();
    }
  );

  afterEach(() => {
    $syncStatus.set({ status: "idle" });
    $collaborators.set(new Map());
  });

  test("keeps unsaved state until all local applies are durable", () => {
    const transport = createTransportFactory();
    const emitter = createMultiplayerSyncEmitter({
      getAuthToken: async () => "token",
      clientId: "client-1",
      createTransport: transport.createTransport,
      url: "localhost:1999",
    });
    $syncStatus.set({ status: "idle" });

    emitter.connect("build-1");
    emitter.emit({
      type: "apply",
      clientId: "client-1",
      transaction: { id: "tx-1", object: "server", payload: [] },
    });
    emitter.emit({
      type: "apply",
      clientId: "client-1",
      transaction: { id: "tx-2", object: "server", payload: [] },
    });

    expect($syncStatus.get()).toEqual({ status: "syncing" });

    transport.callbacks.onBroadcast({
      type: "broadcast",
      actorId: "client-1",
      clientSeq: 1,
      originClientId: "client-1",
      relayTs: 10,
      seq: 1,
      transaction: { id: "tx-1", object: "server", payload: [] },
    });
    transport.callbacks.onAck(1, 2);

    expect($syncStatus.get()).toEqual({ status: "syncing" });

    transport.callbacks.onBroadcast({
      type: "broadcast",
      actorId: "client-1",
      clientSeq: 2,
      originClientId: "client-1",
      relayTs: 11,
      seq: 2,
      transaction: { id: "tx-2", object: "server", payload: [] },
    });
    transport.callbacks.onAck(2, 3);

    expect($syncStatus.get()).toEqual({ status: "idle" });
  });

  test("connects to the build room and sends local transactions as relay applies", () => {
    const transport = createTransportFactory();
    const emitter = createMultiplayerSyncEmitter({
      getAuthToken: async () => "token",
      clientId: "client-1",
      createTransport: transport.createTransport,
      url: "localhost:1999",
    });

    emitter.connect("build-1");
    emitter.emit({
      type: "apply",
      clientId: "client-1",
      transaction: { id: "tx-1", object: "server", payload: [] },
    });

    expect(transport.callbacks.buildId).toBe("build-1");
    expect(transport.sendToRelay).toHaveBeenCalledWith({
      type: "apply",
      transactionId: "tx-1",
      transaction: { id: "tx-1", object: "server", payload: [] },
      clientId: "client-1",
      actorId: "client-1",
      clientSeq: 1,
    });
  });

  test("forwards sync messages locally before relaying server transactions", () => {
    const transport = createTransportFactory();
    const emitter = createMultiplayerSyncEmitter({
      getAuthToken: async () => "token",
      clientId: "client-1",
      createTransport: transport.createTransport,
      url: "localhost:1999",
    });
    const handler = vi.fn();
    emitter.on(handler);

    emitter.emit({
      type: "state",
      clientId: "client-1",
      state: new Map([["server", new Map()]]),
    });

    expect(handler).toHaveBeenCalledWith({
      type: "state",
      clientId: "client-1",
      state: new Map([["server", new Map()]]),
    });
    expect(transport.sendToRelay).not.toHaveBeenCalled();
  });

  test("does not relay client-only sync transactions to the multiplayer service", () => {
    const transport = createTransportFactory();
    const emitter = createMultiplayerSyncEmitter({
      getAuthToken: async () => "token",
      clientId: "client-1",
      createTransport: transport.createTransport,
      url: "localhost:1999",
    });
    const handler = vi.fn();
    emitter.on(handler);

    emitter.connect("build-1");
    emitter.emit({
      type: "apply",
      clientId: "client-1",
      transaction: { id: "tx-1", object: "canvasIframeState", payload: "idle" },
    });

    expect(handler).toHaveBeenCalledWith({
      type: "apply",
      clientId: "client-1",
      transaction: { id: "tx-1", object: "canvasIframeState", payload: "idle" },
    });
    expect(transport.sendToRelay).not.toHaveBeenCalled();
  });

  test("applies relay broadcasts to sync handlers", () => {
    const transport = createTransportFactory();
    const emitter = createMultiplayerSyncEmitter({
      clientId: "client-1",
      createTransport: transport.createTransport,
      url: "localhost:1999",
    });
    const handler = vi.fn();
    emitter.on(handler);

    emitter.connect("build-1");
    transport.callbacks.onBroadcast({
      type: "broadcast",
      actorId: "client-2",
      clientSeq: 1,
      originClientId: "client-2",
      relayTs: 10,
      seq: 1,
      transaction: { id: "tx-2", object: "server", payload: [] },
    });

    expect(handler).toHaveBeenCalledWith({
      type: "apply",
      clientId: "client-2",
      transaction: { id: "tx-2", object: "server", payload: [] },
    });
  });

  test("surfaces relay applied errors to user messages", () => {
    const transport = createTransportFactory();
    const onUserMessage = vi.fn();
    const emitter = createMultiplayerSyncEmitter({
      getAuthToken: async () => "token",
      clientId: "client-1",
      createTransport: transport.createTransport,
      onUserMessage,
      url: "localhost:1999",
    });

    emitter.connect("build-1");
    emitter.emit({
      type: "apply",
      clientId: "client-1",
      transaction: { id: "tx-1", object: "server", payload: [] },
    });
    transport.callbacks.onApplied("tx-1", 1, "rejected", "No permission");

    expect(onUserMessage).toHaveBeenCalledWith("No permission");
    expect($syncStatus.get()).toEqual({ status: "idle" });
  });

  test("updates collaborators from relay presence", () => {
    const transport = createTransportFactory();
    const emitter = createMultiplayerSyncEmitter({
      clientId: "client-1",
      createTransport: transport.createTransport,
      url: "localhost:1999",
    });
    $collaborators.set(new Map());

    emitter.connect("build-1");
    transport.callbacks.onPresence("client-2", {
      pageId: "page-1",
      pointerPosition: { x: 1, y: 2, xRatio: 0.1, yRatio: 0.2 },
      selectedInstanceIds: ["instance-1"],
    });

    expect($collaborators.get().get("client-2")).toMatchObject({
      pageId: "page-1",
      pointerPosition: { x: 1, y: 2, xRatio: 0.1, yRatio: 0.2 },
      selectedInstanceIds: ["instance-1"],
    });
  });
});

describe("startMultiplayerPresenceSync", () => {
  afterEach(() => {
    $pointerPosition.set(undefined);
  });

  test("sends only the latest awareness update in one microtask", async () => {
    const emitter = { sendPresence: vi.fn() };
    const unsubscribe = startMultiplayerPresenceSync(emitter);

    await Promise.resolve();
    emitter.sendPresence.mockClear();

    $pointerPosition.set({
      x: 1,
      y: 2,
      xRatio: 0.1,
      yRatio: 0.2,
    });
    $pointerPosition.set({
      x: 3,
      y: 4,
      xRatio: 0.3,
      yRatio: 0.4,
    });

    expect(emitter.sendPresence).not.toHaveBeenCalled();
    await Promise.resolve();

    expect(emitter.sendPresence).toHaveBeenCalledTimes(1);
    expect(emitter.sendPresence).toHaveBeenCalledWith({
      pageId: undefined,
      pointerPosition: { x: 3, y: 4, xRatio: 0.3, yRatio: 0.4 },
      selectedInstanceIds: undefined,
    });
    unsubscribe();
  });

  test("does not send scheduled presence after unsubscribe", async () => {
    const emitter = { sendPresence: vi.fn() };
    const unsubscribe = startMultiplayerPresenceSync(emitter);

    await Promise.resolve();
    emitter.sendPresence.mockClear();

    $pointerPosition.set({
      x: 1,
      y: 2,
      xRatio: 0.1,
      yRatio: 0.2,
    });
    unsubscribe();

    await Promise.resolve();

    expect(emitter.sendPresence).not.toHaveBeenCalled();
  });
});

test("a peer waits for the guarded copy's durability and installs its Assets before applying the page", async () => {
  const sender = createTransportFactory();
  const receiver = createTransportFactory();
  const output = vi.fn();
  const order: string[] = [];
  const makeEmitter = (
    clientId: string,
    transport: ReturnType<typeof createTransportFactory>
  ) =>
    createMultiplayerSyncEmitter({
      clientId,
      url: "localhost:1999",
      createTransport: transport.createTransport,
      refreshPageCopyCatalog: async ({ assetIds, folderIds }) => {
        expect(assetIds).toEqual(["new-asset"]);
        expect(folderIds).toEqual(["new-folder"]);
        order.push("catalog");
      },
    });
  const a = makeEmitter("sender", sender);
  const b = makeEmitter("receiver", receiver);
  try {
    a.connect("build");
    b.connect("build");
    b.on((event) => {
      if (event.type === "apply") {
        order.push("page");
        output(event.transaction);
      }
    });
    a.emit({
      type: "apply",
      clientId: "sender",
      transaction: {
        id: "copy",
        object: "server",
        payload: [],
        pageCopyGuard: {
          buildId: "build",
          baseVersion: 3,
          assetCatalogRevision: "0".repeat(64),
          stagedCatalog: { assetIds: ["new-asset"], folderIds: ["new-folder"] },
        },
      },
    });
    const { transaction } = sender.sendToRelay.mock.calls[0][0];
    receiver.callbacks.onBroadcast({
      type: "broadcast",
      seq: 1,
      originClientId: "sender",
      actorId: "sender",
      clientSeq: 1,
      relayTs: 1,
      transaction,
    });
    expect(order).toEqual([]);
    receiver.callbacks.onAck(1, 4);
    await Promise.resolve();
    expect(order).toEqual(["catalog", "page"]);
    expect(output).toHaveBeenCalledWith(transaction);
    expect(receiver.sendToRelay).not.toHaveBeenCalled();
  } finally {
    a.close();
    b.close();
  }
});

test("a transient catalog read failure does not stop later peer or local edits", async () => {
  const peer = createTransportFactory();
  const received: string[] = [];
  const refresh = vi
    .fn<() => Promise<void>>()
    .mockRejectedValueOnce(new Error("Network temporarily unavailable"))
    .mockResolvedValueOnce(undefined);
  const emitter = createMultiplayerSyncEmitter({
    clientId: "local",
    url: "localhost:1999",
    createTransport: peer.createTransport,
    refreshPageCopyCatalog: refresh,
  });
  const broadcast = (
    id: string,
    seq: number,
    pageCopyGuard?: {
      buildId: string;
      baseVersion: number;
      assetCatalogRevision: string;
      stagedCatalog: { assetIds: string[]; folderIds: string[] };
    }
  ) =>
    peer.callbacks.onBroadcast({
      type: "broadcast",
      seq,
      originClientId: "remote",
      actorId: "remote",
      clientSeq: seq,
      relayTs: 1,
      transaction: { id, object: "server", payload: [], pageCopyGuard },
    });
  try {
    emitter.connect("build");
    emitter.on((message) => {
      if (message.type === "apply" && message.clientId === "remote") {
        received.push(message.transaction.id);
      }
    });
    broadcast("copy", 1, {
      buildId: "build",
      baseVersion: 3,
      assetCatalogRevision: "0".repeat(64),
      stagedCatalog: { assetIds: ["new-asset"], folderIds: [] },
    });
    peer.callbacks.onAck(1, 4);
    await Promise.resolve();
    expect(received).toEqual([]);
    emitter.emit({
      type: "apply",
      clientId: "local",
      transaction: { id: "local-edit", object: "server", payload: [] },
    });
    expect(peer.sendToRelay).toHaveBeenCalledOnce();
    broadcast("later-peer-edit", 2);
    await Promise.resolve();
    expect(received).toEqual(["copy", "later-peer-edit"]);
    expect(refresh).toHaveBeenCalledTimes(2);
  } finally {
    emitter.close();
  }
});

test("a relay revert removes a guarded copy before its acknowledgment", async () => {
  const relay = createTransportFactory();
  const received: SyncMessage[] = [];
  draftPersistence.reset("project");
  const emitter = createMultiplayerSyncEmitter({
    projectId: "project",
    clientId: "local",
    url: "localhost:1999",
    createTransport: relay.createTransport,
    refreshPageCopyCatalog: async () => {},
  });
  try {
    emitter.connect("build");
    emitter.on((message) => received.push(message));
    relay.callbacks.onBroadcast({
      type: "broadcast",
      seq: 1,
      originClientId: "remote",
      actorId: "remote",
      clientSeq: 1,
      relayTs: 1,
      transaction: {
        id: "rejected-copy",
        object: "server",
        payload: [],
        pageCopyGuard: {
          buildId: "build",
          baseVersion: 3,
          assetCatalogRevision: "0".repeat(64),
          stagedCatalog: { assetIds: ["new-asset"], folderIds: [] },
        },
      },
    });
    const waiting = draftPersistence.wait("project", {
      signal: new AbortController().signal,
    });
    relay.emitSyncMessage({
      type: "revert",
      clientId: "remote",
      transaction: { id: "rejected-copy", object: "server" },
    });
    relay.callbacks.onAck(1, 4);
    await Promise.resolve();
    await waiting;
    await draftPersistence.wait("project", {
      signal: new AbortController().signal,
    });

    expect(received).toEqual([
      {
        type: "revert",
        clientId: "remote",
        transaction: { id: "rejected-copy", object: "server" },
      },
    ]);
  } finally {
    emitter.close();
    draftPersistence.reset();
  }
});

test("a new broadcast is flushed after reload discards an in-flight catalog read", async () => {
  const relay = createTransportFactory();
  const received: string[] = [];
  const refreshedCatalogs: string[] = [];
  let resolveCatalogRead: (() => void) | undefined;
  let finishReload: ((version: number) => void) | undefined;
  const catalogRead = new Promise<void>((resolve) => {
    resolveCatalogRead = resolve;
  });
  const reloadCompletion = new Promise<number>((resolve) => {
    finishReload = resolve;
  });
  const emitter = createMultiplayerSyncEmitter({
    clientId: "local",
    url: "localhost:1999",
    createTransport: relay.createTransport,
    onReload: () => reloadCompletion,
    refreshPageCopyCatalog: async (catalog, signal) => {
      await catalogRead;
      signal.throwIfAborted();
      refreshedCatalogs.push(...catalog.assetIds);
    },
  });
  try {
    emitter.connect("build");
    emitter.on((message) => {
      if (message.type === "apply" && message.clientId === "remote") {
        received.push(message.transaction.id);
      }
    });
    relay.callbacks.onBroadcast({
      type: "broadcast",
      seq: 1,
      originClientId: "remote",
      actorId: "remote",
      clientSeq: 1,
      relayTs: 1,
      transaction: {
        id: "old-copy",
        object: "server",
        payload: [],
        pageCopyGuard: {
          buildId: "build",
          baseVersion: 3,
          assetCatalogRevision: "0".repeat(64),
          stagedCatalog: { assetIds: ["old-asset"], folderIds: [] },
        },
      },
    });
    relay.callbacks.onAck(1, 4);
    relay.callbacks.onReload?.({
      type: "reload",
      reason: "persistence_error",
    });
    relay.callbacks.onBroadcast({
      type: "broadcast",
      seq: 2,
      originClientId: "remote",
      actorId: "remote",
      clientSeq: 2,
      relayTs: 2,
      transaction: { id: "new-edit", object: "server", payload: [] },
    });
    resolveCatalogRead?.();
    await Promise.resolve();
    expect(received).toEqual([]);
    finishReload?.(4);
    relay.callbacks.onAck(2, 5);
    await vi.waitFor(() => expect(received).toEqual(["new-edit"]));
    expect(refreshedCatalogs).toEqual([]);
  } finally {
    emitter.close();
  }
});

test("a reload snapshot does not replay an edit already persisted in it", async () => {
  const relay = createTransportFactory();
  const received: string[] = [];
  let installSnapshot: ((version: number) => void) | undefined;
  let snapshotReadFinished = false;
  const snapshot = new Promise<number>((resolve) => {
    installSnapshot = resolve;
  });
  const emitter = createMultiplayerSyncEmitter({
    clientId: "local",
    url: "localhost:1999",
    createTransport: relay.createTransport,
    onReload: async () => {
      const version = await snapshot;
      snapshotReadFinished = true;
      return version;
    },
  });
  try {
    emitter.connect("build");
    emitter.on((message) => {
      if (message.type === "apply" && message.clientId === "remote") {
        received.push(message.transaction.id);
      }
    });
    relay.callbacks.onReload?.({
      type: "reload",
      reason: "persistence_error",
    });
    relay.callbacks.onBroadcast({
      type: "broadcast",
      seq: 2,
      originClientId: "remote",
      actorId: "remote",
      clientSeq: 2,
      relayTs: 2,
      transaction: { id: "already-persisted", object: "server", payload: [] },
    });
    installSnapshot?.(7);
    await vi.waitFor(() => expect(snapshotReadFinished).toBe(true));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    relay.callbacks.onAck(2, 7);
    expect(received).toEqual([]);
    relay.callbacks.onBroadcast({
      type: "broadcast",
      seq: 3,
      originClientId: "remote",
      actorId: "remote",
      clientSeq: 3,
      relayTs: 3,
      transaction: { id: "after-snapshot", object: "server", payload: [] },
    });
    relay.callbacks.onAck(3, 8);
    await vi.waitFor(() => expect(received).toEqual(["after-snapshot"]));
    relay.callbacks.onBroadcast({
      type: "broadcast",
      seq: 4,
      originClientId: "remote",
      actorId: "remote",
      clientSeq: 4,
      relayTs: 4,
      transaction: {
        id: "optimistic-after-reconcile",
        object: "server",
        payload: [],
      },
    });
    await vi.waitFor(() =>
      expect(received).toEqual(["after-snapshot", "optimistic-after-reconcile"])
    );
  } finally {
    emitter.close();
  }
});

test("a newer reload cancels an older snapshot before installation", async () => {
  const relay = createTransportFactory();
  const signals: AbortSignal[] = [];
  const installed: number[] = [];
  const completions: Array<() => void> = [];
  const emitter = createMultiplayerSyncEmitter({
    clientId: "local",
    url: "localhost:1999",
    createTransport: relay.createTransport,
    onReload: async (_message, signal) => {
      const index = signals.push(signal) - 1;
      await new Promise<void>((resolve) => completions.push(resolve));
      signal.throwIfAborted();
      installed.push(index);
      return index;
    },
  });
  try {
    emitter.connect("build");
    relay.callbacks.onReload?.({ type: "reload", reason: "persistence_error" });
    await vi.waitFor(() => expect(signals).toHaveLength(1));
    relay.callbacks.onReload?.({ type: "reload", reason: "persistence_error" });
    await vi.waitFor(() => expect(signals).toHaveLength(2));
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
    completions[0]();
    completions[1]();
    await vi.waitFor(() => expect(installed).toEqual([1]));
  } finally {
    emitter.close();
  }
});

test("a superseding reload preserves unacknowledged peer edits", async () => {
  const relay = createTransportFactory();
  const received: string[] = [];
  let finishSecondReload: ((version: number) => void) | undefined;
  let reloadCount = 0;
  const emitter = createMultiplayerSyncEmitter({
    clientId: "local",
    url: "localhost:1999",
    createTransport: relay.createTransport,
    onReload: async () => {
      reloadCount += 1;
      if (reloadCount === 1) {
        return new Promise<number>(() => {});
      }
      return new Promise<number>((resolve) => {
        finishSecondReload = resolve;
      });
    },
  });
  try {
    emitter.connect("build");
    emitter.on((message) => {
      if (message.type === "apply" && message.clientId === "remote") {
        received.push(message.transaction.id);
      }
    });
    relay.callbacks.onReload?.({ type: "reload", reason: "persistence_error" });
    await vi.waitFor(() => expect(reloadCount).toBe(1));
    relay.callbacks.onBroadcast({
      type: "broadcast",
      seq: 3,
      originClientId: "remote",
      actorId: "remote",
      clientSeq: 3,
      relayTs: 3,
      transaction: { id: "buffered-peer-edit", object: "server", payload: [] },
    });
    relay.callbacks.onReload?.({ type: "reload", reason: "persistence_error" });
    await vi.waitFor(() => expect(reloadCount).toBe(2));
    finishSecondReload?.(7);
    await Promise.resolve();
    expect(received).toEqual([]);
    relay.callbacks.onAck(3, 8);
    await vi.waitFor(() => expect(received).toEqual(["buffered-peer-edit"]));
  } finally {
    emitter.close();
  }
});

test("a deleted staged record does not block later peer edits or lose a pending local edit", async () => {
  registerContainers();
  const previousAssets = $assets.get();
  const previousFolders = $assetFolders.get();
  const staleAsset: Asset = {
    id: "deleted-asset",
    projectId: "project",
    name: "deleted.png",
    type: "image",
    size: 128,
    format: "png",
    createdAt: "2026-01-01T00:00:00.000Z",
    description: null,
    meta: { width: 1200, height: 800 },
  };
  const survivingAsset = { ...staleAsset, id: "live-asset", name: "live.png" };
  $assets.set(new Map([[staleAsset.id, staleAsset]]));
  $assetFolders.set(new Map());
  const request = vi.fn<typeof fetch>(async (input) => {
    const path = new URL(String(input)).pathname;
    if (path === "/rest/assets") {
      return Response.json({ assets: [survivingAsset] });
    }
    if (path === "/rest/assets/folders") {
      return Response.json({ folders: [] });
    }
    throw new Error(`Unexpected catalog request ${path}`);
  });
  const relay = createTransportFactory();
  const signal = new AbortController().signal;
  const emitter = createMultiplayerSyncEmitter({
    clientId: "local",
    url: "localhost:1999",
    createTransport: relay.createTransport,
    refreshPageCopyCatalog: (catalog) =>
      refreshPageCopyCatalog(
        { origin: "https://example.com", projectId: "project", request },
        catalog,
        signal
      ),
  });
  const received: string[] = [];
  try {
    emitter.connect("build");
    emitter.on((message) => {
      if (message.type === "apply" && message.clientId === "remote") {
        received.push(message.transaction.id);
      }
    });
    emitter.emit({
      type: "apply",
      clientId: "local",
      transaction: { id: "local-edit", object: "server", payload: [] },
    });
    relay.callbacks.onBroadcast({
      type: "broadcast",
      seq: 1,
      originClientId: "remote",
      actorId: "remote",
      clientSeq: 1,
      relayTs: 1,
      transaction: {
        id: "copy",
        object: "server",
        payload: [],
        pageCopyGuard: {
          buildId: "build",
          baseVersion: 3,
          assetCatalogRevision: "0".repeat(64),
          stagedCatalog: {
            assetIds: [staleAsset.id, survivingAsset.id],
            folderIds: ["deleted-folder"],
          },
        },
      },
    });
    relay.callbacks.onAck(1, 4);
    relay.callbacks.onBroadcast({
      type: "broadcast",
      seq: 2,
      originClientId: "remote",
      actorId: "remote",
      clientSeq: 2,
      relayTs: 2,
      transaction: { id: "later-edit", object: "server", payload: [] },
    });
    await vi.waitFor(() => expect(received).toEqual(["copy", "later-edit"]));
    expect($assets.get()).toEqual(
      new Map([[survivingAsset.id, survivingAsset]])
    );
    expect($assetFolders.get().has("deleted-folder")).toBe(false);
    expect(request).toHaveBeenCalledTimes(2);
    expect($syncStatus.get()).toEqual({ status: "syncing" });
    relay.callbacks.onApplied("local-edit", 3, "settled");
    relay.callbacks.onAck(3, 6);
    expect($syncStatus.get()).toEqual({ status: "idle" });
  } finally {
    emitter.close();
    $assets.set(previousAssets);
    $assetFolders.set(previousFolders);
  }
});
