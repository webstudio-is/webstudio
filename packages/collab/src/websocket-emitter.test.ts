import { describe, expect, test, vi } from "vitest";

const { partySocketOptions } = vi.hoisted(() => ({
  partySocketOptions: [] as Array<{
    host: string;
    protocol: "ws" | "wss" | undefined;
    query: () => Promise<Record<string, string>>;
  }>,
}));

vi.mock("partysocket", () => ({
  default: vi.fn((options) => {
    partySocketOptions.push(options);
    return {
      addEventListener: vi.fn(),
      close: vi.fn(),
      readyState: 1,
      send: vi.fn(),
    };
  }),
}));

import {
  createWebSocketSyncEmitter,
  dispatchWebSocketMessage,
} from "./websocket-emitter";

const createCallbacks = () => ({
  onAck: vi.fn(),
  onApplied: vi.fn(),
  onPresence: vi.fn(),
  onBroadcast: vi.fn(),
  onReload: vi.fn(),
  onErrorMessage: vi.fn(),
});

describe("dispatchWebSocketMessage", () => {
  test("forwards applied status from websocket messages", () => {
    const callbacks = createCallbacks();

    dispatchWebSocketMessage({
      data: JSON.stringify({
        type: "applied",
        transactionId: "tx-1",
        seq: 7,
        status: "settled",
      }),
      handlers: new Set(),
      callbacks,
    });

    expect(callbacks.onApplied).toHaveBeenCalledWith("tx-1", 7, "settled");
  });

  test("forwards broadcast messages", () => {
    const callbacks = createCallbacks();
    const message = {
      type: "broadcast",
      transaction: { id: "tx-1", object: "server", payload: [] },
      originClientId: "client-1",
      seq: 1,
      actorId: "actor-1",
      clientSeq: 1,
      relayTs: 10,
    };

    dispatchWebSocketMessage({
      data: JSON.stringify(message),
      handlers: new Set(),
      callbacks,
    });

    expect(callbacks.onBroadcast).toHaveBeenCalledWith(message);
  });

  test("forwards ack messages", () => {
    const callbacks = createCallbacks();

    dispatchWebSocketMessage({
      data: JSON.stringify({ type: "ack", seq: 3, version: 9 }),
      handlers: new Set(),
      callbacks,
    });

    expect(callbacks.onAck).toHaveBeenCalledWith(3, 9);
  });

  test("forwards presence messages", () => {
    const callbacks = createCallbacks();

    dispatchWebSocketMessage({
      data: JSON.stringify({
        type: "presence",
        clientId: "client-1",
        payload: { pointerPosition: { x: 1, y: 2, xRatio: 0.1, yRatio: 0.2 } },
      }),
      handlers: new Set(),
      callbacks,
    });

    expect(callbacks.onPresence).toHaveBeenCalledWith("client-1", {
      pointerPosition: { x: 1, y: 2, xRatio: 0.1, yRatio: 0.2 },
    });
  });

  test("forwards reload messages", () => {
    const callbacks = createCallbacks();
    const message = {
      type: "reload",
      reason: "version_mismatched",
      errors: "Reload required",
    };

    dispatchWebSocketMessage({
      data: JSON.stringify(message),
      handlers: new Set(),
      callbacks,
    });

    expect(callbacks.onReload).toHaveBeenCalledWith(message);
  });

  test("forwards error messages", () => {
    const callbacks = createCallbacks();
    const message = {
      type: "error",
      code: "persistence_backlog_full",
      message:
        "Collaboration is catching up. Please pause for a moment while changes are saved.",
      retryAfterMs: 100,
    };

    dispatchWebSocketMessage({
      data: JSON.stringify(message),
      handlers: new Set(),
      callbacks,
    });

    expect(callbacks.onErrorMessage).toHaveBeenCalledWith(message);
  });

  test("does not forward old role messages to sync handlers", () => {
    const callbacks = createCallbacks();
    const handler = vi.fn();

    dispatchWebSocketMessage({
      data: JSON.stringify({ type: "role", role: "leader" }),
      handlers: new Set([handler]),
      callbacks,
    });

    expect(handler).not.toHaveBeenCalled();
  });
});

describe("createWebSocketSyncEmitter", () => {
  test("omits auth token query for view-only connections", async () => {
    partySocketOptions.length = 0;

    createWebSocketSyncEmitter({
      host: "localhost:1999",
      buildId: "build-1",
      clientId: "client-1",
      onAck: vi.fn(),
      onApplied: vi.fn(),
      onBroadcast: vi.fn(),
      onErrorMessage: vi.fn(),
      onPresence: vi.fn(),
    });

    await expect(partySocketOptions[0].query()).resolves.toEqual({});
  });

  test("sends auth token query when provided", async () => {
    partySocketOptions.length = 0;

    createWebSocketSyncEmitter({
      host: "localhost:1999",
      buildId: "build-1",
      clientId: "client-1",
      authToken: "token-1",
      onAck: vi.fn(),
      onApplied: vi.fn(),
      onBroadcast: vi.fn(),
      onErrorMessage: vi.fn(),
      onPresence: vi.fn(),
    });

    await expect(partySocketOptions[0].query()).resolves.toEqual({
      token: "token-1",
    });
  });

  test("connects directly to loopback hosts instead of rewriting to same origin", () => {
    partySocketOptions.length = 0;

    createWebSocketSyncEmitter({
      host: "localhost:1999",
      buildId: "build-1",
      clientId: "client-1",
      onAck: vi.fn(),
      onApplied: vi.fn(),
      onBroadcast: vi.fn(),
      onErrorMessage: vi.fn(),
      onPresence: vi.fn(),
    });

    expect(partySocketOptions[0]).toMatchObject({
      host: "localhost:1999",
      protocol: "ws",
    });
  });

  test("connects directly to loopback hosts in remote browsers", () => {
    partySocketOptions.length = 0;

    createWebSocketSyncEmitter({
      host: "localhost:1999",
      buildId: "build-1",
      clientId: "client-1",
      onAck: vi.fn(),
      onApplied: vi.fn(),
      onBroadcast: vi.fn(),
      onErrorMessage: vi.fn(),
      onPresence: vi.fn(),
    });

    expect(partySocketOptions[0]).toMatchObject({
      host: "localhost:1999",
      protocol: "ws",
    });
  });

  test("lets PartySocket pick the protocol for bare remote hosts", () => {
    partySocketOptions.length = 0;

    createWebSocketSyncEmitter({
      host: "collab.example.com",
      buildId: "build-1",
      clientId: "client-1",
      onAck: vi.fn(),
      onApplied: vi.fn(),
      onBroadcast: vi.fn(),
      onErrorMessage: vi.fn(),
      onPresence: vi.fn(),
    });

    expect(partySocketOptions[0]).toMatchObject({
      host: "collab.example.com",
      protocol: undefined,
    });
  });

  test("normalizes explicit http websocket hosts", () => {
    partySocketOptions.length = 0;

    createWebSocketSyncEmitter({
      host: "https://collab.example.com",
      buildId: "build-1",
      clientId: "client-1",
      onAck: vi.fn(),
      onApplied: vi.fn(),
      onBroadcast: vi.fn(),
      onErrorMessage: vi.fn(),
      onPresence: vi.fn(),
    });

    expect(partySocketOptions[0]).toMatchObject({
      host: "collab.example.com",
      protocol: "wss",
    });
  });
});
