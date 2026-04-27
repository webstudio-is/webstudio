import type {
  RevertedTransaction,
  Transaction,
} from "@webstudio-is/multiplayer-protocol";

export type { RevertedTransaction, Transaction };

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
