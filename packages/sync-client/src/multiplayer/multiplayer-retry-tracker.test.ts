import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ApplyMessage } from "@webstudio-is/multiplayer-protocol";
import {
  ACK_TIMEOUT_MS,
  FAST_RETRY_MS,
  createMultiplayerRetryTracker,
} from "./multiplayer-retry-tracker";

const makeApply = (overrides: Partial<ApplyMessage> = {}): ApplyMessage => ({
  type: "apply",
  transactionId: "tx-1",
  transaction: { id: "tx-1", object: "server", payload: [] },
  clientId: "client-1",
  actorId: "actor-1",
  clientSeq: 1,
  ...overrides,
});

describe("createMultiplayerRetryTracker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  test("retries the exact same apply when durable ack does not arrive", async () => {
    const sendApply = vi.fn();
    const apply = makeApply();
    const tracker = createMultiplayerRetryTracker({
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
    const tracker = createMultiplayerRetryTracker({
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
    const tracker = createMultiplayerRetryTracker({
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
    const tracker = createMultiplayerRetryTracker({
      ackTimeoutMs: 100,
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
    const tracker = createMultiplayerRetryTracker({
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

  test("drops pending state when persistence rejects or fails an apply", () => {
    const sendApply = vi.fn();
    const onDropped = vi.fn();
    const onUserMessage = vi.fn();
    const tracker = createMultiplayerRetryTracker({
      onDropped,
      onUserMessage,
      sendApply,
    });
    const rejected = makeApply();
    const failed = makeApply({ transactionId: "tx-2", clientSeq: 2 });

    tracker.track(rejected);
    tracker.track(failed);
    tracker.handleApplied({
      type: "applied",
      transactionId: "tx-1",
      seq: 1,
      status: "rejected",
      errors: "No permission",
    });
    tracker.handleApplied({
      type: "applied",
      transactionId: "tx-2",
      seq: 2,
      status: "failed",
      errors: "Patch failed",
    });

    expect(onDropped).toHaveBeenCalledWith({
      message: rejected,
      seq: 1,
      status: "rejected",
      errors: "No permission",
    });
    expect(onDropped).toHaveBeenCalledWith({
      message: failed,
      seq: 2,
      status: "failed",
      errors: "Patch failed",
    });
    expect(onUserMessage).toHaveBeenCalledWith("No permission");
    expect(onUserMessage).toHaveBeenCalledWith("Patch failed");
    expect(tracker.getPendingCount()).toBe(0);
  });

  test("uses backoff after fast retries are exhausted", async () => {
    const sendApply = vi.fn();
    const onUserMessage = vi.fn();
    const apply = makeApply();
    vi.spyOn(Math, "random").mockReturnValue(0.4);
    const tracker = createMultiplayerRetryTracker({
      ackTimeoutMs: 100,
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
    expect(onUserMessage).toHaveBeenCalledWith(
      "Changes are taking longer than expected to save. Retrying in 9 seconds."
    );
  });

  test("respects rate-limit retryAfterMs before resending", async () => {
    const sendApply = vi.fn();
    const onUserMessage = vi.fn();
    const apply = makeApply();
    const tracker = createMultiplayerRetryTracker({
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
    const tracker = createMultiplayerRetryTracker({
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
    const tracker = createMultiplayerRetryTracker({
      ackTimeoutMs: 100,
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
