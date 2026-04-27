import type {
  AckMessage,
  AppliedMessage,
  ApplyMessage,
  BroadcastMessage,
  ErrorMessage,
  ReloadMessage,
} from "@webstudio-is/multiplayer-protocol";
import { createBackoff, type Backoff } from "../backoff";

export const ACK_TIMEOUT_MS = 15_000;
export const FAST_RETRY_MS = 2_000;
export const MAX_FAST_RETRIES = 3;
export const syncDelayedMessage =
  "Changes are taking longer than expected to save. Retrying in X seconds.";

type PendingApply = {
  backoff: Backoff;
  message: ApplyMessage;
  retryTimer: ReturnType<typeof setTimeout> | undefined;
  seq: number | undefined;
  timeoutRetries: number;
};

export type RetryReason =
  | "missing_ack"
  | "rate_limited"
  | "persistence_backlog_full"
  | "reconnect";

export type MultiplayerRetryTrackerOptions = {
  sendApply: (message: ApplyMessage) => void;
  onDurable?: (event: {
    message: ApplyMessage;
    seq: number;
    version: number;
  }) => void;
  onDropped?: (event: {
    message: ApplyMessage;
    seq: number;
    status: AppliedMessage["status"];
    errors?: string;
  }) => void;
  onRetry?: (event: {
    message: ApplyMessage;
    reason: RetryReason;
    retryInMs: number;
  }) => void;
  onUserMessage?: (message: string) => void;
  onReload?: (message: ReloadMessage) => void;
  ackTimeoutMs?: number;
  fastRetryMs?: number;
  maxFastRetries?: number;
  setTimeout?: typeof setTimeout;
  clearTimeout?: typeof clearTimeout;
};

export const createMultiplayerRetryTracker = ({
  ackTimeoutMs = ACK_TIMEOUT_MS,
  clearTimeout: clearTimer = globalThis.clearTimeout,
  fastRetryMs = FAST_RETRY_MS,
  maxFastRetries = MAX_FAST_RETRIES,
  onDropped,
  onDurable,
  onReload,
  onRetry,
  onUserMessage,
  sendApply,
  setTimeout: setTimer = globalThis.setTimeout,
}: MultiplayerRetryTrackerOptions) => {
  const pendingByTransactionId = new Map<string, PendingApply>();
  const pendingByOperationKey = new Map<string, PendingApply>();
  let lastAckSeq = 0;
  let lastAckVersion = 0;
  let stopped = false;

  const operationKey = (message: Pick<ApplyMessage, "actorId" | "clientSeq">) =>
    `${message.actorId}:${message.clientSeq}`;

  const clearRetryTimer = (entry: PendingApply) => {
    if (entry.retryTimer !== undefined) {
      clearTimer(entry.retryTimer);
      entry.retryTimer = undefined;
    }
  };

  const deletePending = (entry: PendingApply) => {
    clearRetryTimer(entry);
    pendingByTransactionId.delete(entry.message.transactionId);
    pendingByOperationKey.delete(operationKey(entry.message));
  };

  const markDurable = (entry: PendingApply, version: number) => {
    if (entry.seq === undefined) {
      return;
    }
    deletePending(entry);
    onDurable?.({ message: entry.message, seq: entry.seq, version });
  };

  const maybeMarkDurable = (entry: PendingApply) => {
    if (entry.seq !== undefined && lastAckSeq >= entry.seq) {
      markDurable(entry, lastAckVersion);
      return true;
    }
    return false;
  };

  const getNextRetryDelay = (entry: PendingApply) => {
    entry.timeoutRetries += 1;
    if (entry.timeoutRetries <= maxFastRetries) {
      return fastRetryMs;
    }
    const delay = entry.backoff.next();
    onUserMessage?.(
      syncDelayedMessage.replace("X", String(Math.round(delay / 1000)))
    );
    return delay;
  };

  const scheduleRetry = (
    entry: PendingApply,
    delay: number,
    reason: RetryReason
  ) => {
    if (stopped) {
      return;
    }
    clearRetryTimer(entry);
    onRetry?.({ message: entry.message, reason, retryInMs: delay });
    entry.retryTimer = setTimer(() => {
      entry.retryTimer = undefined;
      if (
        stopped ||
        pendingByTransactionId.has(entry.message.transactionId) === false
      ) {
        return;
      }
      sendApply(entry.message);
      if (entry.seq !== undefined) {
        scheduleRetry(entry, getNextRetryDelay(entry), "missing_ack");
      }
    }, delay);
  };

  const scheduleAckTimeout = (entry: PendingApply, delay = ackTimeoutMs) => {
    scheduleRetry(entry, delay, "missing_ack");
  };

  const track = (message: ApplyMessage) => {
    if (stopped) {
      return;
    }

    const existing = pendingByTransactionId.get(message.transactionId);
    if (existing !== undefined) {
      sendApply(existing.message);
      return;
    }

    const entry: PendingApply = {
      backoff: createBackoff(),
      message,
      retryTimer: undefined,
      seq: undefined,
      timeoutRetries: 0,
    };
    pendingByTransactionId.set(message.transactionId, entry);
    pendingByOperationKey.set(operationKey(message), entry);
    sendApply(message);
  };

  const handleBroadcast = (message: BroadcastMessage) => {
    const entry = pendingByOperationKey.get(operationKey(message));
    if (entry === undefined) {
      return false;
    }

    entry.seq = message.seq;
    entry.timeoutRetries = 0;
    entry.backoff.reset();

    if (maybeMarkDurable(entry)) {
      return true;
    }

    scheduleAckTimeout(entry);
    return true;
  };

  const handleAck = (message: AckMessage) => {
    if (message.seq >= lastAckSeq) {
      lastAckSeq = message.seq;
      lastAckVersion = message.version;
    }

    for (const entry of Array.from(pendingByTransactionId.values())) {
      maybeMarkDurable(entry);
    }
  };

  const handleApplied = (message: AppliedMessage) => {
    const entry = pendingByTransactionId.get(message.transactionId);
    if (entry === undefined) {
      return;
    }

    if (message.status === "dropped") {
      deletePending(entry);
      onDropped?.({
        message: entry.message,
        seq: message.seq,
        status: message.status,
      });
      return;
    }

    if (message.status === "rejected" || message.status === "failed") {
      deletePending(entry);
      onUserMessage?.(
        message.errors ??
          (message.status === "rejected"
            ? "You don't have permission to save this change."
            : "This change could not be saved.")
      );
      onDropped?.({
        message: entry.message,
        seq: message.seq,
        status: message.status,
        errors: message.errors,
      });
      return;
    }

    entry.seq = message.seq;
    if (maybeMarkDurable(entry)) {
      return;
    }
    scheduleAckTimeout(entry);
  };

  const handleErrorMessage = (message: ErrorMessage) => {
    onUserMessage?.(message.message);
    const transactionId = message.transactionId;
    if (transactionId === undefined) {
      return;
    }

    const entry = pendingByTransactionId.get(transactionId);
    if (entry === undefined) {
      return;
    }

    const delay = Math.max(message.retryAfterMs ?? 0, getNextRetryDelay(entry));
    scheduleRetry(entry, delay, message.code);
  };

  const handleReload = (message: ReloadMessage) => {
    stopped = true;
    for (const entry of pendingByTransactionId.values()) {
      clearRetryTimer(entry);
    }
    pendingByTransactionId.clear();
    pendingByOperationKey.clear();
    onReload?.(message);
  };

  const handleReconnect = () => {
    if (stopped) {
      return;
    }
    for (const entry of pendingByTransactionId.values()) {
      sendApply(entry.message);
      onRetry?.({ message: entry.message, reason: "reconnect", retryInMs: 0 });
    }
  };

  const destroy = () => {
    stopped = true;
    for (const entry of pendingByTransactionId.values()) {
      clearRetryTimer(entry);
    }
    pendingByTransactionId.clear();
    pendingByOperationKey.clear();
  };

  return {
    destroy,
    getPendingCount: () => pendingByTransactionId.size,
    handleAck,
    handleApplied,
    handleBroadcast,
    handleErrorMessage,
    handleReconnect,
    handleReload,
    track,
  };
};
