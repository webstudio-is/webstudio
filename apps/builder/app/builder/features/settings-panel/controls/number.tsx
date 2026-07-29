import { useId, useState } from "react";
import { useStore } from "@nanostores/react";
import { InputField } from "@webstudio-is/design-system";
import { useDraftValue } from "~/builder/shared/use-draft-value";
import {
  BindableExpressionControl,
  updateExpressionValue,
  useBindingState,
} from "~/builder/shared/bindable-expression";
import {
  type ControlProps,
  ResponsiveLayout,
  $selectedInstanceScope,
  humanizeAttribute,
} from "../shared";
import { PropertyLabel } from "../property-label";

export const NumberControl = ({
  meta,
  prop,
  propName,
  computedValue,
  onChange,
}: ControlProps<"number">) => {
  const id = useId();

  const [isInvalid, setIsInvalid] = useState(false);
  const number = Number(computedValue);
  const localValue = useDraftValue(
    Number.isNaN(number) ? "" : number,
    (value) => {
      if (typeof value === "number") {
        if (prop?.type === "expression") {
          updateExpressionValue(prop.value, value);
        } else {
          onChange({ type: "number", value });
        }
      }
      if (value === "") {
        setIsInvalid(true);
      }
    }
  );

  const label = humanizeAttribute(meta.label || propName);
  const { scope, aliases } = useStore($selectedInstanceScope);
  const expression =
    prop?.type === "expression" ? prop.value : JSON.stringify(computedValue);
  const { overwritable } = useBindingState(
    prop?.type === "expression" ? prop.value : undefined
  );

  return (
    <ResponsiveLayout
      label={
        <PropertyLabel name={propName} readOnly={overwritable === false} />
      }
    >
      <BindableExpressionControl
        expression={expression}
        value={localValue.value}
        bound={prop?.type === "expression"}
        scope={scope}
        aliases={aliases}
        validate={(value) => {
          if (value !== undefined && typeof value !== "number") {
            return `${label} expects a number value`;
          }
        }}
        onChangeValue={(value) => {
          if (typeof value === "number") {
            onChange({ type: "number", value });
          }
        }}
        onChangeExpression={(value) => onChange({ type: "expression", value })}
        onRemove={(value) => {
          const number = Number(value);
          onChange({
            type: "number",
            value: Number.isNaN(number) ? 0 : number,
          });
        }}
        renderControl={({ readOnly }) => (
          <InputField
            id={id}
            disabled={readOnly}
            type="number"
            value={localValue.value}
            color={isInvalid ? "error" : undefined}
            onChange={({ target: { valueAsNumber, value } }) => {
              localValue.set(
                Number.isNaN(valueAsNumber) ? value : valueAsNumber
              );
              setIsInvalid(false);
            }}
            onBlur={localValue.save}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                localValue.save();
              }
            }}
          />
        )}
      />
    </ResponsiveLayout>
  );
};
