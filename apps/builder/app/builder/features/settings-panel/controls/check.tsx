import { useId } from "react";
import { useStore } from "@nanostores/react";
import { Checkbox, CheckboxAndLabel } from "@webstudio-is/design-system";
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

const add = (array: string[], item: string) => {
  if (array.includes(item)) {
    return array;
  }
  return [...array, item];
};

const remove = (array: string[], item: string) => {
  if (array.includes(item) === false) {
    return array;
  }
  return array.filter((arrayItem) => arrayItem !== item);
};

export const CheckControl = ({
  meta,
  prop,
  propName,
  computedValue,
  onChange,
}: ControlProps<"check" | "inline-check" | "multi-select">) => {
  const value = Array.isArray(computedValue)
    ? computedValue.map((item) => String(item))
    : [];

  // making sure that the current value is in the list of options
  const options = Array.from(new Set([...meta.options, ...value]));

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
        onChangeValue={(value) => onChange({ type: "string[]", value })}
        onChangeExpression={(value) => onChange({ type: "expression", value })}
        validate={(value) => {
          const valid =
            Array.isArray(value) &&
            value.every((item) => typeof item === "string");
          if (value !== undefined && valid === false) {
            return `${label} expects an array of strings`;
          }
        }}
        onRemove={(value) =>
          onChange({
            type: "string[]",
            value: Array.isArray(value)
              ? value.map((item) => String(item))
              : [],
          })
        }
        renderControl={({ value, readOnly, onChangeValue }) => (
          <>
            {options.map((option) => (
              <CheckboxAndLabel key={option}>
                <Checkbox
                  disabled={readOnly}
                  checked={value.includes(option)}
                  onCheckedChange={(checked) =>
                    onChangeValue(
                      checked ? add(value, option) : remove(value, option)
                    )
                  }
                  id={`${id}:${option}`}
                />
                <Label htmlFor={`${id}:${option}`}>{option}</Label>
              </CheckboxAndLabel>
            ))}
          </>
        )}
      />
    </VerticalLayout>
  );
};
