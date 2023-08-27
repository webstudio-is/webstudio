import {
  Box,
  Checkbox,
  CheckboxAndLabel,
  useId,
  theme,
} from "@webstudio-is/design-system";
import { humanizeString } from "~/shared/string-utils";
import { type ControlProps, getLabel, VerticalLayout, Label } from "../shared";

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
  onChange,
  onDelete,
}: ControlProps<"check" | "inline-check" | "multi-select", "string[]">) => {
  const value = prop?.value ?? [];

  // making sure that the current value is in the list of options
  const options = value.reduce(
    (result, item) => (result.includes(item) ? result : [item, ...result]),
    meta.options
  );

  const id = useId();

  return (
    <VerticalLayout
      label={
        <Label htmlFor={`${id}:${options[0]}`} description={meta.description}>
          {getLabel(meta, propName)}
        </Label>
      }
      onDelete={onDelete}
    >
      <Box css={{ paddingTop: theme.spacing[2] }}>
        {options.map((option) => (
          <CheckboxAndLabel key={option}>
            <Checkbox
              checked={value.includes(option)}
              onCheckedChange={(checked) => {
                onChange({
                  type: "string[]",
                  value: checked ? add(value, option) : remove(value, option),
                });
              }}
              id={`${id}:${option}`}
            />
            <Label htmlFor={`${id}:${option}`}>{humanizeString(option)}</Label>
          </CheckboxAndLabel>
        ))}
      </Box>
    </VerticalLayout>
  );
};
