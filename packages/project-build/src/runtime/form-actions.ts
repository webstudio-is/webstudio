import { maxFormActions } from "@webstudio-is/sdk";
import type { BuilderState } from "../state/builder-state";
import { applyBuilderPatchTransactions } from "../state/patch";
import { throwBuilderRuntimeError } from "./errors";
import type { BuilderRuntimeMutation } from "./mutation";

/** Check Form-owned props in a planned mutation, regardless of how they were authored. */
const validateFormActionMutation = (
  state: BuilderState,
  mutation: BuilderRuntimeMutation
) => {
  const propChanges = mutation.payload.filter(
    (change) => change.namespace === "props" && change.patches.length > 0
  );
  if (propChanges.length === 0) {
    return;
  }
  const changedPropIds = new Set<string>();
  let replacesAllProps = false;
  for (const change of propChanges) {
    for (const patch of change.patches) {
      const propId = patch.path[0];
      if (typeof propId === "string") {
        changedPropIds.add(propId);
      } else {
        replacesAllProps = true;
      }
    }
  }
  const nextState = applyBuilderPatchTransactions(state, [
    { id: "validate-form-actions", payload: mutation.payload },
  ]).state;
  const props = nextState.props;
  const instances = nextState.instances;
  if (props === undefined || instances === undefined) {
    return;
  }
  const changedProps = replacesAllProps
    ? props.values()
    : Array.from(changedPropIds, (id) => props.get(id)).filter(
        (prop) => prop !== undefined
      );
  for (const prop of changedProps) {
    if (
      instances.get(prop.instanceId)?.component === "NativeForm" &&
      prop.name === "action" &&
      prop.type === "json" &&
      Array.isArray(prop.value) &&
      prop.value.length > maxFormActions
    ) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        `Select no more than ${maxFormActions} Resource actions`
      );
    }
  }
};

export const formActionMutationPolicy = {
  validate: validateFormActionMutation,
};
