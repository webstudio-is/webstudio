import { useState } from "react";
import { useStore } from "@nanostores/react";
import { isLiteralExpression } from "@webstudio-is/expression";
import { useDraftValue } from "~/builder/shared/use-draft-value";
import {
  BindableExpressionControl,
  updateExpressionValue,
  useBindingState,
} from "~/builder/shared/bindable-expression";
import {
  type ControlProps,
  VerticalLayout,
  $selectedInstanceScope,
} from "../shared";
import {
  ExpressionEditor,
  formatValue,
} from "~/builder/shared/expression-editor";
import { PropertyLabel } from "../property-label";

export const JsonControl = ({
  prop,
  propName,
  computedValue,
  onChange,
}: ControlProps<"json">) => {
  const [error, setError] = useState<boolean>(false);
  const valueString = formatValue(computedValue ?? "");
  const localValue = useDraftValue(valueString, (value) => {
    const isLiteral = isLiteralExpression(value);
    setError(isLiteral ? false : true);
    // prevent executing expressions which depends on global variables
    if (isLiteral === false) {
      return;
    }
    try {
      // wrap into parens to treat object expression as value instead of block
      const parsedValue = eval(`(${value})`);
      if (prop?.type === "expression") {
        updateExpressionValue(prop.value, parsedValue);
      } else {
        onChange({ type: "json", value: parsedValue });
      }
    } catch {
      // empty block
    }
  });

  const { scope, aliases } = useStore($selectedInstanceScope);
  const expression = prop?.type === "expression" ? prop.value : valueString;
  const { overwritable } = useBindingState(
    prop?.type === "expression" ? prop.value : undefined
  );

  return (
    <VerticalLayout
      label={
        <PropertyLabel name={propName} readOnly={overwritable === false} />
      }
    >
      <BindableExpressionControl
        expression={expression}
        value={computedValue}
        bound={prop?.type === "expression"}
        scope={scope}
        aliases={aliases}
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
