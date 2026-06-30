import { applyPatches, enableMapSet, enablePatches, type Patch } from "immer";
import type {
  BuilderPatch,
  BuilderPatchChange,
  BuilderPatchTransaction,
} from "../contracts/patch";
import type { BuilderState } from "./builder-state";
import type { BuilderNamespace } from "../contracts/namespaces";

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

const getPathValue = (target: unknown, segment: string | number): unknown => {
  if (target instanceof Map) {
    return target.get(segment);
  }
  if (Array.isArray(target)) {
    return target[Number(segment)];
  }
  if (typeof target === "object" && target !== null) {
    return (target as Record<string, unknown>)[String(segment)];
  }
};

const setPathValue = (
  target: unknown,
  segment: string | number,
  value: unknown,
  operation: "add" | "replace"
) => {
  if (target instanceof Map) {
    target.set(segment, value);
    return;
  }
  if (Array.isArray(target)) {
    const index = Number(segment);
    if (operation === "add") {
      target.splice(index, 0, value);
      return;
    }
    target[index] = value;
    return;
  }
  if (typeof target === "object" && target !== null) {
    (target as Record<string, unknown>)[String(segment)] = value;
    return;
  }
  throw Error("Cannot set patch value on non-container target");
};

const removePathValue = (target: unknown, segment: string | number) => {
  if (target instanceof Map) {
    target.delete(segment);
    return;
  }
  if (Array.isArray(target)) {
    target.splice(Number(segment), 1);
    return;
  }
  if (typeof target === "object" && target !== null) {
    delete (target as Record<string, unknown>)[String(segment)];
    return;
  }
  throw Error("Cannot remove patch value from non-container target");
};

const getPatchParent = (
  namespaceData: unknown,
  patch: BuilderPatch
): { parent: unknown; key: string | number } => {
  const key = patch.path.at(-1);
  if (key === undefined) {
    throw Error("Cannot apply patch with empty path");
  }
  let parent = namespaceData;
  for (const segment of patch.path.slice(0, -1)) {
    parent = getPathValue(parent, segment);
    if (parent === undefined) {
      throw Error(`Cannot apply patch through missing path "${segment}"`);
    }
  }
  return { parent, key };
};

export const applyBuilderPatchPayloadMutable = (
  getNamespaceData: (namespace: BuilderNamespace) => unknown,
  payload: readonly BuilderPatchChange[]
) => {
  for (const change of payload) {
    const namespaceData = getNamespaceData(change.namespace);
    for (const patch of change.patches) {
      const { parent, key } = getPatchParent(namespaceData, patch);
      if (patch.op === "remove") {
        removePathValue(parent, key);
        continue;
      }
      setPathValue(parent, key, patch.value, patch.op);
    }
  }
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
