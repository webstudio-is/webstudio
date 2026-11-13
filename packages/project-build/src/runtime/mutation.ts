import type { BuilderNamespace } from "../contracts/namespaces";
import type { BuilderPatchChange } from "../contracts/patch";
import type { BuilderState } from "../state/builder-state";
import { applyBuilderPatchTransactions } from "../state/patch";

export type BuilderRuntimeMutation<
  Result extends Record<string, unknown> = Record<string, unknown>,
> = {
  kind: "mutation";
  payload: BuilderPatchChange[];
  result: Result;
  invalidatesNamespaces: readonly BuilderNamespace[];
  noop: boolean;
};

export const createRuntimeMutation = <
  Result extends Record<string, unknown> = Record<string, unknown>,
>({
  payload,
  result,
  invalidatesNamespaces,
}: {
  payload: BuilderPatchChange[];
  result: Result;
  invalidatesNamespaces: readonly BuilderNamespace[];
}): BuilderRuntimeMutation<Result> => ({
  kind: "mutation",
  payload,
  result,
  invalidatesNamespaces,
  noop: payload.length === 0,
});

const appendBuilderPatchChanges = <
  Change extends { namespace: string; patches: unknown[] },
>(
  changes: Map<Change["namespace"], Change>,
  payload: readonly Change[]
) => {
  for (const change of payload) {
    const accumulated = changes.get(change.namespace);
    if (accumulated === undefined) {
      changes.set(change.namespace, {
        ...change,
        patches: [...change.patches],
      });
    } else {
      accumulated.patches.push(...change.patches);
    }
  }
};

export const mergeBuilderPatchChanges = <
  Change extends { namespace: string; patches: unknown[] },
>(
  ...payloads: readonly (readonly Change[])[]
) => {
  const changes = new Map<Change["namespace"], Change>();
  for (const payload of payloads) {
    appendBuilderPatchChanges(changes, payload);
  }
  return Array.from(changes.values());
};

export const createRuntimeMutationAccumulator = (
  initialState: BuilderState
) => {
  let state = initialState;
  const changes = new Map<BuilderNamespace, BuilderPatchChange>();
  const invalidatesNamespaces = new Set<BuilderNamespace>();

  const stage = <Result extends Record<string, unknown>>(
    mutation: BuilderRuntimeMutation<Result>
  ) => {
    appendBuilderPatchChanges(changes, mutation.payload);
    for (const namespace of mutation.invalidatesNamespaces) {
      invalidatesNamespaces.add(namespace);
    }
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
    });

  return {
    get state() {
      return state;
    },
    stage,
    complete,
  };
};
