import { applyPatches, type Patch } from "immer";
import { enableImmerPatchPlugins } from "./immer";
import type {
  BuilderPatch,
  BuilderPatchChange,
  BuilderPatchTransaction,
} from "../contracts/patch";
import { compactBuilderPatchPayload } from "../contracts/patch";
import type { BuilderState } from "./builder-state";
import type { BuilderNamespace } from "../contracts/namespaces";

// Initialize when this module is imported directly, independently of bundler
// side-effect handling.
enableImmerPatchPlugins();

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

const toBuilderPatch = (patch: Patch): BuilderPatch => {
  const path = patch.path as Array<string | number>;
  if (patch.op === "remove") {
    return { op: patch.op, path };
  }
  return { op: patch.op, path, value: patch.value };
};

export const createBuilderPatchPayloadFromImmerPatches = (
  patches: readonly Patch[]
): BuilderPatchChange[] => {
  const payloadByNamespace = new Map<BuilderNamespace, BuilderPatchChange>();
  for (const patch of patches) {
    const [namespace, ...path] = patch.path;
    if (typeof namespace !== "string") {
      continue;
    }
    const builderNamespace = namespace as BuilderNamespace;
    const change = payloadByNamespace.get(builderNamespace) ?? {
      namespace: builderNamespace,
      patches: [],
    };
    change.patches.push(toBuilderPatch({ ...patch, path }));
    payloadByNamespace.set(builderNamespace, change);
  }
  return compactBuilderPatchPayload(Array.from(payloadByNamespace.values()));
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

const hasPathValue = (target: unknown, segment: string | number): boolean => {
  if (target instanceof Map) {
    return target.has(segment);
  }
  if (Array.isArray(target)) {
    const index = Number(segment);
    return Number.isInteger(index) && index >= 0 && index < target.length;
  }
  if (typeof target === "object" && target !== null) {
    return Object.hasOwn(target, String(segment));
  }
  return false;
};

const setPathValue = (
  target: unknown,
  segment: string | number,
  value: unknown,
  operation: "add" | "replace"
) => {
  if (operation === "replace" && hasPathValue(target, segment) === false) {
    throw Error(`Cannot replace missing patch path "${String(segment)}"`);
  }
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

const replaceTargetMutable = (target: unknown, value: unknown) => {
  if (target instanceof Map && value instanceof Map) {
    target.clear();
    for (const [key, item] of value) {
      target.set(key, item);
    }
    return;
  }
  if (
    typeof target === "object" &&
    target !== null &&
    typeof value === "object" &&
    value !== null
  ) {
    for (const key of Object.keys(target)) {
      delete (target as Record<string, unknown>)[key];
    }
    Object.assign(target, value);
    return;
  }
  throw Error("Cannot replace patch target with incompatible value");
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

const assertReplacePatchTargetsExistingPath = (
  namespaceData: unknown,
  patch: BuilderPatch
) => {
  if (patch.op !== "replace") {
    return;
  }
  if (patch.path.length === 0) {
    return;
  }
  const { parent, key } = getPatchParent(namespaceData, patch);
  if (hasPathValue(parent, key) === false) {
    throw Error(`Cannot replace missing patch path "${String(key)}"`);
  }
};

export const applyBuilderNamespacePatches = <State>(
  state: State,
  patches: readonly BuilderPatch[]
): State => {
  for (const patch of patches) {
    assertReplacePatchTargetsExistingPath(state, patch);
  }
  return applyPatches(state as never, patches as Patch[]) as State;
};

export const applyBuilderPatchPayloadMutable = (
  getNamespaceData: (namespace: BuilderNamespace) => unknown,
  payload: readonly BuilderPatchChange[]
) => {
  for (const change of payload) {
    const namespaceData = getNamespaceData(change.namespace);
    for (const patch of change.patches) {
      if (patch.path.length === 0) {
        if (patch.op === "remove") {
          throw Error("Cannot remove a patch namespace root mutably");
        }
        replaceTargetMutable(namespaceData, patch.value);
        continue;
      }
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
        const patch = change.patches[0];
        if (
          change.namespace === "marketplaceProduct" &&
          change.patches.length === 1 &&
          patch?.op === "replace" &&
          patch.path.length === 0
        ) {
          (nextState as Record<string, unknown>).marketplaceProduct =
            structuredClone(patch.value);
          changedNamespaces.add(change.namespace);
          continue;
        }
        throw new MissingBuilderStateNamespaceError(change.namespace);
      }
      (nextState as Record<string, unknown>)[change.namespace] =
        applyBuilderNamespacePatches(namespaceState, change.patches);
      changedNamespaces.add(change.namespace);
    }
  }

  return { state: nextState, changedNamespaces: [...changedNamespaces] };
};
