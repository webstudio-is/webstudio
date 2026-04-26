import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ApplyMessage } from "./protocol";
import {
  ACK_TIMEOUT_MS,
  FAST_RETRY_MS,
  createRealtimeRetryTracker,
} from "./realtime-retry-tracker";

const makeApply = (overrides: Partial<ApplyMessage> = {}): ApplyMessage => ({
  type: "apply",
  transactionId: "tx-1",
  transaction: { id: "tx-1", object: "server", payload: [] },
  clientId: "client-1",
  actorId: "actor-1",
  clientSeq: 1,
  ...overrides,
});

const createBackoff = (delay = 5_000) => {
  return vi.fn(() => ({
    next: vi.fn(() => delay),
    reset: vi.fn(),
  }));
};

describe("createRealtimeRetryTracker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("retries the exact same apply when durable ack does not arrive", async () => {
    const sendApply = vi.fn();
    const apply = makeApply();
    const tracker = createRealtimeRetryTracker({
      createBackoff: createBackoff(),
      sendApply,
    });

    tracker.track(apply);
    tracker.handleBroadcast({
      type: "broadcast",
      transaction: apply.transaction,
      originClientId: "client-1",
      seq: 7,
      actorId: "actor-1",
      clientSeq: 1,
      relayTs: 10,
    });

    expect(sendApply).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(ACK_TIMEOUT_MS);
    expect(sendApply).toHaveBeenCalledTimes(2);
    expect(sendApply).toHaveBeenLastCalledWith(apply);

    await vi.advanceTimersByTimeAsync(FAST_RETRY_MS);
    expect(sendApply).toHaveBeenCalledTimes(3);
    expect(sendApply).toHaveBeenLastCalledWith(apply);
  });

  test("clears pending state when ack reaches the pending sequence", async () => {
    const sendApply = vi.fn();
    const onDurable = vi.fn();
    const apply = makeApply();
    const tracker = createRealtimeRetryTracker({
      createBackoff: createBackoff(),
      onDurable,
      sendApply,
    });

    tracker.track(apply);
    tracker.handleBroadcast({
      type: "broadcast",
      transaction: apply.transaction,
      originClientId: "client-1",
      seq: 7,
      actorId: "actor-1",
      clientSeq: 1,
      relayTs: 10,
    });
    tracker.handleAck({ type: "ack", seq: 7, version: 4 });

    expect(onDurable).toHaveBeenCalledWith({
      message: apply,
      seq: 7,
      version: 4,
    });
    expect(tracker.getPendingCount()).toBe(0);

    await vi.advanceTimersByTimeAsync(ACK_TIMEOUT_MS);
    expect(sendApply).toHaveBeenCalledTimes(1);
  });

  test("ignores older ack versions after a newer ack was seen", () => {
    const sendApply = vi.fn();
    const onDurable = vi.fn();
    const apply = makeApply({ transactionId: "tx-2", clientSeq: 2 });
    const tracker = createRealtimeRetryTracker({
      createBackoff: createBackoff(),
      onDurable,
      sendApply,
    });

    tracker.handleAck({ type: "ack", seq: 10, version: 12 });
    tracker.handleAck({ type: "ack", seq: 9, version: 11 });
    tracker.track(apply);
    tracker.handleBroadcast({
      type: "broadcast",
      transaction: apply.transaction,
      originClientId: "client-1",
      seq: 10,
      actorId: "actor-1",
      clientSeq: 2,
      relayTs: 10,
    });

    expect(onDurable).toHaveBeenCalledWith({
      message: apply,
      seq: 10,
      version: 12,
    });
  });

  test("does not clear pending state on settled without a durable ack", async () => {
    const sendApply = vi.fn();
    const onDurable = vi.fn();
    const apply = makeApply();
    const tracker = createRealtimeRetryTracker({
      ackTimeoutMs: 100,
      createBackoff: createBackoff(),
      onDurable,
      sendApply,
    });

    tracker.track(apply);
    tracker.handleApplied({
      type: "applied",
      transactionId: "tx-1",
      seq: 7,
      status: "settled",
    });

    expect(tracker.getPendingCount()).toBe(1);
    expect(onDurable).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(100);
    expect(sendApply).toHaveBeenCalledTimes(2);

    tracker.handleAck({ type: "ack", seq: 7, version: 4 });
    expect(onDurable).toHaveBeenCalledWith({
      message: apply,
      seq: 7,
      version: 4,
    });
    expect(tracker.getPendingCount()).toBe(0);
  });

  test("drops pending state when worker drops an apply", () => {
    const sendApply = vi.fn();
    const onDropped = vi.fn();
    const apply = makeApply();
    const tracker = createRealtimeRetryTracker({
      createBackoff: createBackoff(),
      onDropped,
      sendApply,
    });

    tracker.track(apply);
    tracker.handleApplied({
      type: "applied",
      transactionId: "tx-1",
      seq: 0,
      status: "dropped",
    });

    expect(onDropped).toHaveBeenCalledWith({
      message: apply,
      seq: 0,
      status: "dropped",
    });
    expect(tracker.getPendingCount()).toBe(0);
  });

  test("uses injected backoff after fast retries are exhausted", async () => {
    const sendApply = vi.fn();
    const onUserMessage = vi.fn();
    const apply = makeApply();
    const backoffFactory = createBackoff(9_000);
    const tracker = createRealtimeRetryTracker({
      ackTimeoutMs: 100,
      createBackoff: backoffFactory,
      fastRetryMs: 200,
      maxFastRetries: 1,
      onUserMessage,
      sendApply,
    });

    tracker.track(apply);
    tracker.handleBroadcast({
      type: "broadcast",
      transaction: apply.transaction,
      originClientId: "client-1",
      seq: 7,
      actorId: "actor-1",
      clientSeq: 1,
      relayTs: 10,
    });

    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(200);

    expect(sendApply).toHaveBeenCalledTimes(3);
    expect(backoffFactory).toHaveBeenCalledTimes(1);
    expect(onUserMessage).toHaveBeenCalledWith(
      "Changes are taking longer than expected to save. Retrying in 9 seconds."
    );
  });

  test("respects rate-limit retryAfterMs before resending", async () => {
    const sendApply = vi.fn();
    const onUserMessage = vi.fn();
    const apply = makeApply();
    const tracker = createRealtimeRetryTracker({
      createBackoff: createBackoff(),
      fastRetryMs: 2_000,
      onUserMessage,
      sendApply,
    });

    tracker.track(apply);
    tracker.handleErrorMessage({
      type: "error",
      code: "rate_limited",
      message: "Slow down",
      transactionId: "tx-1",
      retryAfterMs: 3_000,
    });

    expect(onUserMessage).toHaveBeenCalledWith("Slow down");

    await vi.advanceTimersByTimeAsync(2_999);
    expect(sendApply).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(sendApply).toHaveBeenCalledTimes(2);
    expect(sendApply).toHaveBeenLastCalledWith(apply);
  });

  test("resends pending operations on reconnect without owning socket backoff", () => {
    const sendApply = vi.fn();
    const onRetry = vi.fn();
    const apply = makeApply();
    const tracker = createRealtimeRetryTracker({
      createBackoff: createBackoff(),
      onRetry,
      sendApply,
    });

    tracker.track(apply);
    tracker.handleReconnect();

    expect(sendApply).toHaveBeenCalledTimes(2);
    expect(sendApply).toHaveBeenLastCalledWith(apply);
    expect(onRetry).toHaveBeenCalledWith({
      message: apply,
      reason: "reconnect",
      retryInMs: 0,
    });
  });

  test("stops retrying after reload", async () => {
    const sendApply = vi.fn();
    const onReload = vi.fn();
    const apply = makeApply();
    const tracker = createRealtimeRetryTracker({
      ackTimeoutMs: 100,
      createBackoff: createBackoff(),
      onReload,
      sendApply,
    });

    tracker.track(apply);
    tracker.handleBroadcast({
      type: "broadcast",
      transaction: apply.transaction,
      originClientId: "client-1",
      seq: 7,
      actorId: "actor-1",
      clientSeq: 1,
      relayTs: 10,
    });
    tracker.handleReload({ type: "reload", reason: "persistence_error" });

    expect(onReload).toHaveBeenCalledWith({
      type: "reload",
      reason: "persistence_error",
    });
    expect(tracker.getPendingCount()).toBe(0);

    await vi.advanceTimersByTimeAsync(100);
    expect(sendApply).toHaveBeenCalledTimes(1);
  });
});
