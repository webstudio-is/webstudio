import { nanoid } from "nanoid";
import { createNanoEvents, type Emitter } from "nanoevents";
import type { Change, Store } from "immerhin";

type Transaction = {
  id: string;
  object: string;
  changes: Change[];
};

type RevertedTransaction = {
  id: string;
  object: string;
};

export class ImmerhinSyncObject implements SyncObject {
  name: string;
  store: Store;
  constructor(name: string, store: Store) {
    this.name = name;
    this.store = store;
  }
  getState() {
    const state = new Map<string, unknown>();
    for (const [namespace, $store] of this.store.containers) {
      state.set(namespace, $store.get());
    }
    return state;
  }
  setState(state: Map<string, unknown>) {
    for (const [namespace, $store] of this.store.containers) {
      // immer is not able to work with Map instances from another realm
      // use clone to recreate data with current realm classes
      $store.set(structuredClone(state.get(namespace)));
    }
  }
  addTransaction(transaction: Transaction) {
    this.store.addTransaction(transaction.id, transaction.changes, "remote");
  }
  revertTransaction(transaction: RevertedTransaction) {
    this.store.revertTransaction(transaction.id);
  }
  subscribe(callback: (transaction: Transaction) => void, signal: AbortSignal) {
    const unsubscribe = this.store.subscribe((id, changes, source) => {
      if (source === "remote") {
        return;
      }
      callback({ id, object: this.name, changes });
    });
    signal.addEventListener("abort", unsubscribe);
  }
}

export class SyncObjectPool implements SyncObject {
  name = "SyncObjectPool";
  objects = new Map<string, SyncObject>();
  constructor(objects: SyncObject[]) {
    for (const object of objects) {
      this.objects.set(object.name, object);
    }
  }
  getState() {
    const state = new Map<string, unknown>();
    for (const [name, object] of this.objects) {
      state.set(name, object.getState());
    }
    return state;
  }
  setState(state: Map<string, unknown>) {
    for (const [name, object] of this.objects) {
      object.setState(state.get(name) as never);
    }
  }
  addTransaction(transaction: Transaction) {
    this.objects.get(transaction.object)?.addTransaction(transaction);
  }
  revertTransaction(transaction: RevertedTransaction) {
    this.objects.get(transaction.object)?.revertTransaction(transaction);
  }
  subscribe(callback: (transaction: Transaction) => void, signal: AbortSignal) {
    for (const object of this.objects.values()) {
      object.subscribe(callback, signal);
    }
  }
}

type SyncMessage =
  | { type: "connect"; clientId: string }
  | { type: "state"; clientId: string; state: Map<string, unknown> }
  | { type: "commit"; clientId: string; transaction: Transaction }
  | { type: "revert"; clientId: string; transaction: RevertedTransaction };

export type SyncEmitter = Emitter<{
  message: (message: SyncMessage) => void;
}>;

type SyncClientOptions = {
  role: "leader" | "follower";
  object: SyncObject;
  emitter?: SyncEmitter;
};

interface SyncObject {
  name: string;
  getState(): Map<string, unknown>;
  setState(state: Map<string, unknown>): void;
  addTransaction(transaction: Transaction): void;
  revertTransaction(transaction: RevertedTransaction): void;
  subscribe(
    callback: (transaction: Transaction) => void,
    signal: AbortSignal
  ): void;
}

export class SyncClient {
  clientId = nanoid();
  role: SyncClientOptions["role"];
  object: SyncObject;
  emitter: SyncEmitter;
  connection: "disconnected" | "connecting" | "connected" = "disconnected";

  constructor(options: SyncClientOptions) {
    this.role = options.role;
    this.object = options.object;
    this.emitter = options.emitter ?? createNanoEvents();
  }

  lead() {
    this.role = "leader";
    this.emitter.emit("message", {
      clientId: this.clientId,
      type: "state",
      state: this.object.getState(),
    });
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
        this.emitter.emit("message", {
          clientId: this.clientId,
          type: "state",
          state: this.object.getState(),
        });
      }
      if (message.type === "state") {
        if (this.connection === "connected") {
          return;
        }
        this.connection = "connected";
        this.object.setState(message.state);
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
        this.object.addTransaction(message.transaction);
      }
      if (message.type === "revert") {
        this.object.revertTransaction(message.transaction);
      }
    });
    signal.addEventListener("abort", off);

    this.object.subscribe((transaction) => {
      this.emitter.emit("message", {
        clientId: this.clientId,
        type: "commit",
        transaction,
      });
    }, signal);

    this.emitter.emit("message", {
      clientId: this.clientId,
      type: "connect",
    });
    if (this.connection === "disconnected") {
      this.connection = "connecting";
    }
    if (this.role === "leader") {
      this.emitter.emit("message", {
        clientId: this.clientId,
        type: "state",
        state: this.object.getState(),
      });
    }
  }
}
