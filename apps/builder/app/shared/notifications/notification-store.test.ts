/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { createNotificationStore } from "./notification-store";

// ── Helpers ──────────────────────────────────────────────────────────

type Item = { id: string; message: string };

const item = (id: string, message = `msg-${id}`): Item => ({ id, message });

const createFetchers = () => {
  let countValue = 0;
  let listValue: Item[] = [];

  const fetchCount = vi.fn(async () => countValue);
  const fetchList = vi.fn(async () => listValue);

  return {
    fetchCount,
    fetchList,
    setCount: (n: number) => {
      countValue = n;
    },
    setList: (items: Item[]) => {
      listValue = items;
    },
  };
};

// With fake timers, we need `vi.advanceTimersByTimeAsync` to flush both
// the timer queue and any microtasks (resolved promises) in the right order.
const flush = () => vi.advanceTimersByTimeAsync(0);

// ── Tests ────────────────────────────────────────────────────────────

describe("createNotificationStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── Lifecycle ────────────────────────────────────────────────────

  describe("lifecycle", () => {
    test("starts inactive with zero count and empty items", () => {
      const fetchers = createFetchers();
      const store = createNotificationStore<Item>({ ...fetchers });

      expect(store.$active.get()).toBe(false);
      expect(store.$count.get()).toBe(0);
      expect(store.$items.get()).toEqual([]);
    });

    test("start sets active and triggers an immediate count fetch", async () => {
      const fetchers = createFetchers();
      fetchers.setCount(3);
      const store = createNotificationStore<Item>({ ...fetchers });

      store.start();
      await flush();

      expect(store.$active.get()).toBe(true);
      expect(fetchers.fetchCount).toHaveBeenCalledOnce();
      expect(store.$count.get()).toBe(3);

      store.stop();
    });

    test("start is idempotent — calling twice does not double-poll", async () => {
      const fetchers = createFetchers();
      const store = createNotificationStore<Item>({ ...fetchers });

      store.start();
      store.start();
      await flush();

      expect(fetchers.fetchCount).toHaveBeenCalledOnce();

      store.stop();
    });

    test("stop clears active and prevents further polling", async () => {
      const fetchers = createFetchers();
      const store = createNotificationStore<Item>({
        ...fetchers,
        intervalMs: 1000,
      });

      store.start();
      await flush();
      expect(fetchers.fetchCount).toHaveBeenCalledOnce();

      store.stop();
      expect(store.$active.get()).toBe(false);

      await vi.advanceTimersByTimeAsync(5000);

      // No additional calls after stop
      expect(fetchers.fetchCount).toHaveBeenCalledOnce();
    });

    test("stop is idempotent", () => {
      const fetchers = createFetchers();
      const store = createNotificationStore<Item>({ ...fetchers });

      // Stop before start — no crash
      store.stop();
      store.stop();
      expect(store.$active.get()).toBe(false);
    });
  });

  // ── Polling ──────────────────────────────────────────────────────

  describe("polling", () => {
    test("polls at the configured interval", async () => {
      const fetchers = createFetchers();
      const store = createNotificationStore<Item>({
        ...fetchers,
        intervalMs: 5000,
      });

      store.start();
      await flush();
      expect(fetchers.fetchCount).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(5000);
      expect(fetchers.fetchCount).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(5000);
      expect(fetchers.fetchCount).toHaveBeenCalledTimes(3);

      store.stop();
    });

    test("uses default 30s interval when not specified", async () => {
      const fetchers = createFetchers();
      const store = createNotificationStore<Item>({ ...fetchers });

      store.start();
      await flush();
      expect(fetchers.fetchCount).toHaveBeenCalledTimes(1);

      // 29s — no poll yet
      await vi.advanceTimersByTimeAsync(29_000);
      expect(fetchers.fetchCount).toHaveBeenCalledTimes(1);

      // 30s — poll fires
      await vi.advanceTimersByTimeAsync(1_000);
      expect(fetchers.fetchCount).toHaveBeenCalledTimes(2);

      store.stop();
    });

    test("deduplicates overlapping count fetches", async () => {
      let resolveFirst: ((value: number) => void) | undefined;
      const slowFetchCount = vi.fn(
        () =>
          new Promise<number>((resolve) => {
            resolveFirst = resolve;
          })
      );
      const fetchers = createFetchers();
      const store = createNotificationStore<Item>({
        fetchCount: slowFetchCount,
        fetchList: fetchers.fetchList,
        intervalMs: 100,
      });

      store.start();
      // First call is in-flight
      expect(slowFetchCount).toHaveBeenCalledTimes(1);

      // Interval fires while first is still pending
      await vi.advanceTimersByTimeAsync(100);
      // Should NOT have fired a second call — first still pending
      expect(slowFetchCount).toHaveBeenCalledTimes(1);

      // Resolve the first call
      resolveFirst?.(1);
      await flush();

      // Now the next interval should work
      await vi.advanceTimersByTimeAsync(100);
      expect(slowFetchCount).toHaveBeenCalledTimes(2);

      store.stop();
    });

    test("silently handles fetchCount errors", async () => {
      const fetchers = createFetchers();
      fetchers.setCount(5);
      fetchers.fetchCount.mockRejectedValueOnce(new Error("network error"));

      const store = createNotificationStore<Item>({
        ...fetchers,
        intervalMs: 1000,
      });

      store.start();
      await flush();

      // Count stays at initial value after error
      expect(store.$count.get()).toBe(0);

      // Next poll succeeds
      await vi.advanceTimersByTimeAsync(1000);
      expect(store.$count.get()).toBe(5);

      store.stop();
    });
  });

  // ── onCountChange callback ───────────────────────────────────────

  describe("onCountChange", () => {
    test("fires when count changes", async () => {
      const onCountChange = vi.fn();
      const fetchers = createFetchers();
      fetchers.setCount(3);

      const store = createNotificationStore<Item>({
        ...fetchers,
        onCountChange,
      });

      store.start();
      await flush();

      expect(onCountChange).toHaveBeenCalledWith(3, 0);

      store.stop();
    });

    test("does not fire when count stays the same", async () => {
      const onCountChange = vi.fn();
      const fetchers = createFetchers();
      fetchers.setCount(3);

      const store = createNotificationStore<Item>({
        ...fetchers,
        onCountChange,
        intervalMs: 1000,
      });

      store.start();
      await flush();
      expect(onCountChange).toHaveBeenCalledOnce();

      // Poll again with the same count
      await vi.advanceTimersByTimeAsync(1000);
      expect(onCountChange).toHaveBeenCalledOnce();

      store.stop();
    });

    test("fires on each change with correct prev/next", async () => {
      const onCountChange = vi.fn();
      const fetchers = createFetchers();
      fetchers.setCount(2);

      const store = createNotificationStore<Item>({
        ...fetchers,
        onCountChange,
        intervalMs: 1000,
      });

      store.start();
      await flush();
      expect(onCountChange).toHaveBeenCalledWith(2, 0);

      fetchers.setCount(5);
      await vi.advanceTimersByTimeAsync(1000);
      expect(onCountChange).toHaveBeenCalledWith(5, 2);

      fetchers.setCount(0);
      await vi.advanceTimersByTimeAsync(1000);
      expect(onCountChange).toHaveBeenCalledWith(0, 5);

      store.stop();
    });
  });

  // ── loadList ─────────────────────────────────────────────────────

  describe("loadList", () => {
    test("populates items and syncs count", async () => {
      const fetchers = createFetchers();
      const items = [item("a"), item("b"), item("c")];
      fetchers.setList(items);

      const store = createNotificationStore<Item>({ ...fetchers });

      await store.loadList();

      expect(store.$items.get()).toEqual(items);
      expect(store.$count.get()).toBe(3);
      expect(fetchers.fetchList).toHaveBeenCalledOnce();
    });

    test("deduplicates overlapping list fetches", async () => {
      let resolveFirst: ((value: Item[]) => void) | undefined;
      const slowFetchList = vi.fn(
        () =>
          new Promise<Item[]>((resolve) => {
            resolveFirst = resolve;
          })
      );
      const fetchers = createFetchers();
      const store = createNotificationStore<Item>({
        fetchCount: fetchers.fetchCount,
        fetchList: slowFetchList,
      });

      // Two concurrent calls — second is a no-op
      const p1 = store.loadList();
      store.loadList();

      expect(slowFetchList).toHaveBeenCalledTimes(1);

      resolveFirst?.([item("a")]);
      await p1;

      expect(store.$items.get()).toEqual([item("a")]);
    });

    test("silently handles fetchList errors", async () => {
      const fetchers = createFetchers();
      fetchers.fetchList.mockRejectedValueOnce(new Error("fail"));

      const store = createNotificationStore<Item>({ ...fetchers });
      await store.loadList();

      // Items remain empty, no crash
      expect(store.$items.get()).toEqual([]);
    });

    test("fires onCountChange when list count differs from current", async () => {
      const onCountChange = vi.fn();
      const fetchers = createFetchers();
      fetchers.setCount(5);
      fetchers.setList([item("a"), item("b")]);

      const store = createNotificationStore<Item>({
        ...fetchers,
        onCountChange,
      });

      // Set initial count
      store.start();
      await flush();
      expect(store.$count.get()).toBe(5);

      // loadList syncs count to list length
      await store.loadList();
      expect(store.$count.get()).toBe(2);
      expect(onCountChange).toHaveBeenCalledWith(2, 5);

      store.stop();
    });
  });

  // ── removeItem ───────────────────────────────────────────────────

  describe("removeItem", () => {
    test("removes matching items and decrements count", async () => {
      const fetchers = createFetchers();
      fetchers.setList([item("a"), item("b"), item("c")]);

      const store = createNotificationStore<Item>({ ...fetchers });
      await store.loadList();
      expect(store.$count.get()).toBe(3);

      store.removeItem((i) => i.id === "b");

      expect(store.$items.get()).toEqual([item("a"), item("c")]);
      expect(store.$count.get()).toBe(2);
    });

    test("does nothing when no items match", async () => {
      const onCountChange = vi.fn();
      const fetchers = createFetchers();
      fetchers.setList([item("a")]);

      const store = createNotificationStore<Item>({
        ...fetchers,
        onCountChange,
      });
      await store.loadList();
      onCountChange.mockClear();

      store.removeItem((i) => i.id === "nonexistent");

      expect(store.$items.get()).toEqual([item("a")]);
      expect(onCountChange).not.toHaveBeenCalled();
    });

    test("fires onCountChange on removal", async () => {
      const onCountChange = vi.fn();
      const fetchers = createFetchers();
      fetchers.setList([item("a"), item("b")]);

      const store = createNotificationStore<Item>({
        ...fetchers,
        onCountChange,
      });
      await store.loadList();
      onCountChange.mockClear();

      store.removeItem((i) => i.id === "a");

      expect(onCountChange).toHaveBeenCalledWith(1, 2);
    });

    test("count does not go below zero", () => {
      const fetchers = createFetchers();
      const store = createNotificationStore<Item>({ ...fetchers });

      // Items empty, count at 0 — removal is a no-op
      store.removeItem(() => true);
      expect(store.$count.get()).toBe(0);
    });

    test("removes multiple matching items at once", async () => {
      const fetchers = createFetchers();
      fetchers.setList([item("a"), item("b"), item("c")]);

      const store = createNotificationStore<Item>({ ...fetchers });
      await store.loadList();

      store.removeItem((i) => i.id === "a" || i.id === "c");

      expect(store.$items.get()).toEqual([item("b")]);
      expect(store.$count.get()).toBe(1);
    });
  });

  // ── refresh ──────────────────────────────────────────────────────

  describe("refresh", () => {
    test("triggers an immediate count fetch", async () => {
      const fetchers = createFetchers();
      fetchers.setCount(7);

      const store = createNotificationStore<Item>({ ...fetchers });
      await store.refresh();

      expect(fetchers.fetchCount).toHaveBeenCalledOnce();
      expect(store.$count.get()).toBe(7);
    });
  });

  // ── Visibility handling ──────────────────────────────────────────

  describe("visibility", () => {
    test("pauses polling when tab is hidden", async () => {
      const fetchers = createFetchers();
      const store = createNotificationStore<Item>({
        ...fetchers,
        intervalMs: 1000,
      });

      store.start();
      await flush();
      expect(fetchers.fetchCount).toHaveBeenCalledTimes(1);

      // Simulate tab hidden
      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));

      // Advance past several intervals — no polls
      await vi.advanceTimersByTimeAsync(5000);
      expect(fetchers.fetchCount).toHaveBeenCalledTimes(1);

      store.stop();

      // Restore
      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
        configurable: true,
      });
    });

    test("resumes polling and fetches immediately when tab becomes visible", async () => {
      const fetchers = createFetchers();
      const store = createNotificationStore<Item>({
        ...fetchers,
        intervalMs: 1000,
      });

      store.start();
      await flush();
      expect(fetchers.fetchCount).toHaveBeenCalledTimes(1);

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

      // Immediate fetch on re-focus
      expect(fetchers.fetchCount).toHaveBeenCalledTimes(2);

      // Interval resumes
      await vi.advanceTimersByTimeAsync(1000);
      expect(fetchers.fetchCount).toHaveBeenCalledTimes(3);

      store.stop();
    });

    test("stop removes the visibility listener", async () => {
      const removeSpy = vi.spyOn(document, "removeEventListener");
      const fetchers = createFetchers();
      const store = createNotificationStore<Item>({ ...fetchers });

      store.start();
      await flush();

      store.stop();

      expect(removeSpy).toHaveBeenCalledWith(
        "visibilitychange",
        expect.any(Function)
      );
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────

  describe("edge cases", () => {
    test("can restart after stop", async () => {
      const fetchers = createFetchers();
      fetchers.setCount(1);

      const store = createNotificationStore<Item>({
        ...fetchers,
        intervalMs: 1000,
      });

      store.start();
      await flush();
      expect(store.$count.get()).toBe(1);

      store.stop();

      fetchers.setCount(10);
      store.start();
      await flush();
      expect(store.$count.get()).toBe(10);

      store.stop();
    });

    test("multiple stores are independent", async () => {
      const fetchers1 = createFetchers();
      fetchers1.setCount(3);

      const fetchers2 = createFetchers();
      fetchers2.setCount(7);

      const store1 = createNotificationStore<Item>({ ...fetchers1 });
      const store2 = createNotificationStore<Item>({ ...fetchers2 });

      store1.start();
      store2.start();
      await flush();

      expect(store1.$count.get()).toBe(3);
      expect(store2.$count.get()).toBe(7);

      store1.stop();
      store2.stop();
    });

    test("loadList can be called without start", async () => {
      const fetchers = createFetchers();
      fetchers.setList([item("x")]);

      const store = createNotificationStore<Item>({ ...fetchers });
      await store.loadList();

      expect(store.$items.get()).toEqual([item("x")]);
      expect(store.$active.get()).toBe(false);
    });

    test("refresh can be called without start", async () => {
      const fetchers = createFetchers();
      fetchers.setCount(42);

      const store = createNotificationStore<Item>({ ...fetchers });
      await store.refresh();

      expect(store.$count.get()).toBe(42);
      expect(store.$active.get()).toBe(false);
    });
  });
});
