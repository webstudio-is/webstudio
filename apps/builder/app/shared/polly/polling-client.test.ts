/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { createPollingClient } from "./polling-client";

// ── Helpers ──────────────────────────────────────────────────────────

// Flush the microtask queue so resolved promises execute.
const flush = () => vi.advanceTimersByTimeAsync(0);

// ── Tests ────────────────────────────────────────────────────────────

describe("createPollingClient", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── Lifecycle ──────────────────────────────────────────────────

  describe("lifecycle", () => {
    test("starts inactive", () => {
      const client = createPollingClient({
        fetcher: async () => 1,
        onData: vi.fn(),
      });

      expect(client.isActive()).toBe(false);
    });

    test("start activates and triggers an immediate fetch", async () => {
      const onData = vi.fn();
      const fetcher = vi.fn(async () => 42);
      const client = createPollingClient({ fetcher, onData });

      client.start();
      await flush();

      expect(client.isActive()).toBe(true);
      expect(fetcher).toHaveBeenCalledOnce();
      expect(onData).toHaveBeenCalledWith(42);

      client.stop();
    });

    test("start is idempotent — calling twice does not double-fetch", async () => {
      const fetcher = vi.fn(async () => "data");
      const client = createPollingClient({ fetcher, onData: vi.fn() });

      client.start();
      client.start();
      await flush();

      expect(fetcher).toHaveBeenCalledOnce();

      client.stop();
    });

    test("stop deactivates and prevents further polling", async () => {
      const fetcher = vi.fn(async () => "data");
      const client = createPollingClient({
        fetcher,
        onData: vi.fn(),
        interval: 1000,
      });

      client.start();
      await flush();
      expect(fetcher).toHaveBeenCalledOnce();

      client.stop();
      expect(client.isActive()).toBe(false);

      await vi.advanceTimersByTimeAsync(5000);
      expect(fetcher).toHaveBeenCalledOnce();
    });

    test("stop is idempotent — calling before start is safe", () => {
      const client = createPollingClient({
        fetcher: async () => 1,
        onData: vi.fn(),
      });

      client.stop();
      client.stop();
      expect(client.isActive()).toBe(false);
    });
  });

  // ── Polling interval ───────────────────────────────────────────

  describe("polling", () => {
    test("polls at the configured interval", async () => {
      const fetcher = vi.fn(async () => "tick");
      const client = createPollingClient({
        fetcher,
        onData: vi.fn(),
        interval: 5000,
      });

      client.start();
      await flush();
      expect(fetcher).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(5000);
      expect(fetcher).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(5000);
      expect(fetcher).toHaveBeenCalledTimes(3);

      client.stop();
    });

    test("uses default 30s interval when not specified", async () => {
      const fetcher = vi.fn(async () => "tick");
      const client = createPollingClient({ fetcher, onData: vi.fn() });

      client.start();
      await flush();
      expect(fetcher).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(29_000);
      expect(fetcher).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1_000);
      expect(fetcher).toHaveBeenCalledTimes(2);

      client.stop();
    });

    test("deduplicates overlapping fetches", async () => {
      let resolve: ((value: string) => void) | undefined;
      const fetcher = vi.fn(
        () =>
          new Promise<string>((r) => {
            resolve = r;
          })
      );
      const client = createPollingClient({
        fetcher,
        onData: vi.fn(),
        interval: 100,
      });

      client.start();
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Advance past interval while first fetch is still pending
      await vi.advanceTimersByTimeAsync(200);
      // Still only 1 call — the pending fetch blocks the scheduled one
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Resolve the first call
      resolve?.("done");
      await flush();

      // Now the next scheduled poll fires
      await vi.advanceTimersByTimeAsync(100);
      expect(fetcher).toHaveBeenCalledTimes(2);

      client.stop();
    });
  });

  // ── Error handling ─────────────────────────────────────────────

  describe("errors", () => {
    test("swallows errors when no onError provided", async () => {
      const fetcher = vi.fn(async () => {
        throw new Error("boom");
      });
      const onData = vi.fn();
      const client = createPollingClient({
        fetcher,
        onData,
        backoff: false,
      });

      client.start();
      await flush();

      // No crash, onData not called
      expect(onData).not.toHaveBeenCalled();

      client.stop();
    });

    test("calls onError when provided", async () => {
      const error = new Error("network failure");
      const fetcher = vi.fn(async () => {
        throw error;
      });
      const onError = vi.fn();
      const client = createPollingClient({
        fetcher,
        onData: vi.fn(),
        onError,
        backoff: false,
      });

      client.start();
      await flush();

      expect(onError).toHaveBeenCalledWith(error);

      client.stop();
    });

    test("continues polling after an error", async () => {
      const fetcher = vi.fn(async () => "ok");
      fetcher.mockRejectedValueOnce(new Error("transient"));

      const onData = vi.fn();
      const client = createPollingClient({
        fetcher,
        onData,
        interval: 1000,
        backoff: false,
      });

      client.start();
      await flush();
      // First call fails — no data
      expect(onData).not.toHaveBeenCalled();

      // Next interval succeeds
      await vi.advanceTimersByTimeAsync(1000);
      expect(onData).toHaveBeenCalledWith("ok");

      client.stop();
    });
  });

  // ── Backoff ────────────────────────────────────────────────────

  describe("backoff", () => {
    test("uses backoff delay after errors (deterministic)", async () => {
      const fetcher = vi.fn(async () => "ok");
      // Fail the first 3 calls
      fetcher.mockRejectedValueOnce(new Error("fail-1"));
      fetcher.mockRejectedValueOnce(new Error("fail-2"));
      fetcher.mockRejectedValueOnce(new Error("fail-3"));

      const onData = vi.fn();
      const client = createPollingClient({
        fetcher,
        onData,
        interval: 5000,
        backoff: { baseDelay: 100, multiplier: 2, jitter: false },
      });

      client.start();
      await flush();
      // 1st call fails → next delay = 100 (100 * 2^0)
      expect(fetcher).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(100);
      // 2nd call fails → next delay = 200 (100 * 2^1)
      expect(fetcher).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(200);
      // 3rd call fails → next delay = 400 (100 * 2^2)
      expect(fetcher).toHaveBeenCalledTimes(3);

      await vi.advanceTimersByTimeAsync(400);
      // 4th call succeeds → back to normal interval (5000)
      expect(fetcher).toHaveBeenCalledTimes(4);
      expect(onData).toHaveBeenCalledWith("ok");

      await vi.advanceTimersByTimeAsync(5000);
      expect(fetcher).toHaveBeenCalledTimes(5);

      client.stop();
    });

    test("resets backoff after a successful fetch", async () => {
      const fetcher = vi.fn(async () => "ok");
      fetcher
        .mockRejectedValueOnce(new Error("fail-1"))
        .mockRejectedValueOnce(new Error("fail-2"));

      const onData = vi.fn();
      const client = createPollingClient({
        fetcher,
        onData,
        interval: 5000,
        backoff: { baseDelay: 100, multiplier: 2, jitter: false },
      });

      client.start();
      await flush();
      // fail-1 → delay 100
      await vi.advanceTimersByTimeAsync(100);
      // fail-2 → delay 200
      await vi.advanceTimersByTimeAsync(200);
      // success → backoff resets, normal interval
      expect(onData).toHaveBeenCalledWith("ok");

      // Now fail again — should start at baseDelay, not 400
      fetcher.mockRejectedValueOnce(new Error("fail-3"));
      await vi.advanceTimersByTimeAsync(5000);
      // After this failure, delay should be 100 (reset)
      expect(fetcher).toHaveBeenCalledTimes(4);

      // Advance by 100 (baseDelay) — should fire
      await vi.advanceTimersByTimeAsync(100);
      expect(fetcher).toHaveBeenCalledTimes(5);

      client.stop();
    });

    test("backoff delay is clamped at maxDelay", async () => {
      const fetcher = vi.fn(async (): Promise<string> => {
        throw new Error("fail");
      });

      const client = createPollingClient({
        fetcher,
        onData: vi.fn(),
        backoff: {
          baseDelay: 100,
          multiplier: 10,
          maxDelay: 500,
          jitter: false,
        },
      });

      client.start();
      await flush();
      // fail → delay 100

      await vi.advanceTimersByTimeAsync(100);
      // fail → delay 500 (clamped from 1000)

      await vi.advanceTimersByTimeAsync(500);
      // fail → delay 500 (stays clamped)
      expect(fetcher).toHaveBeenCalledTimes(3);

      // Should not fire at 100, only at 500
      await vi.advanceTimersByTimeAsync(100);
      expect(fetcher).toHaveBeenCalledTimes(3);

      await vi.advanceTimersByTimeAsync(400);
      expect(fetcher).toHaveBeenCalledTimes(4);

      client.stop();
    });

    test("stop resets backoff state", async () => {
      const fetcher = vi.fn(async () => "ok");
      fetcher.mockRejectedValue(new Error("fail"));

      const client = createPollingClient({
        fetcher,
        onData: vi.fn(),
        backoff: { baseDelay: 100, multiplier: 2, jitter: false },
      });

      // Accumulate some backoff
      client.start();
      await flush(); // fail → delay 100
      await vi.advanceTimersByTimeAsync(100); // fail → delay 200
      client.stop();

      // Restart — should use baseDelay again, not 400
      fetcher.mockRejectedValueOnce(new Error("fail-again"));
      fetcher.mockResolvedValue("ok");
      client.start();
      await flush(); // fail → delay should be 100 (reset)

      await vi.advanceTimersByTimeAsync(100);
      expect(fetcher).toHaveBeenCalledTimes(4); // 2 from first run + 2 from second

      client.stop();
    });

    test("backoff=false disables backoff — errors use normal interval", async () => {
      const fetcher = vi.fn(async () => "ok");
      fetcher.mockRejectedValueOnce(new Error("fail"));

      const client = createPollingClient({
        fetcher,
        onData: vi.fn(),
        interval: 2000,
        backoff: false,
      });

      client.start();
      await flush();
      expect(fetcher).toHaveBeenCalledTimes(1);

      // With backoff=false, next poll at normal interval
      await vi.advanceTimersByTimeAsync(2000);
      expect(fetcher).toHaveBeenCalledTimes(2);

      client.stop();
    });

    test("default backoff is enabled", async () => {
      const fetcher = vi.fn(async () => "ok");
      fetcher.mockRejectedValueOnce(new Error("fail"));

      const client = createPollingClient({
        fetcher,
        onData: vi.fn(),
        interval: 30_000,
      });

      client.start();
      await flush();

      // With default backoff (baseDelay=5000, multiplier=3), the first
      // jittered delay is random(5000, 15000). Advance past 15s so the
      // retry is guaranteed to fire regardless of the jitter value.
      await vi.advanceTimersByTimeAsync(16_000);
      expect(fetcher).toHaveBeenCalledTimes(2);

      client.stop();
    });
  });

  // ── Equality check ─────────────────────────────────────────────

  describe("equals", () => {
    test("skips onData when equals returns true", async () => {
      let value = { count: 5 };
      const fetcher = vi.fn(async () => value);
      const onData = vi.fn();
      const client = createPollingClient({
        fetcher,
        onData,
        equals: (a, b) => a.count === b.count,
        interval: 1000,
      });

      client.start();
      await flush();
      expect(onData).toHaveBeenCalledTimes(1);

      // Same value on next poll — onData should not fire
      value = { count: 5 };
      await vi.advanceTimersByTimeAsync(1000);
      expect(onData).toHaveBeenCalledTimes(1);

      // Different value — onData fires
      value = { count: 10 };
      await vi.advanceTimersByTimeAsync(1000);
      expect(onData).toHaveBeenCalledTimes(2);
      expect(onData).toHaveBeenLastCalledWith({ count: 10 });

      client.stop();
    });

    test("first fetch always triggers onData regardless of equals", async () => {
      const onData = vi.fn();
      const client = createPollingClient({
        fetcher: async () => "initial",
        onData,
        equals: () => true, // Always "equal"
      });

      client.start();
      await flush();

      expect(onData).toHaveBeenCalledWith("initial");

      client.stop();
    });

    test("without equals, onData fires on every poll", async () => {
      const onData = vi.fn();
      const client = createPollingClient({
        fetcher: async () => "same",
        onData,
        interval: 1000,
      });

      client.start();
      await flush();
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(1000);

      expect(onData).toHaveBeenCalledTimes(3);

      client.stop();
    });
  });

  // ── Refresh ────────────────────────────────────────────────────

  describe("refresh", () => {
    test("triggers an immediate fetch", async () => {
      const fetcher = vi.fn(async () => "refreshed");
      const onData = vi.fn();
      const client = createPollingClient({ fetcher, onData });

      await client.refresh();

      expect(fetcher).toHaveBeenCalledOnce();
      expect(onData).toHaveBeenCalledWith("refreshed");
    });

    test("can be called without start", async () => {
      const onData = vi.fn();
      const client = createPollingClient({
        fetcher: async () => 99,
        onData,
      });

      await client.refresh();

      expect(onData).toHaveBeenCalledWith(99);
      expect(client.isActive()).toBe(false);
    });

    test("deduplicates with an in-flight poll", async () => {
      let resolve: ((value: string) => void) | undefined;
      const fetcher = vi.fn(
        () =>
          new Promise<string>((r) => {
            resolve = r;
          })
      );
      const client = createPollingClient({ fetcher, onData: vi.fn() });

      client.start();
      expect(fetcher).toHaveBeenCalledTimes(1);

      // refresh while poll is in-flight — same promise
      const p = client.refresh();
      expect(fetcher).toHaveBeenCalledTimes(1);

      resolve?.("data");
      await p;

      client.stop();
    });
  });

  // ── Visibility ─────────────────────────────────────────────────

  describe("visibility", () => {
    test("pauses polling when tab is hidden", async () => {
      const fetcher = vi.fn(async () => "data");
      const client = createPollingClient({
        fetcher,
        onData: vi.fn(),
        interval: 1000,
      });

      client.start();
      await flush();
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Simulate tab hidden
      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));

      await vi.advanceTimersByTimeAsync(5000);
      expect(fetcher).toHaveBeenCalledTimes(1);

      client.stop();

      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
        configurable: true,
      });
    });

    test("resumes and fetches immediately when tab becomes visible", async () => {
      const fetcher = vi.fn(async () => "data");
      const client = createPollingClient({
        fetcher,
        onData: vi.fn(),
        interval: 1000,
      });

      client.start();
      await flush();
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Hide
      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));

      // Show
      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
      await flush();

      expect(fetcher).toHaveBeenCalledTimes(2);

      // Interval resumes
      await vi.advanceTimersByTimeAsync(1000);
      expect(fetcher).toHaveBeenCalledTimes(3);

      client.stop();
    });

    test("stop removes the visibility listener", async () => {
      const removeSpy = vi.spyOn(document, "removeEventListener");
      const client = createPollingClient({
        fetcher: async () => 1,
        onData: vi.fn(),
      });

      client.start();
      await flush();
      client.stop();

      expect(removeSpy).toHaveBeenCalledWith(
        "visibilitychange",
        expect.any(Function)
      );
    });

    test("pauseOnHidden=false disables visibility handling", async () => {
      const addSpy = vi.spyOn(document, "addEventListener");
      const fetcher = vi.fn(async () => "data");
      const client = createPollingClient({
        fetcher,
        onData: vi.fn(),
        pauseOnHidden: false,
        interval: 1000,
      });

      client.start();
      await flush();

      expect(addSpy).not.toHaveBeenCalledWith(
        "visibilitychange",
        expect.any(Function)
      );

      // Polling continues even when "hidden"
      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
        configurable: true,
      });

      await vi.advanceTimersByTimeAsync(1000);
      expect(fetcher).toHaveBeenCalledTimes(2);

      client.stop();

      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
        configurable: true,
      });
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────

  describe("edge cases", () => {
    test("can restart after stop", async () => {
      let value = "first";
      const onData = vi.fn();
      const client = createPollingClient({
        fetcher: async () => value,
        onData,
        interval: 1000,
      });

      client.start();
      await flush();
      expect(onData).toHaveBeenCalledWith("first");

      client.stop();

      value = "second";
      client.start();
      await flush();
      expect(onData).toHaveBeenCalledWith("second");

      client.stop();
    });

    test("restart resets equality tracking", async () => {
      const onData = vi.fn();
      const client = createPollingClient({
        fetcher: async () => "same",
        onData,
        equals: (a, b) => a === b,
        interval: 1000,
      });

      client.start();
      await flush();
      expect(onData).toHaveBeenCalledTimes(1);

      client.stop();

      // After restart, first fetch should deliver even though
      // the value is the same as before stop.
      client.start();
      await flush();
      expect(onData).toHaveBeenCalledTimes(2);

      client.stop();
    });

    test("multiple clients are independent", async () => {
      const onData1 = vi.fn();
      const onData2 = vi.fn();

      const client1 = createPollingClient({
        fetcher: async () => "a",
        onData: onData1,
      });
      const client2 = createPollingClient({
        fetcher: async () => "b",
        onData: onData2,
      });

      client1.start();
      client2.start();
      await flush();

      expect(onData1).toHaveBeenCalledWith("a");
      expect(onData2).toHaveBeenCalledWith("b");

      client1.stop();
      client2.stop();
    });

    test("handles fetcher returning different types", async () => {
      type Result = { items: string[]; total: number };

      const onData = vi.fn();
      const client = createPollingClient<Result>({
        fetcher: async () => ({ items: ["x", "y"], total: 2 }),
        onData,
      });

      client.start();
      await flush();

      expect(onData).toHaveBeenCalledWith({ items: ["x", "y"], total: 2 });

      client.stop();
    });
  });
});
