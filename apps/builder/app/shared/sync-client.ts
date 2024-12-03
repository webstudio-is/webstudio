import { nanoid } from "nanoid";
import { createNanoEvents, type Emitter } from "nanoevents";
import type { Change, Store } from "immerhin";
import type { WritableAtom } from "nanostores";

export type Transaction<Payload = unknown> = {
  id: string;
  object: string;
  payload: Payload;
};

export type RevertedTransaction = {
  id: string;
  object: string;
};

export interface SyncStorage {
  name: string;
  sendTransaction(transaction: Transaction): void;
  subscribe(setState: (state: unknown) => void, signal: AbortSignal): void;
}

const subscribeStorages = (
  storages: SyncStorage[],
  setState: (state: unknown) => void,
  signal: AbortSignal
) => {
  if (storages.length === 0) {
    setState(undefined);
    return;
  }
  storages[0].subscribe((value) => {
    if (value === undefined) {
      // invoke the next storage
      subscribeStorages(storages.slice(1), setState, signal);
      return;
    }
    setState(value);
  }, signal);
};

interface SyncObject {
  name: string;
  getState(): unknown;
  setState(state: unknown): void;
  applyTransaction(transaction: Transaction): void;
  revertTransaction(transaction: RevertedTransaction): void;
  subscribe(
    sendTransaction: (transaction: Transaction) => void,
    signal: AbortSignal
  ): void;
}

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
      // Immer cannot handle Map instances from another realm.
      // Use `clone` to recreate the data with the current realm's classes.
      // This works because the structured clone algorithm skips prototype chains; classes must be defined in both realms.
      $store.set(structuredClone(state.get(namespace)));
    }
  }
  applyTransaction(transaction: Transaction<Change[]>) {
    this.store.addTransaction(transaction.id, transaction.payload, "remote");
  }
  revertTransaction(transaction: RevertedTransaction) {
    this.store.revertTransaction(transaction.id);
  }
  subscribe(
    sendTransaction: (transaction: Transaction<Change[]>) => void,
    signal: AbortSignal
  ) {
    const unsubscribe = this.store.subscribe((id, payload, source) => {
      if (source === "remote") {
        return;
      }
      sendTransaction({ id, object: this.name, payload });
    });
    signal.addEventListener("abort", unsubscribe);
  }
}

export class NanostoresSyncObject implements SyncObject {
  name: string;
  store: WritableAtom<unknown>;
  // track the source of "store.set" to avoid cyclic updates
  operation: "local" | "state" | "add" = "local";
  constructor(name: string, store: WritableAtom<unknown>) {
    this.name = name;
    this.store = store;
  }
  getState() {
    return this.store.get();
  }
  setState(state: unknown) {
    this.operation = "state";
    this.store.set(state);
    this.operation = "local";
  }
  applyTransaction(transaction: Transaction) {
    this.operation = "add";
    // `instanceof` checks do not work with instances like Map, File, etc., from another realm.
    // Use `clone` to recreate the data with the current realm's classes.
    // This works because the structured clone algorithm skips prototype chains; classes must be defined in both realms.
    this.store.set(structuredClone(transaction.payload));
    this.operation = "local";
  }
  revertTransaction(_transaction: RevertedTransaction) {
    // @todo store the list of transactions
  }
  subscribe(
    sendTransaction: (transaction: Transaction) => void,
    signal: AbortSignal
  ) {
    const unsubscribe = this.store.listen((payload) => {
      if (this.operation !== "local") {
        return;
      }
      const transaction = { id: nanoid(), object: this.name, payload };
      sendTransaction(transaction);
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
      // merge into existing state to partially restore from storage
      if (state.has(name)) {
        object.setState(state.get(name) as never);
      }
    }
  }
  applyTransaction(transaction: Transaction) {
    this.objects.get(transaction.object)?.applyTransaction(transaction);
  }
  revertTransaction(transaction: RevertedTransaction) {
    this.objects.get(transaction.object)?.revertTransaction(transaction);
  }
  subscribe(
    sendTransaction: (transaction: Transaction) => void,
    signal: AbortSignal
  ) {
    for (const object of this.objects.values()) {
      object.subscribe(sendTransaction, signal);
    }
  }
}

type SyncMessage =
  | { type: "connect"; clientId: string }
  | { type: "state"; clientId: string; state: unknown }
  | { type: "apply"; clientId: string; transaction: Transaction }
  | { type: "revert"; clientId: string; transaction: RevertedTransaction };

export type SyncEmitter = Emitter<{
  message: (message: SyncMessage) => void;
}>;

type SyncClientOptions = {
  role: "leader" | "follower";
  object: SyncObject;
  emitter?: SyncEmitter;
  storages?: SyncStorage[];
};

export class SyncClient {
  clientId = nanoid();
  role: SyncClientOptions["role"];
  object: SyncObject;
  storages: SyncStorage[];
  emitter: SyncEmitter;
  connection: "disconnected" | "connecting" | "connected" = "disconnected";

  constructor(options: SyncClientOptions) {
    this.role = options.role;
    this.object = options.object;
    this.storages = options.storages ?? [];
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

  connect({ signal, onReady }: { signal: AbortSignal; onReady?: () => void }) {
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
      if (message.type === "apply") {
        /*
        // leader interacts with server
        // and should validate transactions from various actors
        if (this.role === "leader" && invalid(event.transaction)) {
          this.emitter.emit('revert', { clientId, transactions: [transaction.id] })
          return;
        }
        */
        this.object.applyTransaction(message.transaction);
        if (this.role === "leader") {
          for (const storage of this.storages) {
            storage.sendTransaction(message.transaction);
          }
        }
      }
      if (message.type === "revert") {
        this.object.revertTransaction(message.transaction);
      }
    });
    signal.addEventListener("abort", off);

    this.object.subscribe((transaction) => {
      this.emitter.emit("message", {
        clientId: this.clientId,
        type: "apply",
        transaction,
      });
      if (this.role === "leader") {
        for (const storage of this.storages) {
          storage.sendTransaction(transaction);
        }
      }
    }, signal);

    this.emitter.emit("message", {
      clientId: this.clientId,
      type: "connect",
    });
    if (this.connection === "disconnected") {
      this.connection = "connecting";
    }
    if (this.role === "leader") {
      subscribeStorages(
        this.storages,
        (state) => {
          // fallback to default object state
          state ??= this.object.getState();
          this.object.setState(state);
          this.emitter.emit("message", {
            clientId: this.clientId,
            type: "state",
            state,
          });
          onReady?.();
        },
        signal
      );
    }
  }
}
