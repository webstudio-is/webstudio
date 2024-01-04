import { useId } from "react";
import { useStore } from "@nanostores/react";
import {
  Box,
  RadioGroup,
  Radio,
  RadioAndLabel,
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

export const RadioControl = ({
  meta,
  prop,
  propName,
  computedValue,
  deletable,
  readOnly,
  onChange,
  onDelete,
}: ControlProps<"radio" | "inline-radio", "string" | "expression">) => {
  const value = computedValue === undefined ? undefined : String(computedValue);
  // making sure that the current value is in the list of options
  const options =
    value === undefined || meta.options.includes(value)
      ? meta.options
      : [value, ...meta.options];

  const id = useId();
  const { scope, aliases } = useStore($selectedInstanceScope);
  const expression =
    prop?.type === "expression" ? prop.value : JSON.stringify(computedValue);

  return (
    <VerticalLayout
      label={
        <Label htmlFor={id} description={meta.description} readOnly={readOnly}>
          {getLabel(meta, propName)}
        </Label>
      }
      deletable={deletable}
      onDelete={onDelete}
    >
      <Box css={{ position: "relative", paddingTop: theme.spacing[2] }}>
        <RadioGroup
          disabled={readOnly}
          name="value"
          value={value}
          onValueChange={(value) => {
            if (prop?.type === "expression") {
              updateExpressionValue(prop.value, value);
            } else {
              onChange({ type: "string", value });
            }
          }}
        >
          {options.map((value) => (
            <RadioAndLabel key={value}>
              <Radio value={value} id={`${id}:${value}`} />
              <Label htmlFor={`${id}:${value}`}>{humanizeString(value)}</Label>
            </RadioAndLabel>
          ))}
        </RadioGroup>
        <BindingPopover
          scope={scope}
          aliases={aliases}
          value={expression}
          onChange={(newExpression) =>
            onChange({ type: "expression", value: newExpression })
          }
          onRemove={(evaluatedValue) =>
            onChange({ type: "string", value: String(evaluatedValue) })
          }
        />
      </Box>
    </VerticalLayout>
  );
};
