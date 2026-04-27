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

  test("removes stale callbacks after timeout", () => {
    vi.useFakeTimers();
    const store = createTransactionCompletionStore();

    store.onTransactionComplete("tx-1", vi.fn());
    expect(store.callbacks.has("tx-1")).toBe(true);

    vi.advanceTimersByTime(60_000);
    expect(store.callbacks.has("tx-1")).toBe(false);

    vi.useRealTimers();
  });
});
