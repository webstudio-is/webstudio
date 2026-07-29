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

type BindingState = {
  overwritable: boolean;
  variant: BindingVariant;
};

export const updateExpressionValue = (expression: string, value: unknown) => {
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
}) => {
  const { overwritable, variant } = useBindingState(
    bound ? expression : undefined
  );
  const readOnly =
    overwritable === false || (bound && allowBindingOverwrite === false);
  return (
    <BindingControl>
      {renderControl({
        value,
        readOnly,
        onChangeValue: (nextValue) => {
          if (bound) {
            updateExpressionValue(expression, parseValue(nextValue));
          } else {
            onChangeValue(nextValue);
          }
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
