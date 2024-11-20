import { nanoid } from "nanoid";
import { createNanoEvents, type Emitter } from "nanoevents";
import type { Change, Store } from "immerhin";

type Transaction = {
  id: string;
  changes: Change[];
};

type SyncMessage =
  | { type: "connect"; clientId: string }
  | { type: "state"; clientId: string; state: Map<string, unknown> }
  | { type: "commit"; clientId: string; transaction: Transaction }
  | { type: "revert"; clientId: string; transactionId: string };

export type SyncEmitter = Emitter<{
  message: (message: SyncMessage) => void;
}>;

type SyncClientOptions = {
  role: "leader" | "follower";
  store: Store;
  emitter?: SyncEmitter;
};

export class SyncClient {
  clientId = nanoid();
  role: SyncClientOptions["role"];
  store: Store;
  emitter: SyncEmitter;
  connection: "disconnected" | "connecting" | "connected" = "disconnected";

  constructor(options: SyncClientOptions) {
    this.role = options.role;
    this.store = options.store;
    this.emitter = options.emitter ?? createNanoEvents();
  }

  broadcastState() {
    const state = new Map<string, unknown>();
    for (const [namespace, $store] of this.store.containers) {
      state.set(namespace, $store.get());
    }
    this.emitter.emit("message", {
      clientId: this.clientId,
      type: "state",
      state,
    });
  }

  lead() {
    this.role = "leader";
    this.broadcastState();
  }

  connect({ signal }: { signal: AbortSignal }) {
    const off = this.emitter.on("message", (message) => {
      // ignore own messages
      if (this.clientId === message.clientId) {
        return;
      }
      if (message.type === "connect") {
        if (this.role !== "leader") {
          return;
        }
        this.broadcastState();
      }
      if (message.type === "state") {
        if (this.connection === "connected") {
          return;
        }
        this.connection = "connected";
        for (const [namespace, $store] of this.store.containers) {
          // immer is not able to work with Map instances from another realm
          // use clone to recreate data with current realm classes
          $store.set(structuredClone(message.state.get(namespace)));
        }
      }
      if (message.type === "commit") {
        /*
        // leader interacts with server
        // and should validate transactions from various actors
        if (this.role === "leader" && invalid(event.transaction)) {
          this.emitter.emit('revert', { clientId, transactions: [transaction.id] })
          return;
        }
        */
        this.store.addTransaction(
          message.transaction.id,
          message.transaction.changes,
          "remote"
        );
      }
      if (message.type === "revert") {
        this.store.revertTransaction(message.transactionId);
      }
    });

    const unsubscribe = this.store.subscribe((id, changes, source) => {
      if (source === "remote") {
        return;
      }
      const transaction: Transaction = { id, changes };
      this.emitter.emit("message", {
        clientId: this.clientId,
        type: "commit",
        transaction,
      });
    });

    signal.addEventListener("abort", () => {
      off();
      unsubscribe();
    });

    this.emitter.emit("message", {
      clientId: this.clientId,
      type: "connect",
    });
    if (this.connection === "disconnected") {
      this.connection = "connecting";
    }
    if (this.role === "leader") {
      this.broadcastState();
    }
  }
}
