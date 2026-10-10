import type { BuilderState } from "../state/builder-state";
import type { BuilderRuntimeMutation } from "./mutation";
import { formActionMutationPolicy } from "./form-actions";

export type MutationPolicy = {
  validate: (state: BuilderState, mutation: BuilderRuntimeMutation) => void;
};

/** Feature owners register mutation invariants here. */
export const mutationPolicies: readonly MutationPolicy[] = [
  formActionMutationPolicy,
];
