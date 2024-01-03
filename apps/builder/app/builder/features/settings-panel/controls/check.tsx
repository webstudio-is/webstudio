import { useStore } from "@nanostores/react";
import {
  Box,
  Checkbox,
  CheckboxAndLabel,
  useId,
  theme,
} from "@webstudio-is/design-system";
import { humanizeString } from "~/shared/string-utils";
import { BindingPopover } from "~/builder/shared/binding-popover";
import {
  type ControlProps,
  getLabel,
  VerticalLayout,
  Label,
  $selectedInstanceScope,
  updateExpressionValue,
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
  readOnly,
  onChange,
  onDelete,
}: ControlProps<
  "check" | "inline-check" | "multi-select",
  "string[]" | "expression"
>) => {
  const value = Array.isArray(computedValue)
    ? computedValue.map((item) => String(item))
    : [];

  // making sure that the current value is in the list of options
  const options = Array.from(new Set([...meta.options, ...value]));

  const id = useId();
  const { scope, aliases } = useStore($selectedInstanceScope);
  const expression =
    prop?.type === "expression" ? prop.value : JSON.stringify(computedValue);

  return (
    <VerticalLayout
      label={
        <Label
          htmlFor={`${id}:${options[0]}`}
          description={meta.description}
          readOnly={readOnly}
        >
          {getLabel(meta, propName)}
        </Label>
      }
      deletable={deletable}
      onDelete={onDelete}
    >
      <Box css={{ position: "relative", paddingTop: theme.spacing[2] }}>
        {options.map((option) => (
          <CheckboxAndLabel key={option}>
            <Checkbox
              disabled={readOnly}
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
      </Box>
    </VerticalLayout>
  );
};
