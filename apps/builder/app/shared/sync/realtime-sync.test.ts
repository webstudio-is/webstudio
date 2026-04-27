import { afterEach, describe, expect, test, vi } from "vitest";
import type { WebSocketEmitterOptions } from "@webstudio-is/multiplayer-client/websocket";
import {
  $collaborators,
  $collabUnsaved,
} from "@webstudio-is/multiplayer-client";
import { createRealtimeSyncEmitter } from "./realtime-sync";

const createTransportFactory = () => {
  let callbacks: WebSocketEmitterOptions | undefined;
  const sendToRelay = vi.fn();
  const close = vi.fn();
  return {
    close,
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
        on: vi.fn(() => () => {}),
        sendToRelay,
      };
    },
    sendToRelay,
  };
};

describe("createRealtimeSyncEmitter", () => {
  afterEach(() => {
    $collabUnsaved.set(false);
    $collaborators.set(new Map());
  });

  test("keeps unsaved state until all local applies are durable", () => {
    const transport = createTransportFactory();
    const emitter = createRealtimeSyncEmitter({
      authToken: "token",
      clientId: "client-1",
      createTransport: transport.createTransport,
      url: "localhost:1999",
    });
    $collabUnsaved.set(false);

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

    expect($collabUnsaved.get()).toBe(true);

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

    expect($collabUnsaved.get()).toBe(true);

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

    expect($collabUnsaved.get()).toBe(false);
  });

  test("connects to the build room and sends local transactions as relay applies", () => {
    const transport = createTransportFactory();
    const emitter = createRealtimeSyncEmitter({
      authToken: "token",
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
    const emitter = createRealtimeSyncEmitter({
      authToken: "token",
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

  test("does not relay client-only sync transactions to the realtime worker", () => {
    const transport = createTransportFactory();
    const emitter = createRealtimeSyncEmitter({
      authToken: "token",
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
    const emitter = createRealtimeSyncEmitter({
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
    const emitter = createRealtimeSyncEmitter({
      authToken: "token",
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
    expect($collabUnsaved.get()).toBe(false);
  });

  test("updates collaborators from relay presence", () => {
    const transport = createTransportFactory();
    const emitter = createRealtimeSyncEmitter({
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
