/**
 * createWebSocketSyncEmitter - SyncEmitter over PartySocket (auto-reconnect WebSocket).
 *
 * Relay-specific message types (ack, applied, broadcast, reload, error,
 * presence) are
 * dispatched to dedicated callbacks; standard SyncClient messages (connect,
 * state, apply, revert) are forwarded to local handlers.
 *
 * Auth token is injected by the host so this module stays auth-agnostic.
 */

import PartySocket from "partysocket";
import type { SyncEmitter, SyncMessage } from "./types";
import type {
  AckMessage,
  AppliedMessage,
  BroadcastMessage,
  ErrorMessage,
  PresenceMessage,
  ReloadMessage,
  RelayClientMessage,
  RelayServerMessage,
} from "./protocol";
import { stripRevisePatchesFromTransaction } from "./protocol";

interface MessageCallbacks
  extends Pick<
    WebSocketEmitterOptions,
    | "onAck"
    | "onApplied"
    | "onPresence"
    | "onBroadcast"
    | "onReload"
    | "onErrorMessage"
  > {}

export type WebSocketEmitterOptions = {
  host: string;
  buildId: string;
  clientId: string;
  authToken?: string;
  onAck: (seq: number, version: number) => void;
  onApplied: (
    transactionId: string,
    seq: number,
    status: AppliedMessage["status"]
  ) => void;
  onPresence: (clientId: string, payload: unknown) => void;
  onBroadcast: (message: BroadcastMessage) => void;
  onErrorMessage: (message: ErrorMessage) => void;
  onReload?: (message: ReloadMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

/** The realtime transport interface used by browser and CLI clients. */
export type WebSocketSyncEmitter = SyncEmitter & {
  sendToRelay(message: RelayClientMessage): void;
  close(): void;
};

export const dispatchWebSocketMessage = ({
  data,
  handlers,
  callbacks,
  onMessage,
  onParseError,
}: {
  data: string;
  handlers: Set<(message: SyncMessage) => void>;
  callbacks: MessageCallbacks;
  onMessage?: (message: RelayServerMessage | SyncMessage) => void;
  onParseError?: (raw: string) => void;
}) => {
  let parsed: RelayServerMessage | SyncMessage;
  try {
    parsed = JSON.parse(data) as RelayServerMessage | SyncMessage;
  } catch {
    onParseError?.(data);
    return;
  }

  const type = (parsed as { type: string }).type;
  onMessage?.(parsed);

  if (type === "ack") {
    const ack = parsed as AckMessage;
    callbacks.onAck(ack.seq, ack.version);
    return;
  }
  if (type === "applied") {
    const applied = parsed as AppliedMessage;
    callbacks.onApplied(applied.transactionId, applied.seq, applied.status);
    return;
  }
  if (type === "presence") {
    const presence = parsed as PresenceMessage;
    callbacks.onPresence(presence.clientId, presence.payload);
    return;
  }
  if (type === "broadcast") {
    callbacks.onBroadcast(parsed as BroadcastMessage);
    return;
  }
  if (type === "reload") {
    callbacks.onReload?.(parsed as ReloadMessage);
    return;
  }
  if (type === "error") {
    callbacks.onErrorMessage(parsed as ErrorMessage);
    return;
  }

  if (
    type === "connect" ||
    type === "state" ||
    type === "apply" ||
    type === "revert"
  ) {
    // Standard SyncClient messages for same-host sync primitives.
    const syncMsg = parsed as SyncMessage;
    for (const handler of handlers) {
      handler(syncMsg);
    }
  }
};

export const createWebSocketSyncEmitter = (
  opts: WebSocketEmitterOptions
): WebSocketSyncEmitter => {
  const warnPrefix = `[collab-ws:${opts.clientId.slice(0, 6)}]`;
  const warn = (message: string, ...args: unknown[]) =>
    console.warn(`${warnPrefix} ${message}`, ...args);

  const hasExplicitProtocol =
    opts.host.match(/^https?:\/\//) !== null ||
    opts.host.match(/^wss?:\/\//) !== null;
  const url = new URL(hasExplicitProtocol ? opts.host : `ws://${opts.host}`);
  const isLoopbackHost =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "0.0.0.0" ||
    url.hostname === "[::1]";
  const resolvedProtocol =
    hasExplicitProtocol && url.protocol === "ws:"
      ? "ws"
      : hasExplicitProtocol && url.protocol === "wss:"
        ? "wss"
        : hasExplicitProtocol && url.protocol === "http:"
          ? "ws"
          : hasExplicitProtocol && url.protocol === "https:"
            ? "wss"
            : isLoopbackHost
              ? "ws"
              : undefined;

  const ws = new PartySocket({
    host: url.host,
    protocol: resolvedProtocol,
    room: opts.buildId,
    id: opts.clientId,
    query: async () =>
      opts.authToken === undefined || opts.authToken.length === 0
        ? {}
        : { token: opts.authToken },
  });

  const handlers = new Set<(message: SyncMessage) => void>();

  const sanitizeRelayMessage = (
    message: RelayClientMessage
  ): RelayClientMessage => {
    if (message.type === "apply") {
      return {
        ...message,
        transaction: stripRevisePatchesFromTransaction(message.transaction),
      };
    }
    return message;
  };

  ws.addEventListener("open", () => {
    opts.onOpen?.();
  });
  ws.addEventListener("close", () => {
    opts.onClose?.();
  });
  ws.addEventListener("error", (event) => {
    warn("socket error event=%o", event);
  });

  ws.addEventListener("message", (ev) => {
    dispatchWebSocketMessage({
      data: ev.data as string,
      handlers,
      callbacks: opts,
      onParseError: (raw) => {
        warn("message parse failed raw=%s", raw.slice(0, 200));
      },
    });
  });

  return {
    emit(message: SyncMessage): void {
      ws.send(JSON.stringify(message));
      // Deliver locally too, so any same-tab listener receives it.
      for (const handler of handlers) {
        handler(message);
      }
    },

    on(handler: (message: SyncMessage) => void): () => void {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },

    sendToRelay(message: RelayClientMessage): void {
      const sanitized = sanitizeRelayMessage(message);
      ws.send(JSON.stringify(sanitized));
    },

    close(): void {
      ws.close();
    },
  };
};
