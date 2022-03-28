import ObjectId from "bson-objectid";
import { applyPatches, type Patch } from "immer";
import { ValueContainer } from "react-nano-state";

export type Change = {
  namespace: string;
  patches: Array<Patch>;
};

type TransactionSpec = {
  namespace: string;
  patches: Array<Patch>;
  revisePatches: Array<Patch>;
  container: ValueContainer<Record<string, unknown>>;
};

export class Transaction {
  id: string;
  specs: Array<TransactionSpec> = [];
  constructor() {
    this.id = ObjectId().toString();
  }
  apply(type: "patches" | "revisePatches") {
    for (const change of this.specs) {
      const value = applyPatches(change.container.value, change[type]);
      change.container.dispatch(value);
    }
  }
  add(change: TransactionSpec) {
    this.specs.push(change);
  }
  getChanges(): Array<Change> {
    return this.specs.map(({ namespace, patches }) => ({
      namespace,
      patches,
    }));
  }
  getReviseChanges(): Array<Change> {
    return this.specs.map(({ namespace, revisePatches }) => ({
      namespace,
      patches: revisePatches,
    }));
  }
}
