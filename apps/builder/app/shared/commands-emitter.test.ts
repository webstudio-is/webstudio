import { afterEach, describe, expect, test, vi } from "vitest";
import { $commandMetas, createCommandsEmitter } from "./commands-emitter";

type CommandPayload = {
  source: string;
  name: string;
};

const pubsubMock = vi.hoisted(() => {
  let publisher: { publish?: (action: unknown) => void } = {};
  const subscribers = new Map<
    string,
    Array<(payload: CommandPayload) => void>
  >();

  return {
    getPublisher: () => publisher,
    setPublisher: (next: { publish?: (action: unknown) => void }) => {
      publisher = next;
    },
    subscribe: (type: string, callback: (payload: CommandPayload) => void) => {
      const callbacks = subscribers.get(type) ?? [];
      callbacks.push(callback);
      subscribers.set(type, callbacks);
      return () => {
        subscribers.set(
          type,
          (subscribers.get(type) ?? []).filter((item) => item !== callback)
        );
      };
    },
    emit: (type: string, payload: CommandPayload) => {
      for (const callback of subscribers.get(type) ?? []) {
        callback(payload);
      }
    },
    reset: () => {
      publisher = {};
      subscribers.clear();
    },
  };
});

vi.mock("~/shared/pubsub", () => ({
  $publisher: {
    get: pubsubMock.getPublisher,
    set: pubsubMock.setPublisher,
  },
  subscribe: pubsubMock.subscribe,
}));

vi.mock("~/shared/sync/sync-stores", () => ({
  clientSyncStore: {
    register: vi.fn(),
    createTransaction: vi.fn(
      (
        stores: Array<{ get: () => unknown }>,
        callback: (value: unknown) => void
      ) => {
        callback(stores[0].get());
      }
    ),
  },
}));

const createTestCommand = (handler: (source: string) => void = vi.fn()) =>
  createCommandsEmitter({
    source: "builder",
    commands: [
      {
        name: "testCommand",
        handler,
      },
    ],
  });

describe("createCommandsEmitter", () => {
  afterEach(() => {
    pubsubMock.reset();
    $commandMetas.set(new Map());
  });

  test("passes own source to handlers when emitting directly", () => {
    const calls: string[] = [];
    const { emitCommand } = createTestCommand((source) => {
      calls.push(source);
    });

    emitCommand("testCommand");

    expect(calls).toEqual(["builder"]);
  });

  test("publishes commands with own source", () => {
    const publish = vi.fn();
    pubsubMock.setPublisher({ publish });
    const { emitCommand } = createTestCommand();

    emitCommand("testCommand");

    expect(publish).toHaveBeenCalledWith({
      type: "command",
      payload: {
        source: "builder",
        name: "testCommand",
      },
    });
  });

  test("passes published source to subscribed command handlers", () => {
    const calls: string[] = [];
    const { subscribeCommands } = createTestCommand((source) => {
      calls.push(source);
    });

    const unsubscribe = subscribeCommands();
    pubsubMock.emit("command", {
      source: "canvas",
      name: "testCommand",
    });
    unsubscribe();

    expect(calls).toEqual(["canvas"]);
  });
});
