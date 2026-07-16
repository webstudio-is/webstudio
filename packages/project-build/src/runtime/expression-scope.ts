import type { BuilderState } from "../state/builder-state";
import { bindExpressionToInstanceScope, findAvailableVariables } from "./data";
import { getExpressionWarnings } from "./expression-validation";

export const bindExpressionInput = (
  state: BuilderState,
  instanceId: string,
  expression: string
) => {
  if (state.instances === undefined || state.dataSources === undefined) {
    return expression;
  }
  return bindExpressionToInstanceScope({
    expression,
    instanceId,
    instances: state.instances,
    dataSources: state.dataSources,
  });
};

export const getScopedExpressionWarnings = (
  state: BuilderState,
  instanceId: string,
  path: string[],
  expression: string,
  allowAssignment = false,
  additionalVariables: readonly string[] = []
) => {
  if (state.instances === undefined || state.dataSources === undefined) {
    return [];
  }
  const availableVariables = new Set(
    findAvailableVariables({
      startingInstanceId: instanceId,
      instances: state.instances,
      dataSources: state.dataSources,
    }).map(({ name }) => name)
  );
  for (const name of additionalVariables) {
    availableVariables.add(name);
  }
  return getExpressionWarnings({
    expression,
    availableVariables,
    allowAssignment,
    path,
    instanceId,
  });
};
