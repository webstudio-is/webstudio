import { rejectGuardedPageCopy } from "./page-copy-guards";
import { reportTransactionCompletion } from "./project-queue";
import { draftPersistence } from "./draft-persistence";
import { createNanoEvents } from "nanoevents";
import {
  $collaborators,
  $syncStatus,
  createMultiplayerRetryTracker,
  type ApplyMessage,
  type BroadcastMessage,
  type Transaction,
  type ErrorMessage,
  type PresenceMessage,
  type ReloadMessage,
  type SyncEmitter,
  type SyncMessage,
} from "@webstudio-is/sync-client";
import {
  createWebSocketSyncEmitter,
  type WebSocketEmitterOptions,
  type WebSocketSyncEmitter,
} from "@webstudio-is/sync-client/websocket";
import { $awareness, type Awareness } from "~/shared/awareness";

type MultiplayerSyncEmitterOptions = {
  projectId?: string;
  clientId: string;
  getAuthToken?: () => Promise<string | undefined>;
  url: string;
  onReload?: (
    message: ReloadMessage,
    signal: AbortSignal
  ) => void | number | Promise<void | number>;
  onUserMessage?: (message: string) => void;
  refreshPageCopyCatalog?: (
    catalog: NonNullable<
      NonNullable<Transaction["pageCopyGuard"]>["stagedCatalog"]
    >,
    signal: AbortSignal
  ) => Promise<void>;
  createTransport?: (options: WebSocketEmitterOptions) => WebSocketSyncEmitter;
};

type PendingBroadcast = {
  message: BroadcastMessage;
  ackVersion?: number;
};

export type MultiplayerSyncEmitter = SyncEmitter & {
  close(): void;
  connect(buildId: string): void;
  sendPresence(payload: Awareness): void;
};

const updateCollaborator = (clientId: string, payload: unknown) => {
  const next = new Map($collaborators.get());
  const previous = next.get(clientId);
  next.set(clientId, {
    ...previous,
    ...(typeof payload === "object" && payload !== null ? payload : {}),
    lastSeen: Date.now(),
  });
  $collaborators.set(next);
};

export const startMultiplayerPresenceSync = (
  emitter: Pick<MultiplayerSyncEmitter, "sendPresence">
) => {
  return $awareness.listen((awareness) => {
    emitter.sendPresence(awareness);
  });
};

export const createMultiplayerSyncEmitter = ({
  projectId,
  clientId,
  getAuthToken,
  url,
  onReload,
  onUserMessage,
  refreshPageCopyCatalog,
  createTransport = createWebSocketSyncEmitter,
}: MultiplayerSyncEmitterOptions): MultiplayerSyncEmitter => {
  const events = createNanoEvents<{
    message: (message: SyncMessage) => void;
  }>();
  let clientSeq = 0;
  let durableSeq = 0;
  let durableVersion = 0;
  let installedSnapshotVersion: number | undefined;
  const remoteTransactions = new Map<string, number>();
  let tracker: ReturnType<typeof createMultiplayerRetryTracker>;
  let ws: WebSocketSyncEmitter | undefined;

  const pendingBroadcasts: PendingBroadcast[] = [];
  let broadcastGeneration = 0;
  let broadcastGenerationController = new AbortController();
  let isReloading = false;
  let flushingBroadcasts = false;
  let retryBroadcasts: ReturnType<typeof setTimeout> | undefined;
  let retryReload: ReturnType<typeof setTimeout> | undefined;
  let reloadFailureReported = false;
  let unsubscribeReverts: (() => void) | undefined;
  const clearBroadcastRetry = () => {
    clearTimeout(retryBroadcasts);
    retryBroadcasts = undefined;
  };

  const flushBroadcasts = async () => {
    if (flushingBroadcasts) {
      return;
    }
    clearBroadcastRetry();
    flushingBroadcasts = true;
    const generation = broadcastGeneration;
    try {
      while (pendingBroadcasts.length > 0) {
        if (isReloading) {
          return;
        }
        const pending = pendingBroadcasts[0];
        const message = pending.message;
        const guard = message.transaction.pageCopyGuard;
        if (
          installedSnapshotVersion !== undefined &&
          (pending.ackVersion === undefined ||
            pending.ackVersion <= installedSnapshotVersion)
        ) {
          if (pending.ackVersion === undefined) {
            return;
          }
          pendingBroadcasts.shift();
          continue;
        }
        if (guard !== undefined && message.seq > durableSeq) {
          return;
        }
        if (guard?.stagedCatalog !== undefined) {
          await refreshPageCopyCatalog?.(
            guard.stagedCatalog,
            broadcastGenerationController.signal
          );
          if (generation !== broadcastGeneration) {
            return;
          }
          if (pendingBroadcasts[0] !== pending) {
            continue;
          }
        }
        pendingBroadcasts.shift();
        events.emit("message", {
          type: "apply",
          clientId: message.originClientId,
          transaction: message.transaction,
        });
      }
    } catch {
      if (generation === broadcastGeneration) {
        // Catalog refresh is a read. Preserve relay ordering and retry it
        // independently of pending saves or later local edits.
        retryBroadcasts = setTimeout(() => void flushBroadcasts(), 1_000);
      }
    } finally {
      flushingBroadcasts = false;
      if (generation !== broadcastGeneration && pendingBroadcasts.length > 0) {
        void flushBroadcasts();
      }
    }
  };

  const updateUnsaved = () => {
    $syncStatus.set(
      tracker.getPendingCount() > 0 ? { status: "syncing" } : { status: "idle" }
    );
  };

  const reloadAndResume = (
    message: ReloadMessage,
    generation: number,
    signal: AbortSignal
  ) => {
    void Promise.resolve()
      .then(() => onReload?.(message, signal))
      .then((snapshotVersion) => {
        if (generation !== broadcastGeneration) {
          return;
        }
        if (snapshotVersion !== undefined) {
          for (let index = pendingBroadcasts.length - 1; index >= 0; index--) {
            const pending = pendingBroadcasts[index];
            if (
              pending.ackVersion !== undefined &&
              pending.ackVersion <= snapshotVersion
            ) {
              pendingBroadcasts.splice(index, 1);
            }
          }
          installedSnapshotVersion =
            durableVersion > snapshotVersion ? undefined : snapshotVersion;
        } else {
          installedSnapshotVersion = undefined;
        }
        isReloading = false;
        void flushBroadcasts();
      })
      .catch((error) => {
        if (generation === broadcastGeneration && !signal.aborted) {
          console.error("[builder-sync] multiplayer reload failed:", error);
          if (!reloadFailureReported) {
            reloadFailureReported = true;
            onUserMessage?.(
              error instanceof Error
                ? error.message
                : "Multiplayer reload failed"
            );
          }
          retryReload = setTimeout(() => {
            retryReload = undefined;
            reloadAndResume(message, generation, signal);
          }, 1_000);
        }
      });
  };

  const sendApply = (message: ApplyMessage) => {
    if (ws === undefined) {
      return;
    }
    ws.sendToRelay(message);
  };

  const connect = (buildId: string) => {
    if (ws !== undefined) {
      return;
    }
    ws = createTransport({
      buildId,
      clientId,
      getAuthToken,
      url,
      onAck: (seq, version) => {
        durableSeq = Math.max(durableSeq, seq);
        durableVersion = Math.max(durableVersion, version);
        for (const pending of pendingBroadcasts) {
          if (pending.ackVersion === undefined && pending.message.seq <= seq) {
            pending.ackVersion = version;
          }
        }
        if (installedSnapshotVersion !== undefined) {
          for (let index = pendingBroadcasts.length - 1; index >= 0; index--) {
            const pending = pendingBroadcasts[index];
            if (
              pending.ackVersion !== undefined &&
              pending.ackVersion <= installedSnapshotVersion
            ) {
              pendingBroadcasts.splice(index, 1);
            }
          }
          if (version > installedSnapshotVersion) {
            installedSnapshotVersion = undefined;
          }
        }
        for (const [id, transactionSeq] of remoteTransactions) {
          if (transactionSeq <= durableSeq) {
            if (projectId) {
              draftPersistence.complete(projectId, id, true);
            }
            remoteTransactions.delete(id);
          }
        }
        tracker.handleAck({ type: "ack", seq, version });
        void flushBroadcasts();
        updateUnsaved();
      },
      onApplied: (transactionId, seq, status, errors) => {
        tracker.handleApplied({
          type: "applied",
          transactionId,
          seq,
          status,
          errors,
        });
        updateUnsaved();
      },
      onBroadcast: (message) => {
        // Other collaborators' changes become visible before the database ACK too.
        if (
          projectId &&
          message.originClientId !== clientId &&
          message.seq > durableSeq
        ) {
          draftPersistence.begin(projectId, message.transaction.id);
          remoteTransactions.set(message.transaction.id, message.seq);
        }
        tracker.handleBroadcast(message);
        updateUnsaved();
        if (message.originClientId !== clientId) {
          pendingBroadcasts.push({
            message,
            ...(message.seq <= durableSeq
              ? { ackVersion: durableVersion }
              : {}),
          });
          void flushBroadcasts();
        }
      },
      onClose: () => {},
      onErrorMessage: (message: ErrorMessage) => {
        tracker.handleErrorMessage(message);
        updateUnsaved();
      },
      onOpen: () => {
        tracker.handleReconnect();
      },
      onPresence: (presenceClientId, payload) => {
        updateCollaborator(presenceClientId, payload);
      },
      onReload: (message) => {
        broadcastGeneration += 1;
        isReloading = true;
        reloadFailureReported = false;
        clearTimeout(retryReload);
        retryReload = undefined;
        broadcastGenerationController.abort();
        broadcastGenerationController = new AbortController();
        clearBroadcastRetry();
        tracker.handleReload(message);
        updateUnsaved();
      },
    });
    unsubscribeReverts = ws.on((message) => {
      if (message.type !== "revert") {
        return;
      }
      const index = pendingBroadcasts.findIndex(
        ({ message: pending }) =>
          pending.transaction.id === message.transaction.id
      );
      if (index !== -1) {
        pendingBroadcasts.splice(index, 1);
      }
      if (projectId && remoteTransactions.delete(message.transaction.id)) {
        draftPersistence.complete(projectId, message.transaction.id, true);
      }
      events.emit("message", message);
    });
  };

  tracker = createMultiplayerRetryTracker({
    onDropped: ({ message }) => {
      const reverted =
        message.transaction.pageCopyGuard !== undefined &&
        rejectGuardedPageCopy(message.transactionId);
      reportTransactionCompletion(message.transactionId, false);
      if (projectId) {
        draftPersistence.complete(projectId, message.transactionId, reverted);
      }
      updateUnsaved();
    },
    onDurable: ({ message }) => {
      reportTransactionCompletion(message.transactionId, true);
      if (projectId) {
        draftPersistence.complete(projectId, message.transactionId, true);
      }
      updateUnsaved();
    },
    onReload: (message) => {
      if (projectId) {
        draftPersistence.invalidate(projectId);
      }
      reloadAndResume(
        message,
        broadcastGeneration,
        broadcastGenerationController.signal
      );
    },
    onUserMessage,
    sendApply,
  });

  return {
    close() {
      broadcastGeneration += 1;
      broadcastGenerationController.abort();
      clearBroadcastRetry();
      clearTimeout(retryReload);
      retryReload = undefined;
      pendingBroadcasts.length = 0;
      tracker.destroy();
      updateUnsaved();
      unsubscribeReverts?.();
      unsubscribeReverts = undefined;
      ws?.close();
      ws = undefined;
    },
    connect,
    emit(message) {
      // Preserve the regular in-browser SyncEmitter contract. The builder and
      // canvas iframe still use this emitter for local state handshakes and
      // client-only stores; multiplayer only adds remote relay for server patches.
      events.emit("message", message);

      if (message.type !== "apply") {
        return;
      }
      if (message.transaction.object !== "server") {
        return;
      }

      clientSeq += 1;
      const applyMessage: ApplyMessage = {
        type: "apply",
        transactionId: message.transaction.id,
        transaction: message.transaction,
        clientId,
        actorId: clientId,
        clientSeq,
      };
      if (projectId) {
        draftPersistence.begin(projectId, applyMessage.transactionId);
      }
      tracker.track(applyMessage);
      updateUnsaved();
    },
    on(handler) {
      return events.on("message", handler);
    },
    sendPresence(payload) {
      const message: PresenceMessage = {
        type: "presence",
        clientId,
        payload,
      };
      if (ws === undefined) {
        return;
      }
      ws.sendToRelay(message);
    },
  };
};
