import { applyPatches, enableMapSet, enablePatches, type Patch } from "immer";
import {
  type BuilderPatch,
  type BuilderPatchTransaction,
} from "../contracts/patch";
import { type BuilderNamespace, type BuilderState } from "./builder-state";

export {
  builderPatchSchema,
  builderPatchChangeSchema,
  builderPatchTransactionSchema,
  builderPatchTransactionsSchema,
  type BuilderPatch,
  type BuilderPatchChange,
  type BuilderPatchTransaction,
} from "../contracts/patch";

export class MissingBuilderStateNamespaceError extends Error {
  constructor(namespace: BuilderNamespace) {
    super(`Builder state namespace "${namespace}" is missing.`);
    this.name = "MissingBuilderStateNamespaceError";
  }
}

export type ApplyBuilderPatchTransactionsResult = {
  state: BuilderState;
  changedNamespaces: BuilderNamespace[];
};

let areImmerPatchPluginsEnabled = false;

const enableImmerPatchPlugins = () => {
  if (areImmerPatchPluginsEnabled) {
    return;
  }
  enableMapSet();
  enablePatches();
  areImmerPatchPluginsEnabled = true;
};

export const applyBuilderNamespacePatches = <State>(
  state: State,
  patches: readonly BuilderPatch[]
): State => {
  enableImmerPatchPlugins();
  return applyPatches(state as never, patches as Patch[]) as State;
};

export const applyBuilderPatchTransactions = (
  state: BuilderState,
  transactions: readonly BuilderPatchTransaction[]
): ApplyBuilderPatchTransactionsResult => {
  const nextState: BuilderState = { ...state };
  const changedNamespaces = new Set<BuilderNamespace>();

  for (const transaction of transactions) {
    for (const change of transaction.payload) {
      if (change.patches.length === 0) {
        continue;
      }
      const namespaceState = nextState[change.namespace];
      if (namespaceState === undefined) {
        throw new MissingBuilderStateNamespaceError(change.namespace);
      }
      (nextState as Record<string, unknown>)[change.namespace] =
        applyBuilderNamespacePatches(namespaceState, change.patches);
      changedNamespaces.add(change.namespace);
    }
  }

  return { state: nextState, changedNamespaces: [...changedNamespaces] };
};
