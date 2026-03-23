/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { createPollingManager } from "./polling-manager";
import type { SubscriptionResponse, TopicName } from "./types";

// ── Helpers ──────────────────────────────────────────────────────────

const flush = () => vi.advanceTimersByTimeAsync(0);

const mockNotifications = [
  {
    id: "1",
    type: "workspaceInvite",
    status: "pending",
    payload: {},
    createdAt: "2026-01-01",
    senderEmail: "a@b.c",
    senderName: "A",
    workspaceName: "W",
    projectTitle: undefined,
  },
] as SubscriptionResponse["notifications"];

const createMockFetcher = (
  response: SubscriptionResponse = { notifications: mockNotifications }
) => vi.fn(async (_topics: TopicName[]) => response);

// ── Tests ────────────────────────────────────────────────────────────

describe("createPollingManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── Subscribe / Unsubscribe lifecycle ──────────────────────────

  describe("subscription lifecycle", () => {
    test("first subscription starts polling", async () => {
      const fetcher = createMockFetcher();
      const manager = createPollingManager({ fetcher });

      manager.subscribe("notifications", vi.fn());
      await flush();

      expect(fetcher).toHaveBeenCalled();

      manager.destroy();
    });

    test("removing the last subscription stops polling", async () => {
      const fetcher = createMockFetcher();
      const manager = createPollingManager({ fetcher, interval: 1_000 });

      const sub = manager.subscribe("notifications", vi.fn());
      await flush();
      expect(fetcher).toHaveBeenCalledTimes(1);

      sub.unsubscribe();

      // Advance well past the interval — no more fetches.
      await vi.advanceTimersByTimeAsync(5_000);
      expect(fetcher).toHaveBeenCalledTimes(1);

      manager.destroy();
    });

    test("unsubscribe is idempotent", async () => {
      const fetcher = createMockFetcher();
      const manager = createPollingManager({ fetcher });

      const sub = manager.subscribe("notifications", vi.fn());
      await flush();

      sub.unsubscribe();
      sub.unsubscribe(); // should not throw

      manager.destroy();
    });

    test("destroy removes all subscriptions and stops polling", async () => {
      const fetcher = createMockFetcher();
      const manager = createPollingManager({ fetcher, interval: 1_000 });

      manager.subscribe("notifications", vi.fn());
      await flush();
      expect(fetcher).toHaveBeenCalledTimes(1);

      manager.destroy();

      await vi.advanceTimersByTimeAsync(5_000);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  // ── Data dispatch ──────────────────────────────────────────────

  describe("data dispatch", () => {
    test("delivers typed data to the subscriber", async () => {
      const data = [
        {
          id: "x",
          type: "workspaceInvite",
          status: "pending",
          payload: {},
          createdAt: "2026-01-01",
          senderEmail: "",
          senderName: "",
          workspaceName: undefined,
          projectTitle: undefined,
        },
      ] as SubscriptionResponse["notifications"];
      const fetcher = createMockFetcher({ notifications: data });
      const listener = vi.fn();
      const manager = createPollingManager({ fetcher });

      manager.subscribe("notifications", listener);
      await flush();

      expect(listener).toHaveBeenCalledWith(data);

      manager.destroy();
    });

    test("multiple subscribers on the same topic all receive data", async () => {
      const fetcher = createMockFetcher();
      const listenerA = vi.fn();
      const listenerB = vi.fn();
      const manager = createPollingManager({ fetcher });

      manager.subscribe("notifications", listenerA);
      manager.subscribe("notifications", listenerB);
      await flush();

      expect(listenerA).toHaveBeenCalledWith(mockNotifications);
      expect(listenerB).toHaveBeenCalledWith(mockNotifications);

      manager.destroy();
    });

    test("unsubscribed listener stops receiving data", async () => {
      let call = 0;
      const fetcher = vi.fn(async () => {
        call += 1;
        return {
          notifications: [{ id: String(call) }],
        } as unknown as SubscriptionResponse;
      });
      const listener = vi.fn();
      const manager = createPollingManager({ fetcher, interval: 1_000 });

      // Second subscriber keeps the polling alive after the first unsubscribes.
      const sub = manager.subscribe("notifications", listener);
      manager.subscribe("notifications", vi.fn());
      await flush();
      expect(listener).toHaveBeenCalledTimes(1);

      sub.unsubscribe();

      await vi.advanceTimersByTimeAsync(1_000);
      await flush();
      // The unsubscribed listener must not receive the second value.
      expect(listener).toHaveBeenCalledTimes(1);

      manager.destroy();
    });
  });

  // ── Equality suppression ───────────────────────────────────────

  describe("equality suppression", () => {
    test("skips dispatch when data has not changed", async () => {
      const fetcher = createMockFetcher();
      const listener = vi.fn();
      const manager = createPollingManager({ fetcher, interval: 1_000 });

      manager.subscribe("notifications", listener);
      await flush();
      expect(listener).toHaveBeenCalledTimes(1);

      // Second poll — same data.
      await vi.advanceTimersByTimeAsync(1_000);
      await flush();
      expect(listener).toHaveBeenCalledTimes(1);

      manager.destroy();
    });

    test("dispatches when data changes between polls", async () => {
      let call = 0;
      const fetcher = vi.fn(async () => {
        call += 1;
        return {
          notifications: [{ id: String(call) }],
        } as unknown as SubscriptionResponse;
      });
      const listener = vi.fn();
      const manager = createPollingManager({ fetcher, interval: 1_000 });

      manager.subscribe("notifications", listener);
      await flush();
      expect(listener).toHaveBeenCalledWith([{ id: "1" }]);

      await vi.advanceTimersByTimeAsync(1_000);
      await flush();
      expect(listener).toHaveBeenCalledWith([{ id: "2" }]);

      manager.destroy();
    });
  });

  // ── Topic routing ──────────────────────────────────────────────

  describe("topic routing", () => {
    test("fetcher receives only the active topics", async () => {
      const fetcher = createMockFetcher();
      const manager = createPollingManager({ fetcher });

      manager.subscribe("notifications", vi.fn());
      await flush();

      expect(fetcher).toHaveBeenCalledWith(["notifications"]);

      manager.destroy();
    });

    test("missing topic in response does not call listener", async () => {
      // Server returns an empty object (topic failed server-side).
      const fetcher = createMockFetcher({});
      const listener = vi.fn();
      const manager = createPollingManager({ fetcher });

      manager.subscribe("notifications", listener);
      await flush();

      expect(listener).not.toHaveBeenCalled();

      manager.destroy();
    });
  });

  // ── Refresh ────────────────────────────────────────────────────

  describe("refresh", () => {
    test("triggers an immediate poll", async () => {
      let call = 0;
      const fetcher = vi.fn(async () => {
        call += 1;
        return {
          notifications: [{ id: String(call) }],
        } as unknown as SubscriptionResponse;
      });
      const listener = vi.fn();
      const manager = createPollingManager({ fetcher, interval: 60_000 });

      manager.subscribe("notifications", listener);
      await flush();
      expect(listener).toHaveBeenCalledTimes(1);

      await manager.refresh();
      await flush();
      expect(listener).toHaveBeenCalledTimes(2);

      manager.destroy();
    });

    test("refresh is safe when no subscriptions exist", async () => {
      const fetcher = createMockFetcher();
      const manager = createPollingManager({ fetcher });

      // No subscribers — refresh should resolve without error.
      await expect(manager.refresh()).resolves.toBeUndefined();

      manager.destroy();
    });
  });

  // ── Error handling ─────────────────────────────────────────────

  describe("error handling", () => {
    test("fetcher errors are forwarded to onError", async () => {
      const error = new Error("network down");
      const fetcher = vi.fn(async () => {
        throw error;
      });
      const onError = vi.fn();
      const manager = createPollingManager({ fetcher, onError });

      manager.subscribe("notifications", vi.fn());
      await flush();

      expect(onError).toHaveBeenCalledWith(error);

      manager.destroy();
    });

    test("polling continues after a fetcher error", async () => {
      let calls = 0;
      const fetcher = vi.fn(async () => {
        calls += 1;
        if (calls === 1) {
          throw new Error("transient");
        }
        return { notifications: mockNotifications } as SubscriptionResponse;
      });
      const listener = vi.fn();
      const manager = createPollingManager({
        fetcher,
        onError: vi.fn(),
        interval: 1_000,
      });

      manager.subscribe("notifications", listener);
      await flush(); // first call — throws
      expect(listener).not.toHaveBeenCalled();

      // Advance past backoff — with default jitter the first delay
      // is random(5000, 15000), so advance 16s to guarantee the retry fires.
      await vi.advanceTimersByTimeAsync(16_000);
      await flush();
      expect(listener).toHaveBeenCalledWith(mockNotifications);

      manager.destroy();
    });
  });
});
