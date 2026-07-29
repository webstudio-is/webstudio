import { useId } from "react";
import { useStore } from "@nanostores/react";
import { RadioGroup, Radio, RadioAndLabel } from "@webstudio-is/design-system";
import {
  BindableExpressionControl,
  useBindingState,
} from "~/builder/shared/bindable-expression";
import {
  type ControlProps,
  VerticalLayout,
  Label,
  $selectedInstanceScope,
  humanizeAttribute,
} from "../shared";
import { PropertyLabel } from "../property-label";

export const RadioControl = ({
  meta,
  prop,
  propName,
  computedValue,
  onChange,
}: ControlProps<"radio" | "inline-radio">) => {
  const value = computedValue === undefined ? undefined : String(computedValue);
  // making sure that the current value is in the list of options
  const options =
    value === undefined || meta.options.includes(value)
      ? meta.options
      : [value, ...meta.options];

  const id = useId();
  const label = humanizeAttribute(meta.label || propName);
  const { scope, aliases } = useStore($selectedInstanceScope);
  const expression =
    prop?.type === "expression" ? prop.value : JSON.stringify(computedValue);
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
        value={value}
        bound={prop?.type === "expression"}
        scope={scope}
        aliases={aliases}
        validate={(value) => {
          if (
            value !== undefined &&
            meta.options.includes(String(value)) === false
          ) {
            const formatter = new Intl.ListFormat(undefined, {
              type: "disjunction",
            });
            const options = formatter.format(meta.options);
            return `${label} expects one of ${options}`;
          }
        }}
        onChangeValue={(value) =>
          onChange({ type: "string", value: value ?? "" })
        }
        onChangeExpression={(value) => onChange({ type: "expression", value })}
        onRemove={(value) => onChange({ type: "string", value: String(value) })}
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
