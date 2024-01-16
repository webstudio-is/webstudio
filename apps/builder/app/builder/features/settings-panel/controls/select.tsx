import { useId } from "react";
import { useStore } from "@nanostores/react";
import { Select } from "@webstudio-is/design-system";
import { humanizeString } from "~/shared/string-utils";
import {
  BindingControl,
  BindingPopover,
} from "~/builder/shared/binding-popover";
import {
  type ControlProps,
  getLabel,
  VerticalLayout,
  Label,
  $selectedInstanceScope,
  updateExpressionValue,
  useBindingState,
} from "../shared";

export const SelectControl = ({
  meta,
  prop,
  propName,
  computedValue,
  deletable,
  onChange,
  onDelete,
}: ControlProps<"select">) => {
  const id = useId();

  const value = computedValue === undefined ? undefined : String(computedValue);
  // making sure that the current value is in the list of options
  const options =
    value === undefined || value.length === 0 || meta.options.includes(value)
      ? meta.options
      : [value, ...meta.options];

  const label = getLabel(meta, propName);
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
          htmlFor={id}
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
        <Select
          fullWidth
          id={id}
          disabled={overwritable === false}
          value={value}
          options={options}
          getLabel={humanizeString}
          onChange={(value) => {
            if (prop?.type === "expression") {
              updateExpressionValue(prop.value, value);
            } else {
              onChange({ type: "string", value });
            }
          }}
        />
        <BindingPopover
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
          variant={variant}
          value={expression}
          onChange={(newExpression) =>
            onChange({ type: "expression", value: newExpression })
          }
          onRemove={(evaluatedValue) =>
            onChange({ type: "string", value: String(evaluatedValue) })
          }
        />
      </BindingControl>
    </VerticalLayout>
  );
};
