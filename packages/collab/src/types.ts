/**
 * Minimal types the collab package needs from the sync-client world.
 * Kept lean so they can be independently satisfied by any host
 * (builder, Durable Object, test harness).
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

export type SyncMessage =
  | { type: "connect"; clientId: string }
  | { type: "state"; clientId: string; state: unknown }
  | {
      type: "apply";
      clientId: string;
      transaction: Transaction<unknown>;
    }
  | { type: "revert"; clientId: string; transaction: RevertedTransaction };

export interface SyncEmitter {
  emit(message: SyncMessage): void;
  on(handler: (message: SyncMessage) => void): () => void;
}

/** Minimal interface for applying transactions to a sync object pool. */
export interface SyncObject {
  applyTransaction(transaction: Transaction): void;
  subscribe(
    sendTransaction: (transaction: Transaction) => void,
    signal: AbortSignal
  ): void;
}
