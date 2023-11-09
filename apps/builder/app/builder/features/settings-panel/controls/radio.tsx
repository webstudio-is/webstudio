import {
  Box,
  RadioGroup,
  Radio,
  RadioAndLabel,
  useId,
  theme,
} from "@webstudio-is/design-system";
import { humanizeString } from "~/shared/string-utils";
import { type ControlProps, getLabel, VerticalLayout, Label } from "../shared";
import { VariablesButton } from "../variables";

export const RadioControl = ({
  meta,
  prop,
  propName,
  deletable,
  onChange,
  onDelete,
}: ControlProps<"radio" | "inline-radio", "string">) => {
  // making sure that the current value is in the list of options
  const options =
    prop === undefined || meta.options.includes(prop.value)
      ? meta.options
      : [prop.value, ...meta.options];

  const id = useId();

  return (
    <VerticalLayout
      label={
        <Box css={{ position: "relative" }}>
          <Label htmlFor={id} description={meta.description}>
            {getLabel(meta, propName)}
          </Label>
          <VariablesButton
            propId={prop?.id}
            propName={propName}
            propMeta={meta}
          />
        </Box>
      }
      deletable={deletable}
      onDelete={onDelete}
    >
      <Box css={{ paddingTop: theme.spacing[2] }}>
        <RadioGroup
          name="value"
          value={prop?.value}
          onValueChange={(value) => onChange({ type: "string", value })}
        >
          {options.map((value) => (
            <RadioAndLabel key={value}>
              <Radio value={value} id={`${id}:${value}`} />
              <Label htmlFor={`${id}:${value}`}>{humanizeString(value)}</Label>
            </RadioAndLabel>
          ))}
        </RadioGroup>
      </Box>
    </VerticalLayout>
  );
};
