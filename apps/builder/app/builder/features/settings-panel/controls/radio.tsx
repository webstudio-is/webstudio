import { useId } from "react";
import { RadioGroup, Radio, RadioAndLabel } from "@webstudio-is/design-system";
import { BindableExpressionControl } from "~/builder/shared/bindable-expression";
import { type ControlProps, VerticalLayout, Label } from "../shared";
import { PropertyLabel } from "../property-label";
import { useStringOptions } from "./use-string-options";

export const RadioControl = ({
  meta,
  prop,
  propName,
  computedValue,
  onChange,
}: ControlProps<"radio" | "inline-radio">) => {
  const id = useId();
  const { options, overwritable, binding } = useStringOptions({
    meta,
    prop,
    propName,
    computedValue,
    onChange,
  });

  return (
    <VerticalLayout
      label={
        <PropertyLabel name={propName} readOnly={overwritable === false} />
      }
    >
      <BindableExpressionControl
        {...binding}
        renderControl={({ value, readOnly, onChangeValue }) => (
          <RadioGroup
            disabled={readOnly}
            name="value"
            value={value}
            onValueChange={onChangeValue}
          >
            {options.map((value) => (
              <RadioAndLabel key={value}>
                <Radio value={value} id={`${id}:${value}`} />
                <Label htmlFor={`${id}:${value}`}>{value}</Label>
              </RadioAndLabel>
            ))}
          </RadioGroup>
        )}
      />
    </VerticalLayout>
  );
};
