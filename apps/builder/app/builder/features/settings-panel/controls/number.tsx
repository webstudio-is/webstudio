import { useId, useState } from "react";
import { InputField } from "@webstudio-is/design-system";
import { useDraftValue } from "~/builder/shared/use-draft-value";
import { BindableExpressionControl } from "~/builder/shared/bindable-expression";
import {
  type ControlProps,
  ResponsiveLayout,
  humanizeAttribute,
} from "../shared";
import { PropertyLabel } from "../property-label";
import { useBindableControl } from "./use-bindable-control";

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
      if (prop?.type === "expression") {
        return;
      }
      if (typeof value === "number") {
        onChange({ type: "number", value });
      }
      if (value === "") {
        setIsInvalid(true);
      }
    }
  );

  const label = humanizeAttribute(meta.label || propName);
  const binding = useBindableControl({
    boundExpression: prop?.type === "expression" ? prop.value : undefined,
    fallbackExpression: JSON.stringify(computedValue),
  });

  return (
    <ResponsiveLayout
      label={
        <PropertyLabel
          name={propName}
          readOnly={binding.bindingState.overwritable === false}
        />
      }
    >
      <BindableExpressionControl
        {...binding}
        value={localValue.value}
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
