/**
 * Relay protocol types - the messages exchanged between clients and the
 * multiplayer relay service.
 */
export type Transaction<Payload = unknown> = {
  id: string;
  object: string;
  payload: Payload;
};

export type RevertedTransaction = {
  id: string;
  object: string;
};

export type CollaboratorInfo = {
  name?: string;
  avatarUrl?: string;
  pageId?: string;
  selectedInstanceIds?: string[];
  pointerPosition?: {
    x: number;
    y: number;
    xRatio: number;
    yRatio: number;
  };
  lastSeen?: number;
};

export type ApplyMessage = {
  type: "apply";
  transactionId: string;
  transaction: Transaction;
  clientId: string;
  actorId: string;
  clientSeq: number;
};

export type BroadcastMessage = {
  type: "broadcast";
  transaction: Transaction;
  originClientId: string;
  seq: number;
  actorId: string;
  clientSeq: number;
  relayTs: number;
};

export type AckMessage = { type: "ack"; seq: number; version: number };

export type ReloadMessage = {
  type: "reload";
  reason: "version_mismatched" | "persistence_error";
  errors?: string;
};

export const rateLimitedErrorMessage =
  "You're sending changes faster than they can be synced. Please pause for a moment and try again.";

export const persistenceBacklogErrorMessage =
  "Collaboration is catching up. Please pause for a moment while changes are saved.";

export type ErrorMessage = {
  type: "error";
  code: "rate_limited" | "persistence_backlog_full";
  message: string;
  transactionId?: string;
  retryAfterMs?: number;
};

export type AppliedMessage = {
  type: "applied";
  transactionId: string;
  seq: number;
  status: /** Rejected by the service without applying or saving. */
  | "dropped"
    /** Rejected by persistence authorization. */
    | "rejected"
    /** Could not be persisted after the relay accepted it. */
    | "failed"
    /** Already sequenced earlier; still wait for ack before treating it as durable. */
    | "settled";
  errors?: string;
};

export type RevertMessage = {
  type: "revert";
  clientId: string;
  transaction: RevertedTransaction;
};

export type PresenceMessage = {
  type: "presence";
  clientId: string;
  payload: unknown;
};

export type RelayClientMessage = ApplyMessage | PresenceMessage;

export type RelayServerMessage =
  | BroadcastMessage
  | AckMessage
  | AppliedMessage
  | RevertMessage
  | ReloadMessage
  | ErrorMessage
  | PresenceMessage;

export interface OperationOrder {
  actorId: string;
  clientSeq: number;
  relayTs: number;
}
