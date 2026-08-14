import type { BuilderNamespace } from "../contracts/namespaces";
import type { BuilderPatchChange } from "../contracts/patch";
import type { BuilderState } from "../state/builder-state";
import { applyBuilderPatchTransactions } from "../state/patch";
import type { ContentStorageRoot } from "./content-storage";
import type { Patch } from "immer";

export type ContentStoragePatchChange =
  | BuilderPatchChange
  | { namespace: "fragment"; patches: Patch[] };

export type ContentStorageChange = {
  root: ContentStorageRoot;
  payload: ContentStoragePatchChange[];
};

export type BuilderRuntimeMutation<
  Result extends Record<string, unknown> = Record<string, unknown>,
> = {
  kind: "mutation";
  payload: BuilderPatchChange[];
  result: Result;
  invalidatesNamespaces: readonly BuilderNamespace[];
  storageChanges?: ContentStorageChange[];
  noop: boolean;
};

export const createRuntimeMutation = <
  Result extends Record<string, unknown> = Record<string, unknown>,
>({
  payload,
  result,
  invalidatesNamespaces,
  storageChanges,
}: {
  payload: BuilderPatchChange[];
  result: Result;
  invalidatesNamespaces: readonly BuilderNamespace[];
  storageChanges?: ContentStorageChange[];
}): BuilderRuntimeMutation<Result> => ({
  kind: "mutation",
  payload,
  result,
  invalidatesNamespaces,
  storageChanges,
  noop:
    payload.length === 0 &&
    storageChanges?.some((change) => change.payload.length > 0) !== true,
});

export const createRuntimeMutationAccumulator = (
  initialState: BuilderState
) => {
  let state = initialState;
  const changes = new Map<BuilderNamespace, BuilderPatchChange>();
  const invalidatesNamespaces = new Set<BuilderNamespace>();
  const storageChanges: ContentStorageChange[] = [];

  const stage = <Result extends Record<string, unknown>>(
    mutation: BuilderRuntimeMutation<Result>
  ) => {
    for (const change of mutation.payload) {
      const accumulated = changes.get(change.namespace);
      if (accumulated === undefined) {
        changes.set(change.namespace, {
          namespace: change.namespace,
          patches: [...change.patches],
        });
      } else {
        accumulated.patches.push(...change.patches);
      }
    }
    for (const namespace of mutation.invalidatesNamespaces) {
      invalidatesNamespaces.add(namespace);
    }
    storageChanges.push(...(mutation.storageChanges ?? []));
    if (mutation.payload.length > 0) {
      state = applyBuilderPatchTransactions(state, [
        { id: "runtime-mutation-stage", payload: mutation.payload },
      ]).state;
    }
    return mutation.result;
  };

  const complete = <Result extends Record<string, unknown>>(result: Result) =>
    createRuntimeMutation({
      payload: Array.from(changes.values()),
      result,
      invalidatesNamespaces: Array.from(invalidatesNamespaces),
      storageChanges: storageChanges.length === 0 ? undefined : storageChanges,
    });

  return {
    get state() {
      return state;
    },
    stage,
    complete,
  };
};
