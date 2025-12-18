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
    // Setup window and crypto
    if (!global.window) {
      (global as typeof globalThis).window = {} as Window & typeof globalThis;
    }

    // Mock crypto.getRandomValues
    global.window.crypto = {
      getRandomValues: vi.fn((arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = i;
        }
        return arr;
      }),
    } as unknown as Crypto;

    // Mock requestAnimationFrame - execute callbacks immediately
    global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      // Execute the callback immediately for testing
      setTimeout(() => callback(0), 0);
      return 0;
    }) as typeof requestAnimationFrame;

    postMessageSpy = vi.fn();
    parentPostMessageSpy = vi.fn();
    addEventListenerSpy = vi.fn();

    global.window.postMessage = postMessageSpy;
    global.window.addEventListener = addEventListenerSpy;
    global.window.parent = {
      postMessage: parentPostMessageSpy,
    } as unknown as Window;

    // Set NODE_ENV for consistent testing
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete (global.window as Window & { __webstudio__$__api_token?: string })
      .__webstudio__$__api_token;
  });

  describe("SSR environment", () => {
    test("should throw errors when used in SSR", () => {
      const originalWindow = global.window;
      (global as typeof globalThis).window = undefined as unknown as Window &
        typeof globalThis;

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

      global.window = originalWindow;
    });
  });

  describe("token generation and validation", () => {
    test("should generate random token when window.self === window.top", () => {
      global.window.self = asWindow(global.window);
      global.window.top = asWindow(global.window);

      createPubsub<TestPublishMap>();

      expect(global.window.__webstudio__$__api_token).toBeDefined();
    });

    test("should use development token in non-production", () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      global.window.self = asWindow({});
      global.window.top = asWindow(global.window);

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
      global.window.top = {
        __webstudio__$__api_token: mockToken,
      } as unknown as Window & typeof globalThis;
      global.window.self = asWindow({});

      createPubsub<TestPublishMap>();

      // Token should be reset to undefined on canvas
      expect(global.window.top.__webstudio__$__api_token).toBeUndefined();
    });
  });

  describe("publish (Canvas -> Builder)", () => {
    test("should publish action to parent and self", () => {
      global.window.self = asWindow({});
      global.window.top = asWindow(global.window);
      global.window.top.__webstudio__$__api_token = "test-token";

      const pubsub = createPubsub<TestPublishMap>();

      // Clear the token since it gets reset in createPubsub for Canvas context
      // Set it again after initialization
      global.window.top.__webstudio__$__api_token = "test-token";

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
      global.window.self = asWindow(global.window);
      global.window.top = asWindow(global.window);

      const pubsub = createPubsub<TestPublishMap>();

      expect(() =>
        pubsub.publish({ type: "testAction", payload: { value: "test" } })
      ).toThrow("publish is not available in the Builder environment");
    });

    test("should handle action with no payload", () => {
      global.window.self = asWindow({});
      global.window.top = asWindow(global.window);
      global.window.top.__webstudio__$__api_token = "test-token";

      const pubsub = createPubsub<TestPublishMap>();

      // Set token again after initialization
      global.window.top.__webstudio__$__api_token = "test-token";

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
      global.window.self = asWindow(global.window);
      global.window.top = asWindow(global.window);

      const pubsub = createPubsub<TestPublishMap>();

      expect(pubsub.usePublish).toBeDefined();
      expect(typeof pubsub.usePublish).toBe("function");
    });

    test("should be available for iframe context", () => {
      global.window.self = asWindow({});
      global.window.top = asWindow(global.window);

      const pubsub = createPubsub<TestPublishMap>();

      // usePublish hook itself is available, but publish will throw when called from Canvas
      expect(pubsub.usePublish).toBeDefined();
    });
  });

  describe("subscribe", () => {
    test("should subscribe to messages and call handler", async () => {
      global.window.self = asWindow(global.window);
      global.window.top = asWindow(global.window);

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

      // Wait for requestAnimationFrame callback to execute
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(handler).toHaveBeenCalledWith({ value: "test" });
    });

    test("should return unsubscribe function", () => {
      global.window.self = asWindow(global.window);
      global.window.top = asWindow(global.window);

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
      global.window.self = asWindow(global.window);
      global.window.top = asWindow(global.window);

      // Create a fresh addEventListener spy for this test
      const localAddEventListenerSpy = vi.fn();
      global.window.addEventListener = localAddEventListenerSpy;

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

      // Wait for requestAnimationFrame callback to execute
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler1).toHaveBeenCalledWith({ value: "test" });
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledWith({ value: "test" });
    });
  });

  describe("useSubscribe", () => {
    test("should be available as a hook function", () => {
      global.window.self = asWindow(global.window);
      global.window.top = asWindow(global.window);

      const pubsub = createPubsub<TestPublishMap>();

      expect(pubsub.useSubscribe).toBeDefined();
      expect(typeof pubsub.useSubscribe).toBe("function");
    });
  });

  describe("message unwrapping and validation", () => {
    test("should reject invalid payload (not an object)", () => {
      global.window.self = asWindow(global.window);
      global.window.top = asWindow(global.window);

      const pubsub = createPubsub<TestPublishMap>();

      const handler = vi.fn();
      pubsub.subscribe("testAction", handler);

      const messageHandler = addEventListenerSpy.mock.calls[0][1];

      // Mock console.error to avoid test output noise
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        messageHandler({ data: "invalid" });
      }).toThrow("Invalid payload");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Invalid payload",
        "invalid"
      );
      consoleErrorSpy.mockRestore();
    });

    test("should reject payload without token", () => {
      global.window.self = asWindow(global.window);
      global.window.top = asWindow(global.window);

      const pubsub = createPubsub<TestPublishMap>();

      const handler = vi.fn();
      pubsub.subscribe("testAction", handler);

      const messageHandler = addEventListenerSpy.mock.calls[0][1];

      expect(() => {
        messageHandler({ data: { action: { type: "testAction" } } });
      }).toThrow("Invalid payload, not wrapped");
    });

    test("should reject payload with invalid token", () => {
      global.window.self = asWindow(global.window);
      global.window.top = asWindow(global.window);

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
      global.window.self = asWindow(global.window);
      global.window.top = asWindow(global.window);

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
      global.window.self = asWindow(global.window);
      global.window.top = asWindow(global.window);

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

      global.window.self = asWindow(global.window);
      global.window.top = asWindow(global.window);

      // Create a fresh addEventListener spy for this test
      const localAddEventListenerSpy = vi.fn();
      global.window.addEventListener = localAddEventListenerSpy;

      const pubsub = createPubsub<TestPublishMap>();

      const handler = vi.fn();
      pubsub.subscribe("storybook", handler);

      // Get the message handler from this pubsub instance
      const messageHandler = localAddEventListenerSpy.mock.calls[0][1];

      messageHandler({ data: "storybook-data" });

      // Wait for requestAnimationFrame callback to execute
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(handler).toHaveBeenCalledWith("storybook-data");

      process.env.IS_STROYBOOK = originalIsStorybook;
    });
  });

  describe("action types", () => {
    test("should handle action with undefined payload", () => {
      global.window.self = asWindow({});
      global.window.top = asWindow(global.window);
      global.window.top.__webstudio__$__api_token = "test-token";

      const pubsub = createPubsub<TestPublishMap>();

      // Set token again after initialization
      global.window.top.__webstudio__$__api_token = "test-token";

      pubsub.publish({ type: "noPayloadAction", payload: undefined });

      expect(parentPostMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: { type: "noPayloadAction", payload: undefined },
        }),
        "*"
      );
    });

    test("should handle action with number payload", () => {
      global.window.self = asWindow({});
      global.window.top = asWindow(global.window);
      global.window.top.__webstudio__$__api_token = "test-token";

      const pubsub = createPubsub<TestPublishMap>();

      // Set token again after initialization
      global.window.top.__webstudio__$__api_token = "test-token";

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
      global.window.self = asWindow(global.window);
      global.window.top = asWindow(global.window);

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
      global.window.self = asWindow(global.window);
      global.window.top = asWindow(global.window);

      const localAddEventListenerSpy = vi.fn();
      global.window.addEventListener = localAddEventListenerSpy;

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

      // Wait for requestAnimationFrame callback
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(handler).toHaveBeenCalledWith({
        source: "builder",
        name: "testCommand",
      });
    });

    test("should only call handler for matching command", async () => {
      global.window.self = asWindow(global.window);
      global.window.top = asWindow(global.window);

      const localAddEventListenerSpy = vi.fn();
      global.window.addEventListener = localAddEventListenerSpy;

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

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).not.toHaveBeenCalled();
    });

    test("should call both general command handler and specific command handler", async () => {
      global.window.self = asWindow(global.window);
      global.window.top = asWindow(global.window);

      const localAddEventListenerSpy = vi.fn();
      global.window.addEventListener = localAddEventListenerSpy;

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

      await new Promise((resolve) => setTimeout(resolve, 10));

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
      global.window.self = asWindow(global.window);
      global.window.top = asWindow(global.window);

      const localAddEventListenerSpy = vi.fn();
      global.window.addEventListener = localAddEventListenerSpy;

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

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(handler).not.toHaveBeenCalled();
    });

    test("should handle multiple subscribers to the same specific command", async () => {
      global.window.self = asWindow(global.window);
      global.window.top = asWindow(global.window);

      const localAddEventListenerSpy = vi.fn();
      global.window.addEventListener = localAddEventListenerSpy;

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

      await new Promise((resolve) => setTimeout(resolve, 10));

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
      global.window.self = asWindow(global.window);
      global.window.top = asWindow(global.window);

      const localAddEventListenerSpy = vi.fn();
      global.window.addEventListener = localAddEventListenerSpy;

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

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(handler).toHaveBeenCalledWith({
        source: "builder",
        name: "commandWithPayload",
        data: "test-data",
        count: 42,
      });
    });
  });
});
