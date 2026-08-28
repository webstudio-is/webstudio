import { useState } from "react";
import { isLiteralExpression } from "@webstudio-is/expression";
import { useDraftValue } from "~/builder/shared/use-draft-value";
import { BindableExpressionControl } from "~/builder/shared/bindable-expression";
import { type ControlProps, VerticalLayout } from "../shared";
import {
  ExpressionEditor,
  formatValue,
} from "~/builder/shared/expression-editor";
import { PropertyLabel } from "../property-label";
import { useBindableControl } from "./use-bindable-control";

export const JsonControl = ({
  prop,
  propName,
  computedValue,
  onChange,
}: ControlProps<"json">) => {
  const [error, setError] = useState<boolean>(false);
  const valueString = formatValue(computedValue ?? "");
  const binding = useBindableControl({
    boundExpression: prop?.type === "expression" ? prop.value : undefined,
    fallbackExpression: valueString,
  });
  const localValue = useDraftValue(valueString, (value) => {
    if (binding.bindingState.overwritable === false) {
      return;
    }
    const isLiteral = isLiteralExpression(value);
    setError(isLiteral ? false : true);
    // prevent executing expressions which depends on global variables
    if (isLiteral === false) {
      return;
    }
    try {
      // wrap into parens to treat object expression as value instead of block
      const parsedValue = eval(`(${value})`);
      onChange({ type: "json", value: parsedValue });
    } catch {
      // empty block
    }
  });

  return (
    <VerticalLayout
      label={
        <PropertyLabel
          name={propName}
          readOnly={binding.bindingState.overwritable === false}
        />
      }
    >
      <BindableExpressionControl
        {...binding}
        value={computedValue}
        onChangeValue={(value) => onChange({ type: "json", value })}
        onChangeExpression={(value) => onChange({ type: "expression", value })}
        onRemove={(value) => onChange({ type: "json", value })}
        renderControl={({ readOnly }) => (
          <ExpressionEditor
            color={error ? "error" : undefined}
            readOnly={readOnly}
            value={localValue.value}
            onChange={localValue.set}
            onChangeComplete={localValue.save}
          />
        )}
      />
    </VerticalLayout>
  );
};
