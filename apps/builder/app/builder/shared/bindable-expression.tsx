import { useMemo, type ReactNode } from "react";
import { useStore } from "@nanostores/react";
import { atom, computed, type ReadableAtom } from "nanostores";
import { decodeDataSourceVariable } from "@webstudio-is/sdk";
import { $dataSourceVariables } from "~/shared/nano-states";
import { $dataSources } from "~/shared/sync/data-stores";
import {
  BindingControl,
  BindingPopover,
  type BindingVariant,
} from "./binding-popover";

export type BindingState = {
  overwritable: boolean;
  variant: BindingVariant;
};

const updateExpressionValue = (expression: string, value: unknown) => {
  const potentialVariableId = decodeDataSourceVariable(expression);
  if (
    potentialVariableId === undefined ||
    $dataSources.get().has(potentialVariableId) === false
  ) {
    return;
  }
  const dataSourceVariables = new Map($dataSourceVariables.get());
  dataSourceVariables.set(potentialVariableId, value);
  $dataSourceVariables.set(dataSourceVariables);
};

export const updateBindableValue = <Value,>({
  expression,
  value,
  expressionValue = value,
  onChangeValue,
}: {
  expression: string | undefined;
  value: Value;
  expressionValue?: unknown;
  onChangeValue: (value: Value) => void;
}) => {
  if (expression !== undefined) {
    updateExpressionValue(expression, expressionValue);
    return;
  }
  onChangeValue(value);
};

export const useBindingState = (expression: string | undefined) => {
  const $bindingState = useMemo((): ReadableAtom<BindingState> => {
    if (expression === undefined) {
      return atom({ overwritable: true, variant: "default" });
    }
    const potentialVariableId = decodeDataSourceVariable(expression);
    if (potentialVariableId === undefined) {
      return atom({ overwritable: false, variant: "bound" });
    }
    return computed(
      [$dataSources, $dataSourceVariables],
      (dataSources, dataSourceVariables): BindingState => {
        const dataSource = dataSources.get(potentialVariableId);
        if (dataSource?.type !== "variable") {
          return { overwritable: false, variant: "bound" };
        }
        return {
          overwritable: true,
          variant:
            dataSourceVariables.get(potentialVariableId) === undefined
              ? "bound"
              : "overwritten",
        };
      }
    );
  }, [expression]);
  return useStore($bindingState);
};

export const BindableExpressionControl = <Value,>({
  expression,
  value,
  bound,
  scope,
  aliases,
  validate,
  showBinding = true,
  allowBindingOverwrite = true,
  renderControl,
  parseValue = (value) => value,
  onChangeValue,
  onChangeExpression,
  onRemove,
  bindingState,
}: {
  expression: string;
  value: Value;
  bound: boolean;
  scope: Record<string, unknown>;
  aliases: Map<string, string>;
  validate?: (value: unknown) => string | undefined;
  showBinding?: boolean;
  allowBindingOverwrite?: boolean;
  renderControl: (props: {
    value: Value;
    readOnly: boolean;
    onChangeValue: (value: Value) => void;
  }) => ReactNode;
  parseValue?: (value: Value) => unknown;
  onChangeValue: (value: Value) => void;
  onChangeExpression: (expression: string) => void;
  onRemove: (evaluatedValue: unknown) => void;
  bindingState?: BindingState;
}) => {
  if (bindingState === undefined) {
    return (
      <BindableExpressionControlWithState
        expression={expression}
        value={value}
        bound={bound}
        scope={scope}
        aliases={aliases}
        validate={validate}
        showBinding={showBinding}
        allowBindingOverwrite={allowBindingOverwrite}
        renderControl={renderControl}
        parseValue={parseValue}
        onChangeValue={onChangeValue}
        onChangeExpression={onChangeExpression}
        onRemove={onRemove}
      />
    );
  }

  const { overwritable, variant } = bindingState;
  const readOnly =
    overwritable === false || (bound && allowBindingOverwrite === false);
  return (
    <BindingControl>
      {renderControl({
        value,
        readOnly,
        onChangeValue: (nextValue) => {
          updateBindableValue({
            expression: bound ? expression : undefined,
            value: nextValue,
            expressionValue: bound ? parseValue(nextValue) : nextValue,
            onChangeValue,
          });
        },
      })}
      {showBinding && (
        <BindingPopover
          scope={scope}
          aliases={aliases}
          validate={validate}
          variant={variant}
          value={expression}
          onChange={onChangeExpression}
          onRemove={onRemove}
        />
      )}
    </BindingControl>
  );
};

const BindableExpressionControlWithState = <Value,>(
  props: Omit<
    Parameters<typeof BindableExpressionControl<Value>>[0],
    "bindingState"
  >
) => {
  const bindingState = useBindingState(
    props.bound ? props.expression : undefined
  );
  return <BindableExpressionControl {...props} bindingState={bindingState} />;
};
