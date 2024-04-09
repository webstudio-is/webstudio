import { useStore } from "@nanostores/react";
import { Checkbox, CheckboxAndLabel, useId } from "@webstudio-is/design-system";
import { humanizeString } from "~/shared/string-utils";
import {
  BindingControl,
  BindingPopover,
} from "~/builder/shared/binding-popover";
import {
  type ControlProps,
  VerticalLayout,
  Label,
  $selectedInstanceScope,
  updateExpressionValue,
  useBindingState,
} from "../shared";

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
  deletable,
  onChange,
  onDelete,
}: ControlProps<"check" | "inline-check" | "multi-select">) => {
  const value = Array.isArray(computedValue)
    ? computedValue.map((item) => String(item))
    : [];

  // making sure that the current value is in the list of options
  const options = Array.from(new Set([...meta.options, ...value]));

  const id = useId();
  const label = humanizeString(meta.label || propName);
  const { scope, aliases } = useStore($selectedInstanceScope);
  const expression =
    prop?.type === "expression" ? prop.value : JSON.stringify(computedValue);
  const { overwritable, variant } = useBindingState(
    prop?.type === "expression" ? prop.value : undefined
  );

  return (
    <VerticalLayout
      label={
        <Label
          htmlFor={`${id}:${options[0]}`}
          description={meta.description}
          readOnly={overwritable === false}
        >
          {label}
        </Label>
      }
      deletable={deletable}
      onDelete={onDelete}
    >
      <BindingControl>
        {options.map((option) => (
          <CheckboxAndLabel key={option}>
            <Checkbox
              disabled={overwritable === false}
              checked={value.includes(option)}
              onCheckedChange={(checked) => {
                const newValue = checked
                  ? add(value, option)
                  : remove(value, option);
                if (prop?.type === "expression") {
                  updateExpressionValue(prop.value, newValue);
                } else {
                  onChange({ type: "string[]", value: newValue });
                }
              }}
              id={`${id}:${option}`}
            />
            <Label htmlFor={`${id}:${option}`}>{humanizeString(option)}</Label>
          </CheckboxAndLabel>
        ))}
        <BindingPopover
          scope={scope}
          aliases={aliases}
          validate={(value) => {
            const valid =
              Array.isArray(value) &&
              value.every((item) => typeof item === "string");
            if (value !== undefined && valid === false) {
              return `${label} expects an array of strings`;
            }
          }}
          variant={variant}
          value={expression}
          onChange={(newExpression) =>
            onChange({ type: "expression", value: newExpression })
          }
          onRemove={(evaluatedValue) =>
            onChange({
              type: "string[]",
              value: Array.isArray(evaluatedValue)
                ? evaluatedValue.map((item) => String(item))
                : [],
            })
          }
        />
      </BindingControl>
    </VerticalLayout>
  );
};
