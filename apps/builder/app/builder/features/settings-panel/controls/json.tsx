import { useState } from "react";
import { useStore } from "@nanostores/react";
import { isLiteralExpression } from "@webstudio-is/sdk";
import {
  type ControlProps,
  useLocalValue,
  VerticalLayout,
  updateExpressionValue,
  $selectedInstanceScope,
  useBindingState,
} from "../shared";
import {
  ExpressionEditor,
  formatValue,
} from "~/builder/shared/expression-editor";
import {
  BindingControl,
  BindingPopover,
} from "~/builder/shared/binding-popover";
import { PropertyLabel } from "../property-label";

export const JsonControl = ({
  prop,
  propName,
  computedValue,
  onChange,
}: ControlProps<"json">) => {
  const [error, setError] = useState<boolean>(false);
  const valueString = formatValue(computedValue ?? "");
  const localValue = useLocalValue(valueString, (value) => {
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
  const { overwritable, variant } = useBindingState(
    prop?.type === "expression" ? prop.value : undefined
  );

  return (
    <VerticalLayout
      label={
        <PropertyLabel name={propName} readOnly={overwritable === false} />
      }
    >
      <BindingControl>
        <ExpressionEditor
          color={error ? "error" : undefined}
          readOnly={overwritable === false}
          value={localValue.value}
          onChange={localValue.set}
          onChangeComplete={localValue.save}
        />
        <BindingPopover
          scope={scope}
          aliases={aliases}
          variant={variant}
          value={expression}
          onChange={(newExpression) =>
            onChange({ type: "expression", value: newExpression })
          }
          onRemove={(evaluatedValue) =>
            onChange({ type: "json", value: evaluatedValue })
          }
        />
      </BindingControl>
    </VerticalLayout>
  );
};
