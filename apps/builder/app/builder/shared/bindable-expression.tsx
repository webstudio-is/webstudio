import type { ReactNode } from "react";
import {
  BindingControl,
  BindingPopover,
  type BindingVariant,
} from "./binding-popover";

export type BindingState = {
  overwritable: boolean;
  variant: BindingVariant;
};

export const useBindingState = (expression: string | undefined) => {
  return expression === undefined
    ? ({ overwritable: true, variant: "default" } satisfies BindingState)
    : ({ overwritable: false, variant: "bound" } satisfies BindingState);
};

export const BindableExpressionControl = <Value,>({
  expression,
  value,
  bound,
  scope,
  aliases,
  validate,
  showBinding = true,
  renderControl,
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
  renderControl: (props: {
    value: Value;
    readOnly: boolean;
    onChangeValue: (value: Value) => void;
  }) => ReactNode;
  onChangeValue: (value: Value) => void;
  onChangeExpression: (expression: string) => void;
  onRemove?: (evaluatedValue: unknown) => void;
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
        renderControl={renderControl}
        onChangeValue={onChangeValue}
        onChangeExpression={onChangeExpression}
        onRemove={onRemove}
      />
    );
  }

  const { overwritable, variant } = bindingState;
  return (
    <BindingControl>
      {renderControl({
        value,
        readOnly: overwritable === false,
        onChangeValue,
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
