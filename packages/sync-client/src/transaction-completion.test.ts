import { describe, expect, test, vi } from "vitest";
import { createTransactionCompletionStore } from "./transaction-completion";

describe("createTransactionCompletionStore", () => {
  test("calls completion callbacks and clears them", () => {
    const store = createTransactionCompletionStore();
    const callback = vi.fn();

    store.onTransactionComplete("tx-1", callback);
    store.completeTransaction("tx-1", true);
    store.completeTransaction("tx-1", true);

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith(true);
    expect(store.callbacks.has("tx-1")).toBe(false);
  });

  test("calls next-transaction callback only on success", () => {
    const store = createTransactionCompletionStore();
    const callback = vi.fn();

    store.onNextTransactionComplete(callback);
    store.$lastTransactionId.set("tx-1");
    store.completeTransaction("tx-1", false);

    expect(callback).not.toHaveBeenCalled();

    store.onNextTransactionComplete(callback);
    store.$lastTransactionId.set("tx-2");
    store.completeTransaction("tx-2", true);

    expect(callback).toHaveBeenCalledOnce();
  });

  test("subscribes only to the current transaction when one exists", () => {
    const store = createTransactionCompletionStore();
    const callback = vi.fn();

    store.$lastTransactionId.set("tx-current");
    store.onNextTransactionComplete(callback);
    store.$lastTransactionId.set("tx-next");

    store.completeTransaction("tx-current", true);
    expect(callback).toHaveBeenCalledOnce();

    store.completeTransaction("tx-next", true);
    expect(callback).toHaveBeenCalledOnce();
  });

  test("removes stale callbacks after timeout", () => {
    vi.useFakeTimers();
    const store = createTransactionCompletionStore();

    store.onTransactionComplete("tx-1", vi.fn());
    expect(store.callbacks.has("tx-1")).toBe(true);

    vi.advanceTimersByTime(60_000);
    expect(store.callbacks.has("tx-1")).toBe(false);

    vi.useRealTimers();
  });

  test("reports a failed next transaction", async () => {
    const store = createTransactionCompletionStore();

    const completion = store.waitForNextTransactionComplete();
    store.$lastTransactionId.set("tx-failed");
    store.completeTransaction("tx-failed", false);

    await expect(completion).resolves.toBe("failure");
  });

  test("reports when the next transaction times out", async () => {
    vi.useFakeTimers();
    const store = createTransactionCompletionStore({ timeoutMs: 100 });

    const completion = store.waitForNextTransactionComplete();
    await vi.advanceTimersByTimeAsync(100);

    await expect(completion).resolves.toBe("timeout");
    vi.useRealTimers();
  });

  test("finds a transaction that completed after an earlier wait timed out", async () => {
    vi.useFakeTimers();
    const store = createTransactionCompletionStore({ timeoutMs: 100 });

    const firstWait = store.waitForTransactionComplete("tx-late");
    await vi.advanceTimersByTimeAsync(100);
    await expect(firstWait).resolves.toBe("timeout");

    store.completeTransaction("tx-late", true);
    await vi.advanceTimersByTimeAsync(100);
    const retry = store.waitForTransactionComplete("tx-late");
    await vi.advanceTimersByTimeAsync(100);
    await expect(retry).resolves.toBe("success");
    vi.useRealTimers();
  });

  test("keeps a newer waiter when an older waiter times out", async () => {
    vi.useFakeTimers();
    const store = createTransactionCompletionStore({ timeoutMs: 100 });

    const olderWait = store.waitForTransactionComplete("tx-shared");
    await vi.advanceTimersByTimeAsync(50);
    const newerWait = store.waitForTransactionComplete("tx-shared");

    await vi.advanceTimersByTimeAsync(50);
    await expect(olderWait).resolves.toBe("timeout");
    store.completeTransaction("tx-shared", true);
    await vi.advanceTimersByTimeAsync(50);

    await expect(newerWait).resolves.toBe("success");
    vi.useRealTimers();
  });
});
