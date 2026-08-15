import type { Instance } from "@webstudio-is/sdk";
import type { BuilderNamespace } from "../contracts/namespaces";
import type { BuilderPatchChange } from "../contracts/patch";
import type { BuilderState } from "../state/builder-state";
import { applyBuilderPatchTransactions } from "../state/patch";
import {
  projectContentStorageChanges,
  type ContentStorageRoot,
} from "./content-storage";

export type ContentStoragePatchChange =
  | BuilderPatchChange
  | { namespace: "fragment"; patches: BuilderPatchChange["patches"] };

export type ContentStorageChange = {
  root: ContentStorageRoot;
  payload: ContentStoragePatchChange[];
  copySource?: Readonly<{
    root: ContentStorageRoot;
    instanceId: Instance["id"];
  }>;
  mdxInsert?: Readonly<{
    source: string;
    parentInstanceId: Instance["id"];
    childIndex: number;
    position: "append" | "prepend" | "replace" | "index";
    instanceIds: readonly Instance["id"][];
    rootInstanceIds: readonly Instance["id"][];
  }>;
};

export const hasContentStorageChange = (change: ContentStorageChange) =>
  change.mdxInsert !== undefined ||
  change.payload.some(({ patches }) => patches.length > 0);

export type BuilderRuntimeMutation<
  Result extends Record<string, unknown> = Record<string, unknown>,
> = {
  kind: "mutation";
  payload: BuilderPatchChange[];
  result: Result;
  invalidatesNamespaces: readonly BuilderNamespace[];
  storageChanges?: ContentStorageChange[];
  persistenceOrder?: "storage-first" | "project-first";
  noop: boolean;
};

// Moving authored records into project ownership is the one serial persistence
// case where saving the project first avoids deleting the only durable copy.
// The inverse move remains storage-first so the external destination exists
// before the project source is removed.
export const getRuntimeMutationPersistenceOrder = (
  mutation: Pick<
    BuilderRuntimeMutation,
    "payload" | "storageChanges" | "persistenceOrder"
  >
): "storage-first" | "project-first" => {
  if (
    "persistenceOrder" in mutation &&
    mutation.persistenceOrder !== undefined
  ) {
    return mutation.persistenceOrder;
  }
  const projectAdds = new Set(
    mutation.payload.flatMap(({ patches }) =>
      patches.flatMap((patch) =>
        patch.op === "add" &&
        patch.path.length === 1 &&
        typeof patch.path[0] === "string"
          ? [patch.path[0]]
          : []
      )
    )
  );
  const storageRemovals = new Set(
    (mutation.storageChanges ?? []).flatMap(({ payload }) =>
      payload.flatMap(({ patches }) =>
        patches.flatMap((patch) =>
          patch.op === "remove" &&
          patch.path.length === 1 &&
          typeof patch.path[0] === "string"
            ? [patch.path[0]]
            : []
        )
      )
    )
  );
  return Array.from(projectAdds).some((id) => storageRemovals.has(id))
    ? "project-first"
    : "storage-first";
};

export const createRuntimeMutation = <
  Result extends Record<string, unknown> = Record<string, unknown>,
>({
  payload,
  result,
  invalidatesNamespaces,
  storageChanges,
  persistenceOrder,
}: {
  payload: BuilderPatchChange[];
  result: Result;
  invalidatesNamespaces: readonly BuilderNamespace[];
  storageChanges?: ContentStorageChange[];
  persistenceOrder?: BuilderRuntimeMutation["persistenceOrder"];
}): BuilderRuntimeMutation<Result> => ({
  kind: "mutation",
  payload,
  result,
  invalidatesNamespaces,
  storageChanges,
  ...(persistenceOrder === undefined ? {} : { persistenceOrder }),
  noop:
    payload.length === 0 &&
    storageChanges?.some(hasContentStorageChange) !== true,
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
    const stagedPayload = [
      ...mutation.payload,
      ...projectContentStorageChanges({
        state,
        changes: mutation.storageChanges ?? [],
      }),
    ];
    if (stagedPayload.length > 0) {
      state = applyBuilderPatchTransactions(state, [
        { id: "runtime-mutation-stage", payload: stagedPayload },
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
