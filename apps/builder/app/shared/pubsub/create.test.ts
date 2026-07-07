import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createPubsub } from "./create";

type TestPublishMap = {
  testAction: { value: string };
  noPayloadAction: undefined;
  numberAction: number;
  storybook: string;
  command: { source: string; name: string; [key: string]: unknown };
  "command:testCommand": undefined;
  "command:commandWithPayload": { data: string; count: number };
  "command:anotherCommand": undefined;
};

// Helper to cast to Window type for test mocking
const asWindow = (obj: unknown) => obj as Window & typeof globalThis;

describe("createPubsub", () => {
  let postMessageSpy: ReturnType<typeof vi.fn>;
  let parentPostMessageSpy: ReturnType<typeof vi.fn>;
  let addEventListenerSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, "postMessage").mockImplementation(() => {});
    vi.spyOn(window.parent, "postMessage").mockImplementation(() => {});
    vi.spyOn(window, "addEventListener");

    postMessageSpy = window.postMessage as ReturnType<typeof vi.fn>;
    parentPostMessageSpy = window.parent.postMessage as ReturnType<
      typeof vi.fn
    >;
    addEventListenerSpy = window.addEventListener as ReturnType<typeof vi.fn>;

    // Set NODE_ENV for consistent testing
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    // Flush any pending fake rAF callbacks so raf-queue module state is
    // clean (handle reset to undefined) before the next test.
    vi.runAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete (window as Window & { __webstudio__$__api_token?: string })
      .__webstudio__$__api_token;
  });

  describe("SSR environment", () => {
    test("should throw errors when used in SSR", () => {
      vi.stubGlobal("window", undefined);

      const pubsub = createPubsub<TestPublishMap>();

      expect(() =>
        pubsub.publish({ type: "testAction", payload: { value: "test" } })
      ).toThrow("publish is not available in this environment");
      expect(() => pubsub.usePublish()).toThrow(
        "usePublish is not available in this environment"
      );
      expect(() => pubsub.useSubscribe("testAction", () => {})).toThrow(
        "useSubscribe is not available in this environment"
      );
      expect(() => pubsub.subscribe("testAction", () => {})).toThrow(
        "subscribe is not available in this environment"
      );

      vi.unstubAllGlobals();
    });
  });

  describe("token generation and validation", () => {
    test("should generate random token when window.self === window.top", () => {
      window.self = asWindow(window);
      window.top = asWindow(window);

      createPubsub<TestPublishMap>();

      expect(window.__webstudio__$__api_token).toBeDefined();
    });

    test("should use development token in non-production", () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      window.self = asWindow({});
      window.top = asWindow(window);

      createPubsub<TestPublishMap>();

      // In development, token should be "development-token"
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "message",
        expect.any(Function),
        false
      );

      process.env.NODE_ENV = originalNodeEnv;
    });

    test("should read token from top window when not top", () => {
      const mockToken = "test-token";
      window.top = {
        __webstudio__$__api_token: mockToken,
      } as unknown as Window & typeof globalThis;
      window.self = asWindow({});

      createPubsub<TestPublishMap>();

      // Token should be reset to undefined on canvas
      expect(window.top.__webstudio__$__api_token).toBeUndefined();
    });
  });

  describe("publish (Canvas -> Builder)", () => {
    test("should publish action to parent and self", () => {
      window.self = asWindow({});
      window.top = asWindow(window);
      window.top.__webstudio__$__api_token = "test-token";

      const pubsub = createPubsub<TestPublishMap>();

      // Clear the token since it gets reset in createPubsub for Canvas context
      // Set it again after initialization
      window.top.__webstudio__$__api_token = "test-token";

      pubsub.publish({ type: "testAction", payload: { value: "hello" } });

      expect(parentPostMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: { type: "testAction", payload: { value: "hello" } },
        }),
        "*"
      );
      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: { type: "testAction", payload: { value: "hello" } },
        }),
        "*"
      );
    });

    test("should throw error when publish is called from Builder (self === top)", () => {
      window.self = asWindow(window);
      window.top = asWindow(window);

      const pubsub = createPubsub<TestPublishMap>();

      expect(() =>
        pubsub.publish({ type: "testAction", payload: { value: "test" } })
      ).toThrow("publish is not available in the Builder environment");
    });

    test("should handle action with no payload", () => {
      window.self = asWindow({});
      window.top = asWindow(window);
      window.top.__webstudio__$__api_token = "test-token";

      const pubsub = createPubsub<TestPublishMap>();

      // Set token again after initialization
      window.top.__webstudio__$__api_token = "test-token";

      pubsub.publish({ type: "noPayloadAction" });

      expect(parentPostMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: { type: "noPayloadAction" },
        }),
        "*"
      );
    });
  });

  describe("usePublish (Builder -> Canvas)", () => {
    test("should be available when self === top", () => {
      window.self = asWindow(window);
      window.top = asWindow(window);

      const pubsub = createPubsub<TestPublishMap>();

      expect(pubsub.usePublish).toBeDefined();
      expect(typeof pubsub.usePublish).toBe("function");
    });

    test("should be available for iframe context", () => {
      window.self = asWindow({});
      window.top = asWindow(window);

      const pubsub = createPubsub<TestPublishMap>();

      // usePublish hook itself is available, but publish will throw when called from Canvas
      expect(pubsub.usePublish).toBeDefined();
    });
  });

  describe("subscribe", () => {
    test("should subscribe to messages and call handler", async () => {
      window.self = asWindow(window);
      window.top = asWindow(window);

      const pubsub = createPubsub<TestPublishMap>();

      const handler = vi.fn();
      pubsub.subscribe("testAction", handler);

      // Get the message handler that was registered
      const messageHandler = addEventListenerSpy.mock.calls[0][1];

      // Simulate a message event
      const mockEvent = {
        data: {
          action: { type: "testAction", payload: { value: "test" } },
          token: "development-token",
        },
      };

      messageHandler(mockEvent);

      vi.runAllTimers();

      expect(handler).toHaveBeenCalledWith({ value: "test" });
    });

    test("should return unsubscribe function", () => {
      window.self = asWindow(window);
      window.top = asWindow(window);

      const pubsub = createPubsub<TestPublishMap>();

      const handler = vi.fn();
      const unsubscribe = pubsub.subscribe("testAction", handler);

      expect(typeof unsubscribe).toBe("function");

      unsubscribe();

      // Get the message handler
      const messageHandler = addEventListenerSpy.mock.calls[0][1];

      // Simulate a message event after unsubscribe
      const mockEvent = {
        data: {
          action: { type: "testAction", payload: { value: "test" } },
          token: "development-token",
        },
      };

      messageHandler(mockEvent);

      expect(handler).not.toHaveBeenCalled();
    });

    test("should handle multiple subscribers", async () => {
      window.self = asWindow(window);
      window.top = asWindow(window);

      // Create a fresh addEventListener spy for this test
      const localAddEventListenerSpy = vi.fn();
      window.addEventListener = localAddEventListenerSpy;

      const pubsub = createPubsub<TestPublishMap>();

      const handler1 = vi.fn();
      const handler2 = vi.fn();

      pubsub.subscribe("testAction", handler1);
      pubsub.subscribe("testAction", handler2);

      // Verify addEventListener was called
      expect(localAddEventListenerSpy).toHaveBeenCalledTimes(1);

      // Get the message handler from this pubsub instance
      const messageHandler = localAddEventListenerSpy.mock.calls[0][1];

      const mockEvent = {
        data: {
          action: { type: "testAction", payload: { value: "test" } },
          token: "development-token",
        },
      };

      // Call messageHandler and let it emit
      messageHandler(mockEvent);

      vi.runAllTimers();

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler1).toHaveBeenCalledWith({ value: "test" });
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledWith({ value: "test" });
    });
  });

  describe("useSubscribe", () => {
    test("should be available as a hook function", () => {
      window.self = asWindow(window);
      window.top = asWindow(window);

      const pubsub = createPubsub<TestPublishMap>();

      expect(pubsub.useSubscribe).toBeDefined();
      expect(typeof pubsub.useSubscribe).toBe("function");
    });
  });

  describe("message unwrapping and validation", () => {
    test("should silently ignore invalid payload (not an object)", () => {
      window.self = asWindow(window);
      window.top = asWindow(window);

      const pubsub = createPubsub<TestPublishMap>();

      const handler = vi.fn();
      pubsub.subscribe("testAction", handler);

      const messageHandler = addEventListenerSpy.mock.calls[0][1];

      // Non-object data is silently ignored by handleMessage guard
      messageHandler({ data: "invalid" });

      expect(handler).not.toHaveBeenCalled();
    });

    test("should silently ignore payload without token", () => {
      window.self = asWindow(window);
      window.top = asWindow(window);

      const pubsub = createPubsub<TestPublishMap>();

      const handler = vi.fn();
      pubsub.subscribe("testAction", handler);

      const messageHandler = addEventListenerSpy.mock.calls[0][1];

      // Payload without token is silently ignored by handleMessage guard
      messageHandler({ data: { action: { type: "testAction" } } });

      expect(handler).not.toHaveBeenCalled();
    });

    test("should reject payload with invalid token", () => {
      window.self = asWindow(window);
      window.top = asWindow(window);

      const pubsub = createPubsub<TestPublishMap>();

      const handler = vi.fn();
      pubsub.subscribe("testAction", handler);

      const messageHandler = addEventListenerSpy.mock.calls[0][1];

      expect(() => {
        messageHandler({
          data: {
            action: { type: "testAction" },
            token: "invalid-token",
          },
        });
      }).toThrow("Invalid token");
    });

    test("should reject payload without action", () => {
      window.self = asWindow(window);
      window.top = asWindow(window);

      const pubsub = createPubsub<TestPublishMap>();

      const handler = vi.fn();
      pubsub.subscribe("testAction", handler);

      const messageHandler = addEventListenerSpy.mock.calls[0][1];

      expect(() => {
        messageHandler({
          data: {
            token: "development-token",
          },
        });
      }).toThrow("Invalid payload, not wrapped");
    });

    test("should hide token from subsequent subscribers", () => {
      window.self = asWindow(window);
      window.top = asWindow(window);

      const pubsub = createPubsub<TestPublishMap>();

      const handler = vi.fn();
      pubsub.subscribe("testAction", handler);

      const messageHandler = addEventListenerSpy.mock.calls[0][1];

      const mockData = {
        action: { type: "testAction", payload: { value: "test" } },
        token: "development-token",
      };

      messageHandler({ data: mockData });

      // Token should be set to undefined after unwrapping
      expect(mockData.token).toBeUndefined();
    });

    test("should handle storybook environment", async () => {
      const originalIsStorybook = process.env.IS_STROYBOOK;
      process.env.IS_STROYBOOK = "true";

      window.self = asWindow(window);
      window.top = asWindow(window);

      // Create a fresh addEventListener spy for this test
      const localAddEventListenerSpy = vi.fn();
      window.addEventListener = localAddEventListenerSpy;

      const pubsub = createPubsub<TestPublishMap>();

      const handler = vi.fn();
      pubsub.subscribe("storybook", handler);

      // Get the message handler from this pubsub instance
      const messageHandler = localAddEventListenerSpy.mock.calls[0][1];

      // In storybook, messages still need to be properly wrapped to pass handleMessage guard
      messageHandler({
        data: {
          token: "development-token",
          action: { type: "storybook", payload: "storybook-data" },
        },
      });

      vi.runAllTimers();

      expect(handler).toHaveBeenCalledWith("storybook-data");

      process.env.IS_STROYBOOK = originalIsStorybook;
    });
  });

  describe("action types", () => {
    test("should handle action with undefined payload", () => {
      window.self = asWindow({});
      window.top = asWindow(window);
      window.top.__webstudio__$__api_token = "test-token";

      const pubsub = createPubsub<TestPublishMap>();

      // Set token again after initialization
      window.top.__webstudio__$__api_token = "test-token";

      pubsub.publish({ type: "noPayloadAction", payload: undefined });

      expect(parentPostMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: { type: "noPayloadAction", payload: undefined },
        }),
        "*"
      );
    });

    test("should handle action with number payload", () => {
      window.self = asWindow({});
      window.top = asWindow(window);
      window.top.__webstudio__$__api_token = "test-token";

      const pubsub = createPubsub<TestPublishMap>();

      // Set token again after initialization
      window.top.__webstudio__$__api_token = "test-token";

      pubsub.publish({ type: "numberAction", payload: 42 });

      expect(parentPostMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: { type: "numberAction", payload: 42 },
        }),
        "*"
      );
    });
  });

  describe("event listener registration", () => {
    test("should register message event listener on initialization", () => {
      window.self = asWindow(window);
      window.top = asWindow(window);

      createPubsub<TestPublishMap>();

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "message",
        expect.any(Function),
        false
      );
    });
  });

  describe("command-specific subscriptions", () => {
    test("should subscribe to specific command and call handler", async () => {
      window.self = asWindow(window);
      window.top = asWindow(window);

      const localAddEventListenerSpy = vi.fn();
      window.addEventListener = localAddEventListenerSpy;

      const pubsub = createPubsub<TestPublishMap>();

      const handler = vi.fn();
      pubsub.subscribe("command:testCommand", handler);

      const messageHandler = localAddEventListenerSpy.mock.calls[0][1];

      const mockEvent = {
        data: {
          action: {
            type: "command",
            payload: { source: "builder", name: "testCommand" },
          },
          token: "development-token",
        },
      };

      messageHandler(mockEvent);

      vi.runAllTimers();

      expect(handler).toHaveBeenCalledWith({
        source: "builder",
        name: "testCommand",
      });
    });

    test("should only call handler for matching command", async () => {
      window.self = asWindow(window);
      window.top = asWindow(window);

      const localAddEventListenerSpy = vi.fn();
      window.addEventListener = localAddEventListenerSpy;

      const pubsub = createPubsub<TestPublishMap>();

      const handler1 = vi.fn();
      const handler2 = vi.fn();

      pubsub.subscribe("command:testCommand", handler1);
      pubsub.subscribe("command:anotherCommand", handler2);

      const messageHandler = localAddEventListenerSpy.mock.calls[0][1];

      // Send testCommand
      const mockEvent = {
        data: {
          action: {
            type: "command",
            payload: { source: "builder", name: "testCommand" },
          },
          token: "development-token",
        },
      };

      messageHandler(mockEvent);

      vi.runAllTimers();

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).not.toHaveBeenCalled();
    });

    test("should call both general command handler and specific command handler", async () => {
      window.self = asWindow(window);
      window.top = asWindow(window);

      const localAddEventListenerSpy = vi.fn();
      window.addEventListener = localAddEventListenerSpy;

      const pubsub = createPubsub<TestPublishMap>();

      const generalHandler = vi.fn();
      const specificHandler = vi.fn();

      pubsub.subscribe("command", generalHandler);
      pubsub.subscribe("command:testCommand", specificHandler);

      const messageHandler = localAddEventListenerSpy.mock.calls[0][1];

      const mockEvent = {
        data: {
          action: {
            type: "command",
            payload: { source: "builder", name: "testCommand" },
          },
          token: "development-token",
        },
      };

      messageHandler(mockEvent);

      vi.runAllTimers();

      expect(generalHandler).toHaveBeenCalledWith({
        source: "builder",
        name: "testCommand",
      });
      expect(specificHandler).toHaveBeenCalledWith({
        source: "builder",
        name: "testCommand",
      });
    });

    test("should unsubscribe from specific command", async () => {
      window.self = asWindow(window);
      window.top = asWindow(window);

      const localAddEventListenerSpy = vi.fn();
      window.addEventListener = localAddEventListenerSpy;

      const pubsub = createPubsub<TestPublishMap>();

      const handler = vi.fn();
      const unsubscribe = pubsub.subscribe("command:testCommand", handler);

      unsubscribe();

      const messageHandler = localAddEventListenerSpy.mock.calls[0][1];

      const mockEvent = {
        data: {
          action: {
            type: "command",
            payload: { source: "builder", name: "testCommand" },
          },
          token: "development-token",
        },
      };

      messageHandler(mockEvent);

      vi.runAllTimers();

      expect(handler).not.toHaveBeenCalled();
    });

    test("should handle multiple subscribers to the same specific command", async () => {
      window.self = asWindow(window);
      window.top = asWindow(window);

      const localAddEventListenerSpy = vi.fn();
      window.addEventListener = localAddEventListenerSpy;

      const pubsub = createPubsub<TestPublishMap>();

      const handler1 = vi.fn();
      const handler2 = vi.fn();

      pubsub.subscribe("command:testCommand", handler1);
      pubsub.subscribe("command:testCommand", handler2);

      const messageHandler = localAddEventListenerSpy.mock.calls[0][1];

      const mockEvent = {
        data: {
          action: {
            type: "command",
            payload: { source: "builder", name: "testCommand" },
          },
          token: "development-token",
        },
      };

      messageHandler(mockEvent);

      vi.runAllTimers();

      expect(handler1).toHaveBeenCalledWith({
        source: "builder",
        name: "testCommand",
      });
      expect(handler2).toHaveBeenCalledWith({
        source: "builder",
        name: "testCommand",
      });
    });

    test("should pass payload to command-specific subscribers", async () => {
      window.self = asWindow(window);
      window.top = asWindow(window);

      const localAddEventListenerSpy = vi.fn();
      window.addEventListener = localAddEventListenerSpy;

      const pubsub = createPubsub<TestPublishMap>();

      const handler = vi.fn();
      pubsub.subscribe("command:commandWithPayload", handler);

      const messageHandler = localAddEventListenerSpy.mock.calls[0][1];

      const mockEvent = {
        data: {
          action: {
            type: "command",
            payload: {
              source: "builder",
              name: "commandWithPayload",
              data: "test-data",
              count: 42,
            },
          },
          token: "development-token",
        },
      };

      messageHandler(mockEvent);

      vi.runAllTimers();

      expect(handler).toHaveBeenCalledWith({
        source: "builder",
        name: "commandWithPayload",
        data: "test-data",
        count: 42,
      });
    });
  });
});
