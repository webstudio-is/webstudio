import { createNanoEvents } from "nanoevents";
import {
  $collaborators,
  $syncStatus,
  createMultiplayerRetryTracker,
  type ApplyMessage,
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
  clientId: string;
  getAuthToken?: () => Promise<string | undefined>;
  url: string;
  onReload?: (message: ReloadMessage) => void;
  onUserMessage?: (message: string) => void;
  createTransport?: (options: WebSocketEmitterOptions) => WebSocketSyncEmitter;
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
  clientId,
  getAuthToken,
  url,
  onReload,
  onUserMessage,
  createTransport = createWebSocketSyncEmitter,
}: MultiplayerSyncEmitterOptions): MultiplayerSyncEmitter => {
  const events = createNanoEvents<{
    message: (message: SyncMessage) => void;
  }>();
  let clientSeq = 0;
  let tracker: ReturnType<typeof createMultiplayerRetryTracker>;
  let ws: WebSocketSyncEmitter | undefined;

  const updateUnsaved = () => {
    $syncStatus.set(
      tracker.getPendingCount() > 0 ? { status: "syncing" } : { status: "idle" }
    );
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
        tracker.handleAck({ type: "ack", seq, version });
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
        tracker.handleBroadcast(message);
        updateUnsaved();
        events.emit("message", {
          type: "apply",
          clientId: message.originClientId,
          transaction: message.transaction,
        });
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
        tracker.handleReload(message);
        updateUnsaved();
      },
    });
  };

  tracker = createMultiplayerRetryTracker({
    onDropped: () => {
      updateUnsaved();
    },
    onDurable: () => {
      updateUnsaved();
    },
    onReload,
    onUserMessage,
    sendApply,
  });

  return {
    close() {
      tracker.destroy();
      updateUnsaved();
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
