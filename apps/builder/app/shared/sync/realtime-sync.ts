import { createNanoEvents } from "nanoevents";
import {
  $collaborators,
  $collabUnsaved,
  createRealtimeRetryTracker,
  type ApplyMessage,
  type ErrorMessage,
  type PresenceMessage,
  type ReloadMessage,
  type SyncEmitter,
  type SyncMessage,
} from "@webstudio-is/collab";
import {
  createWebSocketSyncEmitter,
  type WebSocketEmitterOptions,
  type WebSocketSyncEmitter,
} from "@webstudio-is/collab/websocket";
import type { Awareness } from "~/shared/awareness";

type RealtimeSyncEmitterOptions = {
  authToken?: string;
  clientId: string;
  host: string;
  onReload?: (message: ReloadMessage) => void;
  onUserMessage?: (message: string) => void;
  createTransport?: (options: WebSocketEmitterOptions) => WebSocketSyncEmitter;
};

export type RealtimeSyncEmitter = SyncEmitter & {
  close(): void;
  connect(buildId: string): void;
  sendPresence(payload: Awareness): void;
};

const log = (_message: string, _details?: Record<string, unknown>) => {};

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

export const createRealtimeSyncEmitter = ({
  authToken,
  clientId,
  host,
  onReload,
  onUserMessage,
  createTransport = createWebSocketSyncEmitter,
}: RealtimeSyncEmitterOptions): RealtimeSyncEmitter => {
  const events = createNanoEvents<{
    message: (message: SyncMessage) => void;
  }>();
  let clientSeq = 0;
  let tracker: ReturnType<typeof createRealtimeRetryTracker>;
  let ws: WebSocketSyncEmitter | undefined;

  const updateUnsaved = () => {
    $collabUnsaved.set(tracker.getPendingCount() > 0);
  };

  const sendApply = (message: ApplyMessage) => {
    log("send apply", {
      transactionId: message.transactionId,
      object: message.transaction.object,
      clientSeq: message.clientSeq,
    });
    if (ws === undefined) {
      log("send apply skipped; websocket not connected", {
        transactionId: message.transactionId,
      });
      return;
    }
    ws.sendToRelay(message);
  };

  const connect = (buildId: string) => {
    if (ws !== undefined) {
      log("connect skipped; websocket already exists", { buildId });
      return;
    }
    log("connect", { buildId, host, hasAuthToken: authToken !== undefined });
    ws = createTransport({
      authToken,
      buildId,
      clientId,
      host,
      onAck: (seq, version) => {
        tracker.handleAck({ type: "ack", seq, version });
        updateUnsaved();
      },
      onApplied: (transactionId, seq, status) => {
        tracker.handleApplied({ type: "applied", transactionId, seq, status });
        updateUnsaved();
      },
      onBroadcast: (message) => {
        log("broadcast", {
          seq: message.seq,
          originClientId: message.originClientId,
          object: message.transaction.object,
          actorId: message.actorId,
          clientSeq: message.clientSeq,
        });
        tracker.handleBroadcast(message);
        updateUnsaved();
        events.emit("message", {
          type: "apply",
          clientId: message.originClientId,
          transaction: message.transaction,
        });
      },
      onClose: () => {
        log("socket close");
      },
      onErrorMessage: (message: ErrorMessage) => {
        tracker.handleErrorMessage(message);
        updateUnsaved();
      },
      onOpen: () => {
        log("socket open");
        tracker.handleReconnect();
      },
      onPresence: (presenceClientId, payload) => {
        log("presence", { clientId: presenceClientId });
        updateCollaborator(presenceClientId, payload);
      },
      onReload: (message) => {
        tracker.handleReload(message);
        updateUnsaved();
      },
    });
  };

  tracker = createRealtimeRetryTracker({
    onDropped: ({ message, seq, status }) => {
      log("dropped", {
        transactionId: message.transactionId,
        seq,
        status,
      });
      updateUnsaved();
    },
    onDurable: ({ message, seq, version }) => {
      log("durable", {
        transactionId: message.transactionId,
        seq,
        version,
      });
      updateUnsaved();
    },
    onReload,
    onUserMessage,
    sendApply,
  });

  return {
    close() {
      log("close");
      tracker.destroy();
      updateUnsaved();
      ws?.close();
      ws = undefined;
    },
    connect,
    emit(message) {
      // Preserve the regular in-browser SyncEmitter contract. The builder and
      // canvas iframe still use this emitter for local state handshakes and
      // client-only stores; realtime only adds remote relay for server patches.
      events.emit("message", message);

      if (ws === undefined) {
        log("sync message before websocket connect", { type: message.type });
      }
      if (message.type !== "apply") {
        log("skip relay sync message", {
          type: message.type,
          object: undefined,
        });
        return;
      }
      if (message.transaction.object !== "server") {
        log("skip relay sync message", {
          type: message.type,
          object: message.transaction.object,
        });
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
      log("send presence", {
        pageId: payload.pageId,
        hasPointer: payload.pointerPosition !== undefined,
        selectedCount: payload.selectedInstanceIds?.length,
      });
      if (ws === undefined) {
        log("send presence skipped; websocket not connected");
        return;
      }
      ws.sendToRelay(message);
    },
  };
};
